/**
 * @module InterviewPage
 * @description Main interview page with hands-free recording mode.
 * After the AI finishes speaking, the mic auto-activates with Voice Activity
 * Detection (VAD). Speech is auto-detected and the recording auto-submits
 * after a silence threshold. The manual mic button is still available as override.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInterview, Status } from '../context/InterviewContext';
import { sendResponseStream, endInterview } from '../services/api';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { useTimer } from '../hooks/useTimer';
import Header from '../components/Header';
import MicrophoneButton from '../components/MicrophoneButton';
import WaveformVisualizer from '../components/WaveformVisualizer';
import ProgressBar from '../components/ProgressBar';

export default function InterviewPage() {
  const navigate = useNavigate();
  const { state, dispatch } = useInterview();
  const { isPlaying, playAudio, enqueueChunk, clearQueue } = useAudioPlayer();
  const { formatted: timerFormatted, startTimer, stopTimer } = useTimer();

  // Hands-free mode state
  const [handsFreeModeEnabled] = useState(true);
  const [isAutoListening, setIsAutoListening] = useState(false);
  const autoRecordPendingRef = useRef(false);
  const hasSubmittedRef = useRef(false);

  /**
   * Handles auto-submission when silence is detected by VAD.
   */
  const handleSilenceDetected = useCallback(async (blob) => {
    if (!blob || blob.size === 0 || hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
    setIsAutoListening(false);

    dispatch({ type: 'SET_PROCESSING', payload: true });

    try {
      await sendResponseStream(
        state.interviewId,
        blob,
        // onChunk: play each TTS sentence as soon as it arrives
        (chunk) => {
          if (chunk.audio) enqueueChunk(chunk.audio);
        },
        // onDone: update state with full result
        (data) => {
          if (data.isComplete) {
            dispatch({ type: 'INTERVIEW_COMPLETE', payload: data });
          } else {
            dispatch({ type: 'RESPONSE_RECEIVED', payload: data });
          }
        },
      );
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message });
    }
  }, [state.interviewId, dispatch, enqueueChunk]);

  const {
    isRecording,
    isSpeechDetected,
    startRecording,
    stopRecording,
    analyser,
    error: recorderError,
  } = useAudioRecorder({
    onSilenceDetected: handleSilenceDetected,
    enableVAD: handsFreeModeEnabled,
  });

  // Redirect if no interview is active
  useEffect(() => {
    if (!state.interviewId) {
      navigate('/');
    }
  }, [state.interviewId, navigate]);

  // Start timer when interview begins
  useEffect(() => {
    if (state.interviewId) {
      startTimer();
    }
    return () => stopTimer();
  }, [state.interviewId, startTimer, stopTimer]);

  // Auto-play interviewer audio when received
  useEffect(() => {
    if (state.aiAudio && !isPlaying) {
      playAudio(state.aiAudio);
    }
  }, [state.aiAudio]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Auto-start recording after AI finishes speaking (hands-free mode).
   * Tracks the transition of isPlaying from true → false.
   */
  const wasPlayingRef = useRef(false);

  useEffect(() => {
    if (isPlaying) {
      wasPlayingRef.current = true;
      autoRecordPendingRef.current = true;
    }

    if (wasPlayingRef.current && !isPlaying && autoRecordPendingRef.current) {
      wasPlayingRef.current = false;
      autoRecordPendingRef.current = false;

      // Only auto-start if in hands-free mode, not already recording,
      // not processing, and interview is still active
      if (
        handsFreeModeEnabled &&
        !isRecording &&
        !state.isProcessing &&
        state.status !== Status.PROCESSING &&
        state.status !== Status.FEEDBACK_LOADING &&
        state.status !== Status.ERROR &&
        !state.completed
      ) {
        // Small delay to let audio cleanup finish
        const timer = setTimeout(async () => {
          hasSubmittedRef.current = false;
          setIsAutoListening(true);
          await startRecording();
        }, 600);

        return () => clearTimeout(timer);
      }
    }
  }, [isPlaying, handsFreeModeEnabled, isRecording, state.isProcessing, state.status, state.completed, startRecording]);

  /**
   * Handles the microphone button toggle — manual start or stop recording.
   */
  const handleMicToggle = useCallback(async () => {
    if (isRecording) {
      // Manual stop
      setIsAutoListening(false);
      const blob = await stopRecording();
      if (!blob || blob.size === 0) return;

      hasSubmittedRef.current = true;
      dispatch({ type: 'SET_PROCESSING', payload: true });

      try {
        await sendResponseStream(
          state.interviewId,
          blob,
          (chunk) => {
            if (chunk.audio) enqueueChunk(chunk.audio);
          },
          (data) => {
            if (data.isComplete) {
              dispatch({ type: 'INTERVIEW_COMPLETE', payload: data });
            } else {
              dispatch({ type: 'RESPONSE_RECEIVED', payload: data });
            }
          },
        );
      } catch (err) {
        dispatch({ type: 'SET_ERROR', payload: err.message });
      }
    } else {
      // Manual start
      hasSubmittedRef.current = false;
      dispatch({ type: 'SET_RECORDING', payload: true });
      setIsAutoListening(false);
      await startRecording();
    }
  }, [isRecording, stopRecording, startRecording, state.interviewId, dispatch, enqueueChunk]);

  /**
   * Ends the interview and navigates to feedback.
   */
  const handleEndInterview = useCallback(async () => {
    // Stop any active recording and audio queue first
    if (isRecording) {
      setIsAutoListening(false);
      await stopRecording();
    }
    clearQueue();

    dispatch({ type: 'LOADING_FEEDBACK' });
    stopTimer();

    try {
      const report = await endInterview(state.interviewId);
      dispatch({ type: 'FEEDBACK_RECEIVED', payload: report });
      navigate('/feedback');
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message });
    }
  }, [state.interviewId, dispatch, navigate, stopTimer, isRecording, stopRecording, clearQueue]);

  const isProcessing = state.isProcessing || state.status === Status.PROCESSING;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header showTimer timer={timerFormatted} />

      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          maxWidth: '800px',
          width: '100%',
          margin: '0 auto',
          padding: '1.5rem',
          gap: '1.5rem',
        }}
      >
        {/* Progress */}
        <ProgressBar current={state.questionNumber} total={state.totalQuestions} />

        {/* AI Response Card */}
        <div
          className="glass-card"
          style={{ padding: '1.5rem', minHeight: '120px' }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.75rem',
            }}
          >
            <div
              style={{
                width: '2rem',
                height: '2rem',
                borderRadius: '50%',
                background: 'var(--gradient-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.85rem',
              }}
            >
              🤖
            </div>
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>AI Interviewer</span>
            {isPlaying && (
              <span
                style={{
                  fontSize: '0.7rem',
                  color: 'var(--color-accent)',
                  background: 'rgba(6, 182, 212, 0.1)',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '9999px',
                }}
              >
                🔊 Speaking
              </span>
            )}
          </div>
          <p
            style={{
              color: 'var(--color-text)',
              lineHeight: 1.7,
              fontSize: '1.05rem',
            }}
          >
            {state.aiReply || 'Preparing your interview...'}
          </p>
        </div>

        {/* Microphone Section */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.5rem',
            padding: '2rem 0',
          }}
        >
          <WaveformVisualizer isActive={isRecording} analyser={analyser} />

          <MicrophoneButton
            isRecording={isRecording}
            isProcessing={isProcessing}
            isListening={isAutoListening}
            isSpeechDetected={isSpeechDetected}
            onClick={handleMicToggle}
            disabled={isPlaying || state.status === Status.FEEDBACK_LOADING}
          />

          {/* Hands-free status indicator */}
          {handsFreeModeEnabled && !isProcessing && !isPlaying && (
            <p
              style={{
                fontSize: '0.75rem',
                color: 'var(--color-text-muted)',
                opacity: 0.7,
                textAlign: 'center',
                marginTop: '0.5rem',
              }}
            >
              🎙️ Hands-free mode · Auto-records after AI speaks
            </p>
          )}
        </div>

        {/* Recorder Error */}
        {recorderError && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '0.5rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--color-danger)',
              fontSize: '0.85rem',
              textAlign: 'center',
            }}
          >
            {recorderError}
          </div>
        )}

        {/* Transcript */}
        {state.transcript && (
          <div
            className="glass-card animate-fade-in-up"
            style={{ padding: '1.25rem' }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.5rem',
              }}
            >
              <div
                style={{
                  width: '2rem',
                  height: '2rem',
                  borderRadius: '50%',
                  background: 'var(--color-surface-lighter)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                }}
              >
                👤
              </div>
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Your Response</span>
            </div>
            <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.6, fontSize: '0.95rem' }}>
              "{state.transcript}"
            </p>
          </div>
        )}

        {/* Error Display */}
        {state.status === Status.ERROR && state.error && (
          <div
            className="glass-card"
            style={{
              padding: '1.25rem',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              textAlign: 'center',
            }}
          >
            <p style={{ color: 'var(--color-danger)', marginBottom: '0.75rem' }}>
              ⚠️ {state.error}
            </p>
            <button
              className="btn-secondary"
              onClick={() => dispatch({ type: 'SET_ERROR', payload: null })}
              style={{ fontSize: '0.85rem' }}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* End Interview Button */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: '2rem' }}>
          <button
            className="btn-danger"
            onClick={handleEndInterview}
            disabled={state.status === Status.FEEDBACK_LOADING}
            id="end-interview-btn"
          >
            {state.status === Status.FEEDBACK_LOADING ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div className="spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }} />
                Generating Report...
              </span>
            ) : (
              '🏁 End Interview'
            )}
          </button>
        </div>
      </main>
    </div>
  );
}
