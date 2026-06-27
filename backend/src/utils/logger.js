/**
 * @module logger
 * @description Lightweight structured logger with timestamps and log levels.
 * In production you'd swap this for winston / pino — but for a prototype
 * this keeps dependencies minimal while still being informative.
 */

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const CURRENT_LEVEL = LEVELS[process.env.LOG_LEVEL || 'debug'];

/**
 * Formats a log entry with ISO timestamp, level, and optional metadata.
 * @param {'debug'|'info'|'warn'|'error'} level
 * @param {string} message
 * @param {Object} [meta]
 */
function log(level, message, meta) {
  if (LEVELS[level] < CURRENT_LEVEL) return;

  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

  if (meta) {
    console[level === 'error' ? 'error' : 'log'](prefix, message, meta);
  } else {
    console[level === 'error' ? 'error' : 'log'](prefix, message);
  }
}

const logger = {
  debug: (msg, meta) => log('debug', msg, meta),
  info: (msg, meta) => log('info', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  error: (msg, meta) => log('error', msg, meta),
};

export default logger;
