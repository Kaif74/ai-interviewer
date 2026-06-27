/**
 * @module questionsRoutes
 * @description Mounts question management CRUD routes.
 *
 * Routes:
 *   GET    /api/questions      — List all questions
 *   GET    /api/questions/:id  — Get a single question
 *   POST   /api/questions      — Create a new question
 *   PUT    /api/questions/:id  — Update a question
 *   DELETE /api/questions/:id  — Delete a question
 */

import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import {
  listQuestions,
  getQuestion,
  createQuestion,
  updateQuestion,
  deleteQuestion,
} from '../controllers/questionsController.js';

const router = Router();

router.get('/', asyncHandler(listQuestions));
router.get('/:id', asyncHandler(getQuestion));
router.post('/', asyncHandler(createQuestion));
router.put('/:id', asyncHandler(updateQuestion));
router.delete('/:id', asyncHandler(deleteQuestion));

export default router;
