/**
 * @module InterviewService
 * @description Core orchestrator implementing the interview state machine.
 *
 * State Machine:
 *   ASKING → LISTENING → EVALUATING
 *     → if score ≥ threshold → NEXT_QUESTION
 *     → if score < threshold && !followUpAsked → FOLLOW_UP
 *     → if score < coachingThreshold after follow-up → COACHING → NEXT_QUESTION
 *   NEXT_QUESTION → ASKING (loop) | END (all questions done)
 *
 * The application state (InterviewState) is the source of truth.
 * The LLM is never relied upon to remember state.
 */

import { v4 as uuidv4 } from 'uuid';
import { createInterviewState, InterviewPhase } from '../models/InterviewState.js';
import RetrievalService from './RetrievalService.js';
import PromptService from './PromptService.js';
import LLMService from './LLMService.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';

/** Maximum consecutive non-answers before auto-advancing to prevent infinite loops */
const MAX_NON_ANSWERS = 3;

/** Patterns that indicate a non-answer (case-insensitive, tested as full match) */
const NON_ANSWER_PATTERNS = [
  /^i\s*don'?t\s*know\.?$/i,
  /^(i\s*have\s*)?no\s*idea\.?$/i,
  /^pass\.?$/i,
  /^skip\.?$/i,
  /^next(\s*question)?\.?$/i,
  /^(i'?m\s*)?not\s*sure\.?$/i,
  /^no\s*comment\.?$/i,
  /^(um+|uh+|hmm+|ah+|eh+)\.?$/i,
  /^(ok|okay)\.?$/i,
  /^(yes|no|yeah|nah|nope)\.?$/i,
  /^can'?t\s*(answer|say|tell)\.?$/i,
];

/** @type {Map<string, Object>} In-memory session store */
const sessions = new Map();

class InterviewService {
  /**
   * Starts a new interview session.
   *
   * @param {string} language — 'en' | 'hi' | 'de'
   * @returns {{ interviewId: string, question: string, questionNumber: number, totalQuestions: number }}
   */
  startInterview(language = 'en') {
    const interviewId = uuidv4();
    const totalQuestions = RetrievalService.getTotalQuestions();

    const state = createInterviewState({ interviewId, language, totalQuestions });

    // Set the first question
    const firstQuestion = RetrievalService.getQuestionByIndex(0);
    state.currentQuestionId = firstQuestion.id;
    state.currentQuestionIndex = 0;
    state.phase = InterviewPhase.ASKING;

    const questionText = firstQuestion.question[language];

    // Record in history
    state.history.push({ role: 'interviewer', content: questionText });

    sessions.set(interviewId, state);
    logger.info(`[Interview] Started session ${interviewId}, lang=${language}, total=${totalQuestions}`);

    return {
      interviewId,
      question: questionText,
      questionNumber: 1,
      totalQuestions,
    };
  }

  /**
   * Processes a candidate's spoken response through the evaluation pipeline.
   *
   * @param {string} interviewId
   * @param {string} transcript — STT output
   * @returns {Promise<Object>} Evaluation result with reply, score, and state info
   */
  async processResponse(interviewId, transcript) {
    const state = this._getSession(interviewId);

    if (state.completed) {
      const err = new Error('This interview has already been completed');
      err.statusCode = 400;
      throw err;
    }

    const currentQuestion = RetrievalService.getQuestion(state.currentQuestionId);

    // ── Non-answer detection (runs BEFORE LLM call to save cost) ──
    if (this._isNonAnswer(transcript)) {
      state.nonAnswerCount += 1;
      logger.info(`[Interview] ${interviewId} — Non-answer #${state.nonAnswerCount} on ${state.currentQuestionId}: "${transcript}"`);

      if (state.nonAnswerCount >= MAX_NON_ANSWERS) {
        // 3rd strike: record zero score and force-advance
        state.history.push({ role: 'candidate', content: transcript });
        state.answers.push({
          questionId: state.currentQuestionId,
          topic: currentQuestion.topic,
          transcript: `[Non-answer x${state.nonAnswerCount}] ${transcript}`,
          score: 0,
          evaluation: 'Poor',
          coaching: 'The candidate did not provide an answer to this question.',
        });

        const nextIndex = state.currentQuestionIndex + 1;
        const nextQuestionText = RetrievalService.getQuestionByIndex(nextIndex)?.question?.[state.language] || '';
        const result = this._advanceQuestion(state, '', nextQuestionText);

        return {
          transcript,
          reply: `I understand this might be a tough question. Let's move on. ${result.reply}`,
          score: 0,
          evaluation: 'Poor',
          followUp: false,
          coaching: '',
          reasoning: 'Candidate did not answer after multiple attempts.',
          questionNumber: state.currentQuestionIndex + 1,
          totalQuestions: state.totalQuestions,
          isComplete: result.isComplete,
          isNonAnswer: true,
        };
      }

      // Re-prompt without advancing
      const questionText = currentQuestion.question[state.language];
      let reprompt;
      if (state.nonAnswerCount === 1) {
        reprompt = `I didn't catch a complete answer. Could you try answering the question? Take your time. The question was: ${questionText}`;
      } else {
        reprompt = `It seems like you're having trouble with this question. Let me repeat it one more time — if you'd like to skip, just say "skip". Here's the question: ${questionText}`;
      }

      state.history.push({ role: 'interviewer', content: reprompt });

      return {
        transcript,
        reply: reprompt,
        score: null,
        evaluation: null,
        followUp: false,
        coaching: '',
        reasoning: 'Non-answer detected — re-prompting candidate.',
        questionNumber: state.currentQuestionIndex + 1,
        totalQuestions: state.totalQuestions,
        isComplete: false,
        isNonAnswer: true,
      };
    }

    // ── Normal answer — proceed through evaluation pipeline ──
    state.nonAnswerCount = 0; // Reset on any substantive answer

    // Record candidate's answer in history
    state.history.push({ role: 'candidate', content: transcript });
    state.phase = InterviewPhase.EVALUATING;
    const isFollowUp = state.followUpAsked;

    // Determine if there's a next question to transition to
    const nextIndex = state.currentQuestionIndex + 1;
    const nextQuestion = RetrievalService.getQuestionByIndex(nextIndex);
    const nextQuestionText = nextQuestion?.question?.[state.language] || '';

    // Build prompts
    const systemPrompt = PromptService.buildSystemPrompt(state.language);
    const userPrompt = PromptService.buildEvaluationPrompt({
      question: currentQuestion,
      transcript,
      history: state.history,
      language: state.language,
      isFollowUp,
      nextQuestionText: '', // Never reveal the next question to the LLM — state machine handles transitions
    });

    // Call LLM
    const llmResult = await LLMService.evaluate(systemPrompt, userPrompt);

    // --- State Machine Logic ---
    const score = Math.min(10, Math.max(0, Number(llmResult.score) || 0));
    const evaluation = llmResult.evaluation || 'Average';

    let interviewerReply = llmResult.interviewerReply || '';
    let followUp = false;
    let isComplete = false;

    if (!isFollowUp && score < config.interview.followUpThreshold && llmResult.followUpNeeded) {
      // ── FOLLOW-UP path ──
      state.phase = InterviewPhase.FOLLOW_UP;
      state.followUpAsked = true;
      followUp = true;

      // Use the dataset's follow-up probe (grounded, not LLM-generated)
      const followUpText = currentQuestion.follow_up_probe[state.language];
      interviewerReply = llmResult.interviewerReply || followUpText;

      state.history.push({ role: 'interviewer', content: interviewerReply });

      logger.info(`[Interview] ${interviewId} — Follow-up on ${state.currentQuestionId} (score=${score})`);

    } else if (isFollowUp && score < config.interview.coachingThreshold) {
      // ── COACHING path ──
      state.phase = InterviewPhase.COACHING;
      const coaching = llmResult.coaching || currentQuestion.coaching_note;

      // Record this answer
      state.answers.push({
        questionId: state.currentQuestionId,
        topic: currentQuestion.topic,
        transcript,
        score,
        evaluation,
        coaching,
      });

      // Advance to next question or end
      const result = this._advanceQuestion(state, coaching, nextQuestionText);
      interviewerReply = result.reply;
      isComplete = result.isComplete;

      logger.info(`[Interview] ${interviewId} — Coaching on ${state.currentQuestionId} (score=${score})`);

    } else {
      // ── NEXT QUESTION path (strong answer or post-follow-up acceptable) ──
      state.answers.push({
        questionId: state.currentQuestionId,
        topic: currentQuestion.topic,
        transcript,
        score,
        evaluation,
        coaching: llmResult.coaching || '',
      });

      const result = this._advanceQuestion(state, '', nextQuestionText);
      // Use the state machine's reply (contains the next question).
      // The LLM reply is discarded — it may have hallucinated a question.
      interviewerReply = result.reply;
      isComplete = result.isComplete;

      logger.info(`[Interview] ${interviewId} — Moving on from ${state.currentQuestionId} (score=${score})`);
    }

    return {
      transcript,
      reply: interviewerReply,
      score,
      evaluation,
      followUp,
      coaching: llmResult.coaching || '',
      reasoning: llmResult.reasoning || '',
      questionNumber: state.currentQuestionIndex + 1,
      totalQuestions: state.totalQuestions,
      isComplete,
    };
  }

  /**
   * Advances to the next question or ends the interview.
   *
   * @param {Object} state — Mutable interview state
   * @param {string} coachingPrefix — Coaching text to prepend to reply
   * @param {string} nextQuestionText — Text of next question
   * @returns {{ reply: string, isComplete: boolean }}
   */
  _advanceQuestion(state, coachingPrefix, nextQuestionText) {
    const nextIndex = state.currentQuestionIndex + 1;

    if (nextIndex >= state.totalQuestions) {
      // ── END ──
      state.phase = InterviewPhase.END;
      state.completed = true;

      const endReply = coachingPrefix
        ? `${coachingPrefix} That concludes our interview. Thank you for your time!`
        : 'That concludes our interview. Thank you for your time! I\'ll prepare your feedback report now.';

      state.history.push({ role: 'interviewer', content: endReply });
      return { reply: endReply, isComplete: true };
    }

    // ── NEXT QUESTION ──
    const nextQuestion = RetrievalService.getQuestionByIndex(nextIndex);
    state.currentQuestionIndex = nextIndex;
    state.currentQuestionId = nextQuestion.id;
    state.followUpAsked = false;
    state.nonAnswerCount = 0; // Reset non-answer counter for new question
    state.phase = InterviewPhase.ASKING;

    const questionText = nextQuestion.question[state.language];
    const reply = coachingPrefix
      ? `${coachingPrefix} Let's move on. ${questionText}`
      : `${questionText}`;

    state.history.push({ role: 'interviewer', content: reply });
    return { reply, isComplete: false };
  }

  /**
   * Retrieves and validates a session from the in-memory store.
   *
   * @param {string} interviewId
   * @returns {Object} InterviewState
   * @throws {Error} If session not found
   */
  _getSession(interviewId) {
    const state = sessions.get(interviewId);
    if (!state) {
      const err = new Error(`Interview session "${interviewId}" not found`);
      err.statusCode = 404;
      throw err;
    }
    return state;
  }

  /**
   * Returns the interview state (for feedback generation).
   * @param {string} interviewId
   * @returns {Object}
   */
  getInterviewState(interviewId) {
    return this._getSession(interviewId);
  }

  /**
   * Marks an interview as completed.
   * @param {string} interviewId
   */
  completeInterview(interviewId) {
    const state = this._getSession(interviewId);
    state.completed = true;
    state.phase = InterviewPhase.END;
  }

  /**
   * Detects whether a transcript represents a non-answer.
   * Non-answers include: empty/whitespace, very short responses (< 3 words),
   * explicit opt-outs ("I don't know", "pass", "skip"), and filler-only ("um", "uh").
   *
   * @param {string} transcript
   * @returns {boolean}
   */
  _isNonAnswer(transcript) {
    if (!transcript) return true;

    const trimmed = transcript.trim();
    if (trimmed.length === 0) return true;

    // Very short: fewer than 3 words or fewer than 10 characters
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length < 3 && trimmed.length < 15) {
      // Check against known non-answer patterns
      if (NON_ANSWER_PATTERNS.some((pattern) => pattern.test(trimmed))) {
        return true;
      }
      // Single word or two words and very short — likely not a real answer
      if (words.length <= 1 && trimmed.length < 10) {
        return true;
      }
    }

    // Check explicit non-answer phrases even in longer text
    const lowerTrimmed = trimmed.toLowerCase();
    const explicitNonAnswers = [
      'i don\'t know',
      'i dont know',
      'no idea',
      'pass',
      'skip',
      'next question',
      'i have no idea',
      'can\'t answer',
      'cannot answer',
    ];

    // Only match if the non-answer phrase IS the entire response (not part of a longer answer)
    if (explicitNonAnswers.some((phrase) => lowerTrimmed === phrase || lowerTrimmed === phrase + '.')) {
      return true;
    }

    return false;
  }
}

export default new InterviewService();
