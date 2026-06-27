/**
 * @module WaveformVisualizer
 * @description CSS-animated waveform bars shown during recording.
 * Uses the AnalyserNode if available for real-time data, otherwise
 * falls back to CSS-only animation.
 */

import { useEffect, useRef } from 'react';

const BAR_COUNT = 12;

export default function WaveformVisualizer({ isActive, analyser }) {
  const barsRef = useRef([]);

  useEffect(() => {
    if (!isActive || !analyser) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let animationId;

    const animate = () => {
      analyser.getByteFrequencyData(dataArray);

      barsRef.current.forEach((bar, i) => {
        if (!bar) return;
        const dataIndex = Math.floor((i / BAR_COUNT) * dataArray.length);
        const value = dataArray[dataIndex] / 255;
        const scale = 0.15 + value * 0.85;
        bar.style.transform = `scaleY(${scale})`;
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [isActive, analyser]);

  if (!isActive) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '3rem',
        gap: '3px',
      }}
      aria-label="Audio waveform visualization"
    >
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <div
          key={i}
          ref={(el) => { barsRef.current[i] = el; }}
          className={analyser ? '' : 'waveform-bar'}
          style={{
            width: '4px',
            height: '100%',
            borderRadius: '4px',
            background: 'var(--gradient-primary)',
            transition: analyser ? 'transform 0.05s ease' : 'none',
            transformOrigin: 'center',
          }}
        />
      ))}
    </div>
  );
}
