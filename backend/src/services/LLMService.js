/**
 * @module LLMService
 * @description Calls the LLM (OpenRouter / NVIDIA NIM) via OpenAI-compatible
 * chat completions API. Parses and validates JSON responses with automatic retry.
 * Also exposes streamInterviewerReply() for sentence-chunked streaming.
 */

import axios from 'axios';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { extractJSON, validateSchema } from '../utils/jsonParser.js';

/** Regex that matches a sentence-ending boundary (., ?, !) optionally followed by whitespace */
const SENTENCE_BOUNDARY = /[.?!][\s"'\)\]]*(?=\s|$)/;

/** Required fields in the evaluation response */
const EVALUATION_KEYS = [
  'score', 'evaluation', 'followUpNeeded', 'interviewerReply',
];

/** Required fields in the feedback response */
const FEEDBACK_KEYS = [
  'overallScore', 'strengths', 'weaknesses', 'recommendations',
];

class LLMService {
  /**
   * Sends a chat completion request and returns parsed JSON.
   *
   * @param {Object} params
   * @param {string} params.systemPrompt — System message
   * @param {string} params.userPrompt   — User message
   * @param {string[]} [params.requiredKeys] — Keys to validate in response
   * @returns {Promise<Object>} Parsed and validated JSON object
   */
  async complete({ systemPrompt, userPrompt, requiredKeys = EVALUATION_KEYS }) {
    let lastError = null;

    for (let attempt = 1; attempt <= config.interview.maxRetries; attempt++) {
      try {
        logger.info(`[LLM] Attempt ${attempt}/${config.interview.maxRetries}`);

        const response = await axios.post(
          `${config.llm.baseUrl}/chat/completions`,
          {
            model: config.llm.model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            max_tokens: config.llm.maxTokens,
            temperature: config.llm.temperature,
          },
          {
            headers: {
              Authorization: `Bearer ${config.llm.apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 60000,
          },
        );

        const rawContent = response.data?.choices?.[0]?.message?.content;

        if (!rawContent) {
          throw new Error('LLM returned empty content');
        }

        logger.debug('[LLM] Raw response', { content: rawContent.slice(0, 300) });

        const parsed = extractJSON(rawContent);
        const validated = validateSchema(parsed, requiredKeys);

        logger.info('[LLM] Successfully parsed and validated response');
        return validated;

      } catch (error) {
        lastError = error;
        logger.warn(`[LLM] Attempt ${attempt} failed: ${error.message}`);

        if (error.response?.status === 429) {
          // Rate limited — wait before retry
          const waitMs = Math.min(2000 * attempt, 10000);
          logger.info(`[LLM] Rate limited, waiting ${waitMs}ms`);
          await this._sleep(waitMs);
        }
      }
    }

    logger.error('[LLM] All retry attempts exhausted', { message: lastError?.message });
    const llmError = new Error(`LLM service failed after ${config.interview.maxRetries} attempts: ${lastError?.message}`);
    llmError.statusCode = 502;
    throw llmError;
  }

  /**
   * Convenience method for evaluation calls.
   * @param {string} systemPrompt
   * @param {string} userPrompt
   * @returns {Promise<Object>}
   */
  async evaluate(systemPrompt, userPrompt) {
    return this.complete({ systemPrompt, userPrompt, requiredKeys: EVALUATION_KEYS });
  }

  /**
   * Convenience method for feedback generation calls.
   * @param {string} systemPrompt
   * @param {string} userPrompt
   * @returns {Promise<Object>}
   */
  async generateFeedback(systemPrompt, userPrompt) {
    return this.complete({ systemPrompt, userPrompt, requiredKeys: FEEDBACK_KEYS });
  }

  /**
   * Streams an interviewer reply from the LLM and yields sentence-boundary chunks.
   *
   * Usage:
   *   for await (const sentence of llmService.streamInterviewerReply({ systemPrompt, userPrompt })) {
   *     await ttsService.synthesize(sentence); // fire immediately per sentence
   *   }
   *
   * @param {Object} params
   * @param {string} params.systemPrompt
   * @param {string} params.userPrompt
   * @yields {string} One sentence (or sentence fragment) at a time
   */
  async *streamInterviewerReply({ systemPrompt, userPrompt }) {
    logger.info('[LLM] Opening streaming request for interviewer reply');

    const response = await axios.post(
      `${config.llm.baseUrl}/chat/completions`,
      {
        model: config.llm.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: config.llm.maxTokens,
        temperature: config.llm.temperature,
        reasoning_format: config.llm.reasoning_format,
        stream: true,
      },
      {
        headers: {
          Authorization: `Bearer ${config.llm.apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        responseType: 'stream',
        timeout: 60000,
      },
    );

    let buffer = '';

    for await (const rawChunk of response.data) {
      // Each chunk may contain one or more SSE lines
      const text = rawChunk.toString('utf8');

      for (const line of text.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;

        const payload = trimmed.slice(5).trim();
        if (payload === '[DONE]') break;

        let parsed;
        try {
          parsed = JSON.parse(payload);
        } catch {
          continue; // skip malformed lines
        }

        const delta = parsed?.choices?.[0]?.delta?.content;
        if (!delta) continue;

        buffer += delta;

        // Yield every time we cross a sentence boundary
        let match;
        while ((match = SENTENCE_BOUNDARY.exec(buffer)) !== null) {
          const endIdx = match.index + match[0].length;
          const sentence = buffer.slice(0, endIdx).trim();
          buffer = buffer.slice(endIdx);

          if (sentence) {
            logger.debug(`[LLM stream] Yielding sentence chunk (${sentence.length} chars)`);
            yield sentence;
          }
        }
      }
    }

    // Flush any remaining text that didn't end with punctuation
    const tail = buffer.trim();
    if (tail) {
      logger.debug(`[LLM stream] Flushing tail chunk (${tail.length} chars)`);
      yield tail;
    }

    logger.info('[LLM stream] Stream complete');
  }

  /**
   * @param {number} ms
   * @returns {Promise<void>}
   */
  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default new LLMService();
