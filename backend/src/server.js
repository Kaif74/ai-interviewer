/**
 * @module server
 * @description Application entry point.
 * Loads environment, initializes the question cache, and starts the HTTP server.
 */

import config from './config/index.js';
import createApp from './app.js';
import RetrievalService from './services/RetrievalService.js';
import logger from './utils/logger.js';

async function main() {
  try {
    // Initialize question dataset cache
    await RetrievalService.initialize();

    // Create and start Express app
    const app = createApp();

    app.listen(config.port, '0.0.0.0', () => {
      logger.info(`🎙️  AI Interviewer backend running on http://0.0.0.0:${config.port}`);
      logger.info(`📋 Loaded ${RetrievalService.getTotalQuestions()} questions`);
      logger.info(`🌐 Supported languages: ${RetrievalService.getSupportedLanguages().join(', ')}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { message: error.message, stack: error.stack });
    process.exit(1);
  }
}

main();
