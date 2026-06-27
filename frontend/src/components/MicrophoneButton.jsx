/**
 * @module MicrophoneButton
 * @description Animated microphone button with four visual states:
 *   - idle: Ready to record
 *   - listening: Auto-mode, mic open waiting for speech (green glow)
 *   - recording: Active speech detected (pulsing red)
 *   - processing: Spinner
 */

export default function MicrophoneButton({
  isRecording,
  isProcessing,
  isListening,
  isSpeechDetected,
  onClick,
  disabled,
}) {
  // Determine visual mode
  const isAutoListening = isListening && !isSpeechDetected;
  const isActiveSpeech = isRecording && isSpeechDetected;

  const getButtonStyle = () => {
    const base = {
      position: 'relative',
      width: '7rem',
      height: '7rem',
      borderRadius: '50%',
      border: 'none',
      cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.3s ease',
      outline: 'none',
    };

    if (isProcessing) {
      return {
        ...base,
        background: 'var(--color-surface-lighter)',
        opacity: 0.7,
      };
    }

    if (isActiveSpeech || (isRecording && !isListening)) {
      // Active speech or manual recording — red
      return {
        ...base,
        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        boxShadow: '0 0 40px rgba(239, 68, 68, 0.4)',
      };
    }

    if (isAutoListening) {
      // Listening in auto-mode — green glow
      return {
        ...base,
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        boxShadow: '0 0 40px rgba(16, 185, 129, 0.35)',
      };
    }

    if (isRecording) {
      // Fallback recording state
      return {
        ...base,
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        boxShadow: '0 0 40px rgba(16, 185, 129, 0.35)',
      };
    }

    return {
      ...base,
      background: 'var(--gradient-primary)',
      boxShadow: '0 8px 30px rgba(99, 102, 241, 0.3)',
    };
  };

  const getPulseColor = () => {
    if (isActiveSpeech || (isRecording && !isListening)) {
      return 'rgba(239, 68, 68, 0.4)';
    }
    if (isAutoListening || isRecording) {
      return 'rgba(16, 185, 129, 0.3)';
    }
    return 'rgba(99, 102, 241, 0.3)';
  };

  const getLabel = () => {
    if (isProcessing) return 'Processing...';
    if (isActiveSpeech) return 'Hearing you...';
    if (isAutoListening) return 'Listening...';
    if (isRecording) return 'Tap to stop';
    return 'Tap to speak';
  };

  const showPulse = isRecording || isAutoListening;
  const pulseColor = getPulseColor();

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Pulse rings */}
      {showPulse && (
        <>
          <div
            className="mic-pulse-ring"
            style={{
              position: 'absolute',
              width: '7rem',
              height: '7rem',
              borderRadius: '50%',
              border: `3px solid ${pulseColor}`,
            }}
          />
          <div
            className="mic-pulse-ring"
            style={{
              position: 'absolute',
              width: '7rem',
              height: '7rem',
              borderRadius: '50%',
              border: `3px solid ${pulseColor}`,
              animationDelay: '0.4s',
            }}
          />
        </>
      )}

      <button
        onClick={onClick}
        disabled={disabled || isProcessing}
        style={getButtonStyle()}
        className={showPulse ? 'mic-pulse-dot' : ''}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        id="mic-button"
      >
        {isProcessing ? (
          <div className="spinner" />
        ) : (
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {isActiveSpeech || (isRecording && !isListening) ? (
              /* Stop icon (square) */
              <rect x="6" y="6" width="12" height="12" rx="2" fill="white" />
            ) : (
              /* Microphone icon */
              <>
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" fill="white" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </>
            )}
          </svg>
        )}
      </button>

      {/* Label */}
      <p
        style={{
          position: 'absolute',
          bottom: '-2rem',
          fontSize: '0.85rem',
          color: 'var(--color-text-muted)',
          whiteSpace: 'nowrap',
        }}
      >
        {getLabel()}
      </p>
    </div>
  );
}
