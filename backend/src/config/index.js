/**
 * @module config
 * @description Centralized configuration — single source of truth for all
 * environment variables and application constants.
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root (two levels up from src/config/)
dotenv.config({ path: resolve(__dirname, '../../../.env') });

const config = Object.freeze({
  /** Server */
  port: parseInt(process.env.PORT, 10) || 7860,

  /** LLM — Groq (OpenAI-compatible) */
  llm: {
    apiKey: process.env.GROQ_API_KEY,
    baseUrl: 'https://api.groq.com/openai/v1',
    model: process.env.LLM_MODEL || 'llama-3.3-70b-versatile',
    maxTokens: 1024,
    temperature: 0.4,
  },

  /** Speech-to-Text — Groq Whisper */
  stt: {
    apiKey: process.env.GROQ_API_KEY,
    baseUrl: 'https://api.groq.com/openai/v1',
    models: {
      en: 'whisper-large-v3-turbo',   // Turbo for English
      hi: 'whisper-large-v3',          // Full model for Hindi
      de: 'whisper-large-v3',          // Full model for German
    },
  },

  /** Text-to-Speech — Mistral Voxtral TTS */
  tts: {
    apiKey: process.env.MISTRAL_API_KEY,
    baseUrl: 'https://api.mistral.ai/v1',
    model: 'voxtral-mini-tts-2603',
    voice: process.env.TTS_VOICE || 'en_paul_neutral',
  },

  /** Interview defaults */
  interview: {
    followUpThreshold: 7,    // Score below this triggers follow-up
    coachingThreshold: 5,    // Score below this after follow-up triggers coaching
    maxRetries: 3,           // LLM JSON parse retries
  },
});

export default config;
