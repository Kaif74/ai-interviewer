/**
 * @module api
 * @description Axios-based API service for communicating with the backend.
 * All interview API calls are centralized here.
 */

import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 120000, // 2 min — accounts for STT + LLM + TTS chain
});

// Response interceptor for consistent error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.error?.message ||
      error.message ||
      'An unexpected error occurred';

    console.error('[API Error]', message);
    return Promise.reject(new Error(message));
  },
);

/**
 * Starts a new interview session.
 * @param {string} language — 'en' | 'hi' | 'de'
 * @returns {Promise<{ interviewId, question, questionNumber, totalQuestions, audio }>}
 */
export async function startInterview(language) {
  const res = await api.post('/interview/start', { language });
  return res.data;
}

/**
 * Sends an audio recording for processing.
 * @param {string} interviewId
 * @param {Blob} audioBlob — Audio recording from MediaRecorder
 * @returns {Promise<{ transcript, reply, audio, score, evaluation, followUp, ... }>}
 */
export async function sendResponse(interviewId, audioBlob) {
  const formData = new FormData();
  formData.append('interviewId', interviewId);
  formData.append('audio', audioBlob, 'recording.webm');

  const res = await api.post('/interview/respond', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

/**
 * Ends the interview and retrieves the feedback report.
 * @param {string} interviewId
 * @returns {Promise<Object>} Full feedback report
 */
export async function endInterview(interviewId) {
  const res = await api.post('/interview/end', { interviewId });
  return res.data;
}

/**
 * Sends an audio recording for streaming processing via Server-Sent Events.
 *
 * The backend processes STT → state machine → per-sentence TTS, emitting:
 *   audio_chunk events: { index, total, text, audio (base64) }  — one per sentence
 *   done event:         { data: { transcript, reply, score, ... } }
 *   error event:        { message }
 *
 * @param {string}   interviewId
 * @param {Blob}     audioBlob      — Audio recording from MediaRecorder
 * @param {Function} onChunk        — Called with each { index, total, text, audio } chunk
 * @param {Function} onDone         — Called with final result data when stream ends
 * @returns {Promise<void>}         — Resolves when the SSE stream closes
 */
export async function sendResponseStream(interviewId, audioBlob, onChunk, onDone) {
  const formData = new FormData();
  formData.append('interviewId', interviewId);
  formData.append('audio', audioBlob, 'recording.webm');

  const response = await fetch(`${BASE_URL}/interview/respond/stream`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(
      errorBody?.error?.message ||
      `Server error: ${response.status}`,
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let sseBuffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    sseBuffer += decoder.decode(value, { stream: true });

    // SSE events are separated by double newlines
    const parts = sseBuffer.split('\n\n');
    // Keep the last (possibly incomplete) part in the buffer
    sseBuffer = parts.pop();

    for (const part of parts) {
      const dataLine = part.split('\n').find((l) => l.startsWith('data:'));
      if (!dataLine) continue;

      const rawJson = dataLine.slice(5).trim();
      let event;
      try {
        event = JSON.parse(rawJson);
      } catch {
        console.warn('[Stream] Unparseable SSE line:', rawJson);
        continue;
      }

      if (event.type === 'audio_chunk') {
        onChunk?.(event);
      } else if (event.type === 'done') {
        onDone?.(event.data);
      } else if (event.type === 'error') {
        throw new Error(event.message || 'Stream error');
      }
    }
  }
}

// ─── Questions Management API ────────────────────────────────────

/**
 * Fetches all questions from the dataset.
 * @returns {Promise<{ meta: Object, questions: Object[] }>}
 */
export async function fetchQuestions() {
  const res = await api.get('/questions');
  return res.data;
}

/**
 * Fetches a single question by ID.
 * @param {string} id — Question ID (e.g., "q1")
 * @returns {Promise<Object>}
 */
export async function fetchQuestion(id) {
  const res = await api.get(`/questions/${id}`);
  return res.data;
}

/**
 * Creates a new question.
 * @param {Object} data — Question data (topic, question, key_points, etc.)
 * @returns {Promise<Object>} The newly created question
 */
export async function createQuestion(data) {
  const res = await api.post('/questions', data);
  return res.data;
}

/**
 * Updates an existing question.
 * @param {string} id — Question ID
 * @param {Object} data — Partial question data to update
 * @returns {Promise<Object>} The updated question
 */
export async function updateQuestion(id, data) {
  const res = await api.put(`/questions/${id}`, data);
  return res.data;
}

/**
 * Deletes a question.
 * @param {string} id — Question ID
 * @returns {Promise<void>}
 */
export async function deleteQuestion(id) {
  await api.delete(`/questions/${id}`);
}

export default api;
