/**
 * @module TTSService
 * @description Text-to-Speech service using Mistral Voxtral TTS API.
 * Converts interviewer reply text to spoken audio and returns a base64-encoded
 * mp3 string for client playback.
 *
 * API: POST https://api.mistral.ai/v1/audio/speech
 * Model: voxtral-mini-tts-2603 (multilingual, supports EN/HI/DE)
 * Response: JSON { audio_data: "<base64>" }
 */

import axios from 'axios';
import config from '../config/index.js';
import logger from '../utils/logger.js';

class TTSService {
  /**
   * Converts text to speech audio via Mistral Voxtral TTS.
   *
   * @param {string} text — Text to synthesize
   * @returns {Promise<string>} Base64-encoded mp3 audio
   */
  async synthesize(text) {
    if (!text || text.trim().length === 0) {
      logger.warn('[TTS] Empty text received, skipping synthesis');
      return '';
    }

    logger.info(`[TTS] Synthesizing ${text.length} chars with model=${config.tts.model}`);

    try {
      const response = await axios.post(
        `${config.tts.baseUrl}/audio/speech`,
        {
          model: config.tts.model,
          input: text,
          voice: config.tts.voice,
          response_format: 'mp3',
        },
        {
          headers: {
            Authorization: `Bearer ${config.tts.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        },
      );

      // Mistral returns JSON: { audio_data: "<base64 string>" }
      const base64Audio = response.data?.audio_data;

      if (!base64Audio) {
        logger.warn('[TTS] Response missing audio_data field');
        return '';
      }

      const audioSizeBytes = Math.round((base64Audio.length * 3) / 4);
      logger.info(`[TTS] Synthesis complete, audio size: ~${audioSizeBytes} bytes`);

      return base64Audio;
    } catch (error) {
      logger.error('[TTS] Synthesis failed', {
        status: error.response?.status,
        message: error.response?.data?.detail?.message
          || error.response?.data?.message
          || error.message,
      });

      // TTS failure is non-critical — return empty and let the frontend
      // fall back to text-only display
      logger.warn('[TTS] Returning empty audio — client will use text fallback');
      return '';
    }
  }
}

export default new TTSService();
