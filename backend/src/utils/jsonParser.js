/**
 * @module jsonParser
 * @description Robust JSON extraction from LLM responses.
 * LLMs often wrap JSON in markdown code fences or include trailing prose.
 * This module strips those wrappers and parses reliably.
 */

import logger from './logger.js';

/**
 * Attempts to extract and parse a JSON object from a raw LLM response string.
 *
 * Strategy (tried in order):
 *  1. Direct JSON.parse
 *  2. Extract from ```json ... ``` code fence
 *  3. Extract first { ... } block via brace matching
 *
 * @param {string} raw — The raw text from the LLM
 * @returns {Object} Parsed JSON object
 * @throws {Error} If no valid JSON can be extracted
 */
export function extractJSON(raw) {
  if (!raw || typeof raw !== 'string') {
    throw new Error('extractJSON received empty or non-string input');
  }

  const trimmed = raw.trim();

  // Strategy 1: Direct parse
  try {
    return JSON.parse(trimmed);
  } catch {
    // Continue to next strategy
  }

  // Strategy 2: Markdown code fence
  const fenceMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {
      logger.warn('Found code fence but contents are not valid JSON');
    }
  }

  // Strategy 3: First balanced { ... } block
  const firstBrace = trimmed.indexOf('{');
  if (firstBrace !== -1) {
    let depth = 0;
    let inString = false;
    let escape = false;

    for (let i = firstBrace; i < trimmed.length; i++) {
      const ch = trimmed[i];

      if (escape) {
        escape = false;
        continue;
      }
      if (ch === '\\') {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;

      if (ch === '{') depth++;
      if (ch === '}') depth--;

      if (depth === 0) {
        const candidate = trimmed.slice(firstBrace, i + 1);
        try {
          return JSON.parse(candidate);
        } catch {
          logger.warn('Brace-matched block is not valid JSON');
          break;
        }
      }
    }
  }

  throw new Error(`Failed to extract valid JSON from LLM response: ${trimmed.slice(0, 200)}...`);
}

/**
 * Validates that a parsed object contains all required keys.
 *
 * @param {Object} obj — Parsed JSON
 * @param {string[]} requiredKeys — Keys that must be present
 * @returns {Object} The same object if valid
 * @throws {Error} If any required key is missing
 */
export function validateSchema(obj, requiredKeys) {
  const missing = requiredKeys.filter((key) => !(key in obj));
  if (missing.length > 0) {
    throw new Error(`LLM response missing required fields: ${missing.join(', ')}`);
  }
  return obj;
}
