/**
 * @module app
 * @description Express application factory.
 * Configures middleware, mounts routes, and attaches the global error handler.
 */

import express from 'express';
import cors from 'cors';
import interviewRoutes from './routes/interviewRoutes.js';
import questionsRoutes from './routes/questionsRoutes.js';
import errorHandler from './middleware/errorHandler.js';

/**
 * Creates and configures the Express application.
 * @returns {import('express').Application}
 */
function createApp() {
  const app = express();

  // ── Global Middleware ──
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type'],
  }));

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // ── Health Check ──
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ── API Routes ──
  app.use('/api/interview', interviewRoutes);
  app.use('/api/questions', questionsRoutes);

  // ── 404 Handler ──
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: { message: 'Route not found' },
    });
  });

  // ── Global Error Handler (must be last) ──
  app.use(errorHandler);

  return app;
}

export default createApp;
