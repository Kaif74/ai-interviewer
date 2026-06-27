/**
 * @module PromptService
 * @description Orchestrates prompt construction by delegating to prompt templates.
 * Provides a clean interface for the InterviewService to build prompts
 * without knowing the template internals.
 */

import { getSystemPrompt } from '../prompts/systemPrompt.js';
import { buildEvaluationPrompt } from '../prompts/evaluationPrompt.js';
import { buildFeedbackPrompt } from '../prompts/feedbackPrompt.js';

class PromptService {
  /**
   * Builds the system-level prompt for the interviewer persona.
   * @param {string} language — 'en' | 'hi' | 'de'
   * @returns {string}
   */
  buildSystemPrompt(language) {
    return getSystemPrompt(language);
  }

  /**
   * Builds the evaluation prompt with full dynamic context.
   *
   * @param {Object} params
   * @param {Object} params.question       — Question object from dataset
   * @param {string} params.transcript     — Candidate's spoken answer
   * @param {Array}  params.history        — Conversation history
   * @param {string} params.language       — Interview language
   * @param {boolean} params.isFollowUp    — Whether evaluating a follow-up
   * @param {string} [params.nextQuestionText] — Next question text (if transitioning)
   * @returns {string}
   */
  buildEvaluationPrompt(params) {
    return buildEvaluationPrompt(params);
  }

  /**
   * Builds the feedback report generation prompt.
   *
   * @param {Object} params
   * @param {Array}  params.answers  — All answer records
   * @param {string} params.language — Interview language
   * @param {number} params.duration — Duration in seconds
   * @returns {string}
   */
  buildFeedbackPrompt(params) {
    return buildFeedbackPrompt(params);
  }
}

export default new PromptService();
