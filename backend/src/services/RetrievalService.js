/**
 * @module RetrievalService
 * @description Loads, caches, and manages the question dataset from questions.json.
 * Retrieval is deterministic — no embeddings, no vector DB.
 *
 * Questions are loaded once at server startup via `initialize()` and served
 * from an in-memory Map for O(1) lookups.
 *
 * CRUD operations (add, update, delete) persist changes back to disk
 * and hot-reload the in-memory cache.
 */

import { readFile, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Path to the canonical questions.json */
const QUESTIONS_FILE_PATH = resolve(__dirname, '../database/questions.json');

class RetrievalService {
  constructor() {
    /** @type {Map<string, Object>} Question ID → question object */
    this._questionsById = new Map();
    /** @type {Object[]} Ordered array of questions */
    this._questionsOrdered = [];
    /** @type {Object|null} Dataset metadata */
    this._meta = null;
    /** @type {boolean} */
    this._initialized = false;
  }

  /**
   * Loads questions.json into memory. Call once during server startup.
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this._initialized) return;

    logger.info(`[Retrieval] Loading questions from ${QUESTIONS_FILE_PATH}`);

    try {
      const raw = await readFile(QUESTIONS_FILE_PATH, 'utf-8');
      const data = JSON.parse(raw);

      this._meta = data.meta;
      this._questionsOrdered = data.questions.sort((a, b) => a.order - b.order);

      this._questionsById.clear();
      for (const q of this._questionsOrdered) {
        this._questionsById.set(q.id, q);
      }

      this._initialized = true;
      logger.info(`[Retrieval] Loaded ${this._questionsOrdered.length} questions for domain: ${this._meta.domain}`);
    } catch (error) {
      logger.error('[Retrieval] Failed to load questions.json', { message: error.message });
      throw error;
    }
  }

  // ─── Read Methods ─────────────────────────────────────────────

  /**
   * Returns a question by its ID (e.g., "q1").
   * @param {string} questionId
   * @returns {Object|undefined}
   */
  getQuestion(questionId) {
    return this._questionsById.get(questionId);
  }

  /**
   * Returns a question by its 0-based index in the ordered list.
   * @param {number} index
   * @returns {Object|undefined}
   */
  getQuestionByIndex(index) {
    return this._questionsOrdered[index];
  }

  /**
   * Returns all questions in order.
   * @returns {Object[]}
   */
  getAllQuestions() {
    return [...this._questionsOrdered];
  }

  /**
   * Returns the localized question text for a given index and language.
   * @param {number} index
   * @param {string} language — 'en' | 'hi' | 'de'
   * @returns {string|undefined}
   */
  getQuestionText(index, language) {
    const q = this._questionsOrdered[index];
    return q?.question?.[language];
  }

  /**
   * Returns total number of questions in the dataset.
   * @returns {number}
   */
  getTotalQuestions() {
    return this._questionsOrdered.length;
  }

  /**
   * Returns the dataset metadata.
   * @returns {Object|null}
   */
  getMeta() {
    return this._meta;
  }

  /**
   * Returns all supported languages from the dataset.
   * @returns {string[]}
   */
  getSupportedLanguages() {
    return this._meta?.languages || ['en'];
  }

  // ─── CRUD Methods ─────────────────────────────────────────────

  /**
   * Adds a new question to the dataset, persists to disk, and reloads cache.
   *
   * @param {Object} questionData — Partial question object (id and order auto-generated)
   * @returns {Promise<Object>} The newly created question
   */
  async addQuestion(questionData) {
    // Generate next ID: find the highest existing numeric id suffix and increment
    const maxId = this._questionsOrdered.reduce((max, q) => {
      const num = parseInt(q.id.replace(/\D/g, ''), 10) || 0;
      return Math.max(max, num);
    }, 0);
    const newId = `q${maxId + 1}`;

    // Order = last position
    const newOrder = this._questionsOrdered.length + 1;

    const newQuestion = {
      id: newId,
      order: newOrder,
      topic: questionData.topic || 'general',
      question: questionData.question || { en: '', hi: '', de: '' },
      key_points: questionData.key_points || [],
      ideal_answer_summary: questionData.ideal_answer_summary || '',
      follow_up_probe: questionData.follow_up_probe || { en: '', hi: '', de: '' },
      coaching_note: questionData.coaching_note || '',
    };

    this._questionsOrdered.push(newQuestion);
    this._questionsById.set(newId, newQuestion);

    await this._writeToDisk();
    logger.info(`[Retrieval] Added question ${newId}`);

    return newQuestion;
  }

  /**
   * Updates an existing question by ID, persists to disk, and refreshes cache.
   *
   * @param {string} id — Question ID (e.g., "q3")
   * @param {Object} updates — Fields to update (partial)
   * @returns {Promise<Object>} The updated question
   * @throws {Error} If question not found
   */
  async updateQuestion(id, updates) {
    const existing = this._questionsById.get(id);
    if (!existing) {
      const err = new Error(`Question "${id}" not found`);
      err.statusCode = 404;
      throw err;
    }

    // Merge updates (shallow merge for top-level, deep merge for nested objects)
    const fieldsToMerge = ['question', 'follow_up_probe'];
    for (const key of Object.keys(updates)) {
      if (key === 'id') continue; // Never allow id change
      if (fieldsToMerge.includes(key) && typeof updates[key] === 'object') {
        existing[key] = { ...existing[key], ...updates[key] };
      } else {
        existing[key] = updates[key];
      }
    }

    await this._writeToDisk();
    logger.info(`[Retrieval] Updated question ${id}`);

    return existing;
  }

  /**
   * Deletes a question by ID, re-orders remaining questions, persists to disk.
   *
   * @param {string} id — Question ID (e.g., "q5")
   * @returns {Promise<void>}
   * @throws {Error} If question not found
   */
  async deleteQuestion(id) {
    if (!this._questionsById.has(id)) {
      const err = new Error(`Question "${id}" not found`);
      err.statusCode = 404;
      throw err;
    }

    this._questionsById.delete(id);
    this._questionsOrdered = this._questionsOrdered.filter((q) => q.id !== id);

    // Re-order remaining questions sequentially
    this._questionsOrdered.forEach((q, i) => {
      q.order = i + 1;
    });

    await this._writeToDisk();
    logger.info(`[Retrieval] Deleted question ${id}, ${this._questionsOrdered.length} remaining`);
  }

  /**
   * Force-reloads the dataset from disk. Useful after external edits.
   * @returns {Promise<void>}
   */
  async reload() {
    this._initialized = false;
    this._questionsById.clear();
    this._questionsOrdered = [];
    this._meta = null;
    await this.initialize();
    logger.info('[Retrieval] Hot-reloaded questions from disk');
  }

  // ─── Private Helpers ──────────────────────────────────────────

  /**
   * Serializes the current in-memory state back to questions.json.
   * @returns {Promise<void>}
   */
  async _writeToDisk() {
    const data = {
      meta: this._meta,
      questions: this._questionsOrdered,
    };

    await writeFile(QUESTIONS_FILE_PATH, JSON.stringify(data, null, 2) + '\n', 'utf-8');
    logger.info(`[Retrieval] Persisted ${this._questionsOrdered.length} questions to disk`);
  }
}

export default new RetrievalService();
