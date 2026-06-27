/**
 * @module interviewController
 * @description Thin controller layer — validates requests and delegates to services.
 * No business logic lives here.
 */

import InterviewService from '../services/InterviewService.js';
import STTService from '../services/STTService.js';
import TTSService from '../services/TTSService.js';
import FeedbackService from '../services/FeedbackService.js';
import logger from '../utils/logger.js';

/**
 * POST /api/interview/start
 * Starts a new interview session.
 *
 * Body: { language: 'en' | 'hi' | 'de' }
 * Returns: { interviewId, question, questionNumber, totalQuestions, audio }
 */
export async function startInterview(req, res) {
  const { language = 'en' } = req.body;

  // Validate language
  const supported = ['en', 'hi', 'de'];
  if (!supported.includes(language)) {
    const err = new Error(`Unsupported language: "${language}". Supported: ${supported.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  const result = InterviewService.startInterview(language);

  // Synthesize the first question as audio
  const audio = await TTSService.synthesize(result.question);

  logger.info(`[Controller] Interview started: ${result.interviewId}`);

  res.status(201).json({
    success: true,
    data: {
      ...result,
      audio,
    },
  });
}

/**
 * POST /api/interview/respond
 * Processes a candidate's audio response.
 *
 * Multipart: audio file + interviewId field
 * Returns: { transcript, reply, audio, score, evaluation, followUp, ... }
 */
export async function respondToQuestion(req, res) {
  const { interviewId } = req.body;

  if (!interviewId) {
    const err = new Error('Missing required field: interviewId');
    err.statusCode = 400;
    throw err;
  }

  if (!req.file) {
    const err = new Error('Missing required audio file');
    err.statusCode = 400;
    throw err;
  }

  // Get the interview state to know the language
  const state = InterviewService.getInterviewState(interviewId);

  // Step 1: Speech-to-Text
  const { transcript } = await STTService.transcribe(
    req.file.buffer,
    state.language,
    req.file.mimetype,
  );

  if (!transcript || transcript.trim().length === 0) {
    const err = new Error('Could not transcribe audio — please try speaking again');
    err.statusCode = 422;
    throw err;
  }

  // Step 2: Process through interview state machine (Retrieval → Prompt → LLM)
  const result = await InterviewService.processResponse(interviewId, transcript);

  // Step 3: Text-to-Speech for interviewer reply
  const audio = await TTSService.synthesize(result.reply);

  logger.info(`[Controller] Response processed for ${interviewId}, score=${result.score}`);

  res.json({
    success: true,
    data: {
      ...result,
      audio,
    },
  });
}

/**
 * POST /api/interview/end
 * Ends the interview and generates a feedback report.
 *
 * Body: { interviewId }
 * Returns: Full feedback report
 */
export async function endInterview(req, res) {
  const { interviewId } = req.body;

  if (!interviewId) {
    const err = new Error('Missing required field: interviewId');
    err.statusCode = 400;
    throw err;
  }

  // Mark as completed
  InterviewService.completeInterview(interviewId);

  // Generate feedback report
  const state = InterviewService.getInterviewState(interviewId);
  const report = await FeedbackService.generateReport(state);

  logger.info(`[Controller] Feedback generated for ${interviewId}, score=${report.overallScore}`);

  res.json({
    success: true,
    data: report,
  });
}

/**
 * POST /api/interview/respond/stream
 * Processes a candidate's audio response and streams TTS audio chunks via SSE.
 *
 * The pipeline:
 *   1. STT: audio → transcript
 *   2. State machine: transcript → result (reply, score, etc.)
 *   3. Per-sentence: sentence → TTS → audio_chunk SSE event (fired as each finishes)
 *   4. Final: done SSE event with full result metadata
 *
 * SSE event types emitted:
 *   { type: 'audio_chunk', index, total, text, audio }  — one per sentence
 *   { type: 'done',        data: { transcript, reply, score, ... } }
 *   { type: 'error',       message }
 *
 * Multipart: audio file + interviewId field
 */
export async function respondToQuestionStream(req, res) {
  const { interviewId } = req.body;

  if (!interviewId) {
    res.status(400).json({ success: false, error: { message: 'Missing required field: interviewId' } });
    return;
  }

  if (!req.file) {
    res.status(400).json({ success: false, error: { message: 'Missing required audio file' } });
    return;
  }

  // ── SSE setup ──
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering if present

  // Flush headers immediately so the client sees the SSE stream start
  if (res.flushHeaders) res.flushHeaders();

  /** Write a typed SSE event */
  const sendEvent = (type, payload) => {
    try {
      res.write(`data: ${JSON.stringify({ type, ...payload })}\n\n`);
    } catch {
      // Connection may have closed mid-stream
    }
  };

  try {
    // Step 1: Speech-to-Text
    const state = InterviewService.getInterviewState(interviewId);

    const { transcript } = await STTService.transcribe(
      req.file.buffer,
      state.language,
      req.file.mimetype,
    );

    if (!transcript || transcript.trim().length === 0) {
      sendEvent('error', { message: 'Could not transcribe audio — please try speaking again' });
      res.end();
      return;
    }

    // Step 2: Run state machine → get authoritative reply + metadata
    const result = await InterviewService.processResponse(interviewId, transcript);

    // Step 3: Split the final reply into sentence chunks and synthesize each via TTS.
    // Each chunk is pushed to the client as soon as its audio is ready —
    // so the browser can play chunk 1 while chunk 2 is still being synthesized.
    const sentences = splitIntoSentences(result.reply);
    logger.info(`[Stream] ${sentences.length} sentence(s) for interviewId=${interviewId}`);

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      if (!sentence.trim()) continue;

      // Fire TTS; TTSService already handles errors gracefully (returns '' on failure)
      const audio = await TTSService.synthesize(sentence);

      sendEvent('audio_chunk', {
        index: i,
        total: sentences.length,
        text: sentence,
        audio,
      });

      logger.debug(`[Stream] Emitted audio chunk ${i + 1}/${sentences.length}`);
    }

    // Step 4: Signal completion with full metadata
    sendEvent('done', {
      data: {
        transcript: result.transcript,
        reply: result.reply,
        score: result.score,
        evaluation: result.evaluation,
        followUp: result.followUp,
        coaching: result.coaching,
        reasoning: result.reasoning,
        questionNumber: result.questionNumber,
        totalQuestions: result.totalQuestions,
        isComplete: result.isComplete,
      },
    });

    logger.info(`[Stream] Done for ${interviewId}, score=${result.score}`);
    res.end();

  } catch (err) {
    logger.error('[Stream] Error', { message: err.message });
    try {
      sendEvent('error', { message: err.message || 'Streaming failed' });
      res.end();
    } catch {
      // Response already closed
    }
  }
}

/**
 * Splits a reply string into sentence-sized chunks.
 * Each chunk ends at a sentence boundary (. ? !) and trailing whitespace.
 *
 * @param {string} text
 * @returns {string[]}
 */
function splitIntoSentences(text) {
  if (!text) return [];
  // Match runs that end with . ? or ! plus optional closing chars and whitespace
  const parts = text.match(/[^.?!]+[.?!]["')\\]]*\s*/g) || [];
  // Capture any trailing fragment that has no terminal punctuation
  const consumed = parts.join('');
  if (consumed.length < text.length) {
    const tail = text.slice(consumed.length).trim();
    if (tail) parts.push(tail);
  }
  return parts.map((s) => s.trim()).filter(Boolean);
}
