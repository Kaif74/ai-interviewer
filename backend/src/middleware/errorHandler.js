/**
 * @module errorHandler
 * @description Global Express error-handling middleware.
 * Catches all errors thrown or forwarded by route handlers and returns
 * a consistent JSON error response. Never leaks stack traces in production.
 */

import logger from '../utils/logger.js';

/**
 * Express error middleware (must have 4 parameters).
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next
 */
function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  logger.error(`[${req.method}] ${req.originalUrl} → ${statusCode}`, {
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    },
  });
}

export default errorHandler;
