/**
 * @module FeedbackService
 * @description Generates a comprehensive end-of-interview feedback report.
 * Combines deterministic score aggregation with an LLM-generated narrative.
 */

import LLMService from './LLMService.js';
import PromptService from './PromptService.js';
import RetrievalService from './RetrievalService.js';
import logger from '../utils/logger.js';

class FeedbackService {
  /**
   * Generates the final feedback report for a completed interview.
   *
   * @param {import('../models/InterviewState.js').InterviewState} state
   * @returns {Promise<Object>} Structured feedback report
   */
  async generateReport(state) {
    logger.info(`[Feedback] Generating report for interview ${state.interviewId}`);

    // --- Deterministic aggregation ---
    const questionScores = state.answers.map((answer) => {
      const question = RetrievalService.getQuestion(answer.questionId);
      return {
        questionId: answer.questionId,
        topic: question?.topic || answer.topic,
        question: question?.question?.[state.language] || '',
        score: answer.score,
        evaluation: answer.evaluation,
        transcript: answer.transcript,
        idealAnswer: question?.ideal_answer_summary || '',
        keyPoints: question?.key_points || [],
        coaching: answer.coaching || '',
      };
    });

    const scores = state.answers.map((a) => a.score);
    const overallAverage = scores.length > 0
      ? Math.round((scores.reduce((sum, s) => sum + s, 0) / scores.length) * 10)
      : 0;

    const duration = (Date.now() - state.startTime) / 1000;

    // --- LLM-generated narrative ---
    let llmFeedback = {};
    try {
      const systemPrompt = 'You are an expert interview coach providing detailed, actionable feedback.';
      const userPrompt = PromptService.buildFeedbackPrompt({
        answers: state.answers.map((a) => ({
          ...a,
          topic: RetrievalService.getQuestion(a.questionId)?.topic || 'unknown',
        })),
        language: state.language,
        duration,
      });

      llmFeedback = await LLMService.generateFeedback(systemPrompt, userPrompt);
    } catch (error) {
      logger.warn('[Feedback] LLM feedback generation failed, using deterministic fallback', {
        message: error.message,
      });
      llmFeedback = this._buildFallbackFeedback(state.answers, overallAverage);
    }

    return {
      interviewId: state.interviewId,
      language: state.language,
      duration: Math.round(duration),
      overallScore: llmFeedback.overallScore ?? overallAverage,
      communicationScore: llmFeedback.communicationScore ?? this._estimateCommunication(scores),
      technicalScore: llmFeedback.technicalScore ?? this._estimateTechnical(scores),
      problemSolvingScore: llmFeedback.problemSolvingScore ?? this._estimateProblemSolving(scores),
      questionScores,
      strengths: llmFeedback.strengths || [],
      weaknesses: llmFeedback.weaknesses || [],
      recommendations: llmFeedback.recommendations || [],
      summary: llmFeedback.summary || '',
    };
  }

  /**
   * Builds a deterministic fallback when the LLM is unavailable.
   * @param {Array} answers
   * @param {number} overallAverage
   * @returns {Object}
   */
  _buildFallbackFeedback(answers, overallAverage) {
    const strengths = answers
      .filter((a) => a.score >= 7)
      .map((a) => `Strong performance on ${a.topic || a.questionId}`);

    const weaknesses = answers
      .filter((a) => a.score < 5)
      .map((a) => `Needs improvement on ${a.topic || a.questionId}`);

    return {
      overallScore: overallAverage,
      strengths: strengths.length > 0 ? strengths : ['Completed the full interview'],
      weaknesses: weaknesses.length > 0 ? weaknesses : ['No major weaknesses identified'],
      recommendations: ['Review ideal answers for any questions scored below 7'],
      summary: `Completed the interview with an average score of ${overallAverage}/100.`,
    };
  }

  /** @param {number[]} scores */
  _estimateCommunication(scores) {
    return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 5;
  }

  /** @param {number[]} scores */
  _estimateTechnical(scores) {
    return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 5;
  }

  /** @param {number[]} scores */
  _estimateProblemSolving(scores) {
    return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 5;
  }
}

export default new FeedbackService();
