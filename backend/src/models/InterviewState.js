/**
 * @module InterviewState
 * @description Factory for creating interview state objects.
 * The application — not the LLM — is the source of truth for interview state.
 *
 * State machine phases:
 *   ASKING → LISTENING → EVALUATING → FOLLOW_UP | NEXT_QUESTION → … → END
 */

/**
 * Valid interview phases.
 * @readonly
 * @enum {string}
 */
export const InterviewPhase = Object.freeze({
  ASKING: 'ASKING',
  LISTENING: 'LISTENING',
  EVALUATING: 'EVALUATING',
  FOLLOW_UP: 'FOLLOW_UP',
  COACHING: 'COACHING',
  NEXT_QUESTION: 'NEXT_QUESTION',
  END: 'END',
});

/**
 * Creates a new InterviewState object.
 *
 * @param {Object} params
 * @param {string} params.interviewId — Unique session identifier (uuid)
 * @param {string} params.language    — 'en' | 'hi' | 'de'
 * @param {number} params.totalQuestions — Total number of questions in dataset
 * @returns {import('../types').InterviewState}
 */
export function createInterviewState({ interviewId, language, totalQuestions }) {
  return {
    interviewId,
    language,
    currentQuestionIndex: 0,
    currentQuestionId: 'q1',
    totalQuestions,
    phase: InterviewPhase.ASKING,
    history: [],           // { role: 'interviewer'|'candidate', content: string }[]
    answers: [],           // { questionId, transcript, score, evaluation, coaching }[]
    followUpAsked: false,
    nonAnswerCount: 0,     // Consecutive non-answers for current question (resets on advance)
    startTime: Date.now(),
    completed: false,
  };
}
