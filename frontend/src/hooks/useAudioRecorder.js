/**
 * @module useAudioRecorder
 * @description Custom hook wrapping the MediaRecorder API for recording audio.
 * Handles permission requests, stream setup, cleanup, and Voice Activity
 * Detection (VAD) via volume-based silence detection for hands-free mode.
 */

import { useState, useRef, useCallback, useEffect } from 'react';

/** VAD Configuration */
const VAD_CONFIG = {
  /** RMS volume threshold (0–1 scale) to consider as "speech" */
  SPEECH_THRESHOLD: 0.015,
  /** Duration of continuous silence (ms) before auto-stopping */
  SILENCE_DURATION: 1800,
  /** Minimum speech duration (ms) before silence detection kicks in */
  MIN_SPEECH_DURATION: 500,
  /** Polling interval (ms) for volume checks */
  POLL_INTERVAL: 100,
};

/**
 * @param {Object} [options]
 * @param {Function} [options.onSilenceDetected] — Called when silence is detected after speech.
 *   Receives the recorded Blob as argument. Only used in hands-free mode.
 * @param {boolean} [options.enableVAD=false] — Enable Voice Activity Detection
 * @returns {{
 *   isRecording: boolean,
 *   isSpeechDetected: boolean,
 *   startRecording: () => Promise<void>,
 *   stopRecording: () => Promise<Blob>,
 *   audioBlob: Blob|null,
 *   error: string|null,
 *   analyser: AnalyserNode|null,
 * }}
 */
export function useAudioRecorder({ onSilenceDetected, enableVAD = false } = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeechDetected, setIsSpeechDetected] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [error, setError] = useState(null);
  const [analyser, setAnalyser] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const resolveStopRef = useRef(null);
  const analyserRef = useRef(null);

  // VAD state refs (avoid re-renders during detection loop)
  const vadIntervalRef = useRef(null);
  const speechStartedRef = useRef(false);
  const silenceStartRef = useRef(null);
  const enableVADRef = useRef(enableVAD);
  const onSilenceDetectedRef = useRef(onSilenceDetected);
  const isStoppingRef = useRef(false);

  // Keep refs in sync with latest props
  useEffect(() => {
    enableVADRef.current = enableVAD;
  }, [enableVAD]);

  useEffect(() => {
    onSilenceDetectedRef.current = onSilenceDetected;
  }, [onSilenceDetected]);

  /**
   * Calculates the RMS (root mean square) volume from the analyser node.
   * @returns {number} Volume level between 0 and 1
   */
  const getRMSVolume = useCallback(() => {
    if (!analyserRef.current) return 0;

    const dataArray = new Uint8Array(analyserRef.current.fftSize);
    analyserRef.current.getByteTimeDomainData(dataArray);

    let sumSquares = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const normalized = (dataArray[i] - 128) / 128;
      sumSquares += normalized * normalized;
    }

    return Math.sqrt(sumSquares / dataArray.length);
  }, []);

  /**
   * Triggers auto-stop from VAD silence detection.
   * Stops the recorder and invokes the onSilenceDetected callback.
   */
  const triggerAutoStop = useCallback(() => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      // Override the onstop handler to call the silence callback
      mediaRecorderRef.current.onstop = () => {
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);

        // Clean up stream tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        // Close audio context
        if (audioContextRef.current) {
          audioContextRef.current.close().catch(() => {});
          audioContextRef.current = null;
        }

        setIsRecording(false);
        setIsSpeechDetected(false);
        setAnalyser(null);
        analyserRef.current = null;
        isStoppingRef.current = false;

        // Resolve any pending stop promise
        if (resolveStopRef.current) {
          resolveStopRef.current(blob);
          resolveStopRef.current = null;
        }

        // Invoke the silence callback
        if (onSilenceDetectedRef.current && blob.size > 0) {
          onSilenceDetectedRef.current(blob);
        }
      };

      mediaRecorderRef.current.stop();
    } else {
      isStoppingRef.current = false;
    }
  }, []);

  /**
   * Starts the VAD monitoring loop.
   */
  const startVADMonitoring = useCallback(() => {
    speechStartedRef.current = false;
    silenceStartRef.current = null;
    setIsSpeechDetected(false);

    vadIntervalRef.current = setInterval(() => {
      if (!enableVADRef.current || !analyserRef.current) return;

      const volume = getRMSVolume();

      if (volume > VAD_CONFIG.SPEECH_THRESHOLD) {
        // Speech detected
        if (!speechStartedRef.current) {
          speechStartedRef.current = true;
          setIsSpeechDetected(true);
        }
        // Reset silence timer whenever speech is detected
        silenceStartRef.current = null;
      } else if (speechStartedRef.current) {
        // Silence detected after speech
        if (!silenceStartRef.current) {
          silenceStartRef.current = Date.now();
        } else {
          const silenceDuration = Date.now() - silenceStartRef.current;
          if (silenceDuration >= VAD_CONFIG.SILENCE_DURATION) {
            // Enough silence after speech — auto-stop
            clearInterval(vadIntervalRef.current);
            vadIntervalRef.current = null;
            triggerAutoStop();
          }
        }
      }
    }, VAD_CONFIG.POLL_INTERVAL);
  }, [getRMSVolume, triggerAutoStop]);

  /**
   * Stops VAD monitoring.
   */
  const stopVADMonitoring = useCallback(() => {
    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }
    speechStartedRef.current = false;
    silenceStartRef.current = null;
    setIsSpeechDetected(false);
  }, []);

  /**
   * Requests microphone permission and starts recording.
   */
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setAudioBlob(null);
      chunksRef.current = [];
      isStoppingRef.current = false;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      streamRef.current = stream;

      // Set up Web Audio API analyser for waveform visualization
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyserNode = audioCtx.createAnalyser();
      analyserNode.fftSize = 256;
      source.connect(analyserNode);
      audioContextRef.current = audioCtx;
      analyserRef.current = analyserNode;
      setAnalyser(analyserNode);

      // Determine supported MIME type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        if (resolveStopRef.current) {
          resolveStopRef.current(blob);
          resolveStopRef.current = null;
        }
      };

      recorder.start(250); // Collect data every 250ms
      setIsRecording(true);

      // Start VAD monitoring if enabled
      if (enableVADRef.current) {
        startVADMonitoring();
      }
    } catch (err) {
      const message =
        err.name === 'NotAllowedError'
          ? 'Microphone permission denied. Please allow microphone access.'
          : `Failed to start recording: ${err.message}`;
      setError(message);
      console.error('[Recorder]', err);
    }
  }, [startVADMonitoring]);

  /**
   * Stops recording and returns the audio blob.
   * @returns {Promise<Blob>}
   */
  const stopRecording = useCallback(() => {
    stopVADMonitoring();

    return new Promise((resolve) => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        resolveStopRef.current = resolve;
        mediaRecorderRef.current.stop();
      } else {
        resolve(null);
      }

      // Clean up stream tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      // Close audio context
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }

      setIsRecording(false);
      setIsSpeechDetected(false);
      setAnalyser(null);
      analyserRef.current = null;
    });
  }, [stopVADMonitoring]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopVADMonitoring();
    };
  }, [stopVADMonitoring]);

  return {
    isRecording,
    isSpeechDetected,
    startRecording,
    stopRecording,
    audioBlob,
    error,
    analyser,
  };
}
