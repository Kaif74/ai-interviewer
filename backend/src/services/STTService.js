/**
 * @module STTService
 * @description Speech-to-Text service using Groq Whisper API.
 * Routes to the appropriate Whisper model based on language:
 *   - English → whisper-large-v3-turbo (faster)
 *   - Hindi / German → whisper-large-v3 (multilingual)
 */

import axios from 'axios';
import FormData from 'form-data';
import config from '../config/index.js';
import logger from '../utils/logger.js';

class STTService {
  /**
   * Transcribes an audio buffer using Groq Whisper.
   *
   * @param {Buffer} audioBuffer — Raw audio data (webm/wav/mp3)
   * @param {string} language    — 'en' | 'hi' | 'de'
   * @param {string} [mimeType='audio/webm'] — MIME type of the audio
   * @returns {Promise<{ transcript: string, language: string }>}
   */
  async transcribe(audioBuffer, language = 'en', mimeType = 'audio/webm') {
    const model = config.stt.models[language] || config.stt.models.en;
    const extension = this._getExtension(mimeType);

    logger.info(`[STT] Transcribing ${audioBuffer.length} bytes with model=${model}, lang=${language}`);

    const form = new FormData();
    form.append('file', audioBuffer, {
      filename: `recording.${extension}`,
      contentType: mimeType,
    });
    form.append('model', model);
    form.append('language', language);
    form.append('response_format', 'json');

    try {
      const response = await axios.post(
        `${config.stt.baseUrl}/audio/transcriptions`,
        form,
        {
          headers: {
            Authorization: `Bearer ${config.stt.apiKey}`,
            ...form.getHeaders(),
          },
          maxBodyLength: Infinity,
          timeout: 30000,
        },
      );

      const transcript = response.data?.text?.trim() || '';
      logger.info(`[STT] Transcription complete: "${transcript.slice(0, 100)}..."`);

      return { transcript, language };
    } catch (error) {
      logger.error('[STT] Transcription failed', {
        status: error.response?.status,
        message: error.response?.data?.error?.message || error.message,
      });

      const sttError = new Error(
        `Speech-to-text failed: ${error.response?.data?.error?.message || error.message}`,
      );
      sttError.statusCode = 502;
      throw sttError;
    }
  }

  /**
   * Maps MIME type to file extension for the Groq API.
   * @param {string} mimeType
   * @returns {string}
   */
  _getExtension(mimeType) {
    const map = {
      'audio/webm': 'webm',
      'audio/wav': 'wav',
      'audio/mp3': 'mp3',
      'audio/mpeg': 'mp3',
      'audio/ogg': 'ogg',
      'audio/mp4': 'mp4',
    };
    return map[mimeType] || 'webm';
  }
}

export default new STTService();
