/**
 * @module useTimer
 * @description Custom hook for an interview elapsed-time timer.
 * Provides start, stop, and formatted time display.
 */

import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * @returns {{
 *   elapsed: number,
 *   formatted: string,
 *   isRunning: boolean,
 *   startTimer: () => void,
 *   stopTimer: () => void,
 *   resetTimer: () => void,
 * }}
 */
export function useTimer() {
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef(null);
  const startRef = useRef(null);

  const startTimer = useCallback(() => {
    if (intervalRef.current) return; // Already running

    startRef.current = Date.now() - elapsed * 1000;
    setIsRunning(true);

    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
  }, [elapsed]);

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
  }, []);

  const resetTimer = useCallback(() => {
    stopTimer();
    setElapsed(0);
  }, [stopTimer]);

  /**
   * Formats elapsed seconds as MM:SS.
   * @param {number} secs
   * @returns {string}
   */
  const format = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    elapsed,
    formatted: format(elapsed),
    isRunning,
    startTimer,
    stopTimer,
    resetTimer,
  };
}
