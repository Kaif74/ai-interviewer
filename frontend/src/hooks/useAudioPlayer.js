/**
 * @module useAudioPlayer
 * @description Queue-based audio player hook.
 *
 * Supports two usage patterns:
 *
 * 1. Single-shot (original API, backwards-compatible):
 *      playAudio(base64String) — clears any queued audio and plays immediately
 *
 * 2. Streaming queue (new API for LLM→TTS chunked streaming):
 *      enqueueChunk(base64String) — appended to the playback queue.
 *        - If nothing is playing right now, playback starts immediately.
 *        - If something is already playing, the chunk is buffered and played
 *          the moment the current one ends.
 *      clearQueue() — stops current audio and empties the queue
 *
 * isPlaying stays `true` until the entire queue has drained.
 */

import { useState, useRef, useCallback, useEffect } from 'react';

/** Convert a base64 mp3 string to a browser Object URL */
function base64ToObjectURL(base64Audio) {
  const byteCharacters = atob(base64Audio);
  const byteNumbers = new Uint8Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const blob = new Blob([byteNumbers], { type: 'audio/mpeg' });
  return URL.createObjectURL(blob);
}

/**
 * @returns {{
 *   isPlaying: boolean,
 *   playAudio:     (base64: string) => Promise<void>,
 *   enqueueChunk:  (base64: string) => void,
 *   clearQueue:    () => void,
 *   stopAudio:     () => void,
 * }}
 */
export function useAudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);

  // The active <Audio> element
  const audioRef = useRef(null);

  // Ordered queue of Object URLs waiting to be played
  const queueRef = useRef([]);

  // Object URLs we have created (for cleanup)
  const createdUrlsRef = useRef([]);

  /** Revoke a single URL and remove it from the tracking set */
  const revokeUrl = useCallback((url) => {
    URL.revokeObjectURL(url);
    createdUrlsRef.current = createdUrlsRef.current.filter((u) => u !== url);
  }, []);

  /**
   * Internal: play a single Object URL, then advance the queue.
   * @param {string} url — Object URL for an audio/mpeg blob
   * @returns {Promise<void>}
   */
  const _playUrl = useCallback((url) => {
    return new Promise((resolve) => {
      // Tear down any currently active audio without touching the queue
      if (audioRef.current) {
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
        audioRef.current.pause();
        audioRef.current = null;
      }

      const audio = new Audio(url);
      audioRef.current = audio;
      setIsPlaying(true);

      const advance = () => {
        revokeUrl(url);
        audioRef.current = null;

        if (queueRef.current.length > 0) {
          // Play the next queued URL immediately
          const nextUrl = queueRef.current.shift();
          _playUrl(nextUrl).then(resolve);
        } else {
          // Queue exhausted
          setIsPlaying(false);
          resolve();
        }
      };

      audio.onended = advance;
      audio.onerror = (e) => {
        console.error('[AudioPlayer] Playback error', e);
        advance();
      };

      audio.play().catch((err) => {
        console.error('[AudioPlayer] Play failed:', err.message);
        advance();
      });
    });
  }, [revokeUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Enqueue a base64-encoded mp3 audio chunk for sequential playback.
   * Starts immediately if nothing is currently playing.
   *
   * @param {string} base64Audio
   */
  const enqueueChunk = useCallback((base64Audio) => {
    if (!base64Audio) return;

    const url = base64ToObjectURL(base64Audio);
    createdUrlsRef.current.push(url);

    if (!audioRef.current) {
      // Nothing playing — start immediately (don't push to queue)
      _playUrl(url);
    } else {
      // Something playing — buffer it
      queueRef.current.push(url);
    }
  }, [_playUrl]);

  /**
   * Stop all playback and empty the queue.
   */
  const clearQueue = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current = null;
    }
    // Revoke all buffered URLs
    for (const url of queueRef.current) {
      URL.revokeObjectURL(url);
    }
    queueRef.current = [];
    setIsPlaying(false);
  }, []);

  /**
   * Single-shot playback (original API — backwards-compatible).
   * Clears the queue and plays the given audio immediately.
   *
   * @param {string} base64Audio
   * @returns {Promise<void>} Resolves when playback ends
   */
  const playAudio = useCallback((base64Audio) => {
    clearQueue();
    if (!base64Audio) return Promise.resolve();

    const url = base64ToObjectURL(base64Audio);
    createdUrlsRef.current.push(url);
    return _playUrl(url);
  }, [clearQueue, _playUrl]);

  /** Alias kept for backwards compatibility */
  const stopAudio = clearQueue;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      for (const url of createdUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
    };
  }, []);

  return { isPlaying, playAudio, enqueueChunk, clearQueue, stopAudio };
}
