/**
 * @module interviewRoutes
 * @description Mounts interview API routes with multer for audio file uploads.
 *
 * Routes:
 *   POST /api/interview/start   — Start a new interview
 *   POST /api/interview/respond — Submit audio response
 *   POST /api/interview/end     — End interview and get feedback
 */

import { Router } from 'express';
import multer from 'multer';
import asyncHandler from '../utils/asyncHandler.js';
import { startInterview, respondToQuestion, respondToQuestionStream, endInterview } from '../controllers/interviewController.js';

const router = Router();

/**
 * Multer configured for in-memory storage.
 * Audio files are kept as buffers — never written to disk.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB max
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'audio/webm', 'audio/wav', 'audio/mp3', 'audio/mpeg',
      'audio/ogg', 'audio/mp4', 'audio/x-m4a',
      'video/webm', // Some browsers report webm as video
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported audio format: ${file.mimetype}`), false);
    }
  },
});

// Start a new interview
router.post('/start', asyncHandler(startInterview));

// Submit an audio response (multipart form-data) — standard single-audio response
router.post('/respond', upload.single('audio'), asyncHandler(respondToQuestion));

// Submit an audio response and receive streamed TTS chunks via SSE
// NOTE: asyncHandler is NOT used here — the SSE endpoint manages its own error
// handling to avoid the global error middleware from clobbering response headers.
router.post('/respond/stream', upload.single('audio'), respondToQuestionStream);

// End interview and generate feedback
router.post('/end', asyncHandler(endInterview));

export default router;
