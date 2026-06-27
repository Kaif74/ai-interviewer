/**
 * @module questionsController
 * @description REST controller for question set management (CRUD).
 * Thin controller layer — validates requests and delegates to RetrievalService.
 */

import RetrievalService from '../services/RetrievalService.js';
import logger from '../utils/logger.js';

/**
 * GET /api/questions
 * Returns all questions in order.
 */
export async function listQuestions(_req, res) {
  const questions = RetrievalService.getAllQuestions();
  const meta = RetrievalService.getMeta();

  res.json({
    success: true,
    data: { meta, questions },
  });
}

/**
 * GET /api/questions/:id
 * Returns a single question by ID.
 */
export async function getQuestion(req, res) {
  const { id } = req.params;
  const question = RetrievalService.getQuestion(id);

  if (!question) {
    const err = new Error(`Question "${id}" not found`);
    err.statusCode = 404;
    throw err;
  }

  res.json({
    success: true,
    data: question,
  });
}

/**
 * POST /api/questions
 * Creates a new question.
 *
 * Body: { topic, question: { en, hi?, de? }, key_points, ideal_answer_summary,
 *         follow_up_probe: { en, hi?, de? }, coaching_note }
 */
export async function createQuestion(req, res) {
  const body = req.body;

  // Validate required fields
  if (!body.question?.en) {
    const err = new Error('Missing required field: question.en (English question text)');
    err.statusCode = 400;
    throw err;
  }

  if (!body.topic) {
    const err = new Error('Missing required field: topic');
    err.statusCode = 400;
    throw err;
  }

  const newQuestion = await RetrievalService.addQuestion(body);

  logger.info(`[Questions] Created question ${newQuestion.id}`);

  res.status(201).json({
    success: true,
    data: newQuestion,
  });
}

/**
 * PUT /api/questions/:id
 * Updates an existing question.
 *
 * Body: Partial question object with fields to update.
 */
export async function updateQuestion(req, res) {
  const { id } = req.params;
  const updates = req.body;

  if (!updates || Object.keys(updates).length === 0) {
    const err = new Error('Request body is empty — nothing to update');
    err.statusCode = 400;
    throw err;
  }

  const updated = await RetrievalService.updateQuestion(id, updates);

  logger.info(`[Questions] Updated question ${id}`);

  res.json({
    success: true,
    data: updated,
  });
}

/**
 * DELETE /api/questions/:id
 * Deletes a question and re-orders remaining questions.
 */
export async function deleteQuestion(req, res) {
  const { id } = req.params;

  await RetrievalService.deleteQuestion(id);

  logger.info(`[Questions] Deleted question ${id}`);

  res.json({
    success: true,
    message: `Question "${id}" deleted successfully`,
  });
}
