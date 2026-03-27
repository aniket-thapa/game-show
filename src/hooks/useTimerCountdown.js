// src/hooks/useTimerCountdown.js
import { useState, useEffect, useRef } from 'react';

/**
 * Derives remaining seconds from server-driven timer state using RAF.
 * Clock-skew-tolerant: uses timerStartedAt (server timestamp) + local Date.now().
 *
 * @param {boolean}     timerActive     Is the timer currently running?
 * @param {number|null} timerStartedAt  Server Unix ms timestamp when timer started
 * @param {number}      timerDuration   Total ms (default 15000)
 * @returns {number} Remaining whole seconds (0 … ceil(timerDuration/1000))
 */
export function useTimerCountdown(
  timerActive,
  timerStartedAt,
  timerDuration = 15000,
) {
  const totalSeconds = Math.ceil(timerDuration / 1000);
  const [timeLeft, setTimeLeft] = useState(totalSeconds);
  const rafRef = useRef(null);

  useEffect(() => {
    // Cancel any running frame first
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (!timerActive || !timerStartedAt) {
      setTimeLeft(totalSeconds);
      return;
    }

    const tick = () => {
      const elapsed = Date.now() - timerStartedAt;
      const remainingMs = Math.max(0, timerDuration - elapsed);
      setTimeLeft(Math.ceil(remainingMs / 1000));

      if (remainingMs > 0) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [timerActive, timerStartedAt, timerDuration, totalSeconds]);

  return timeLeft;
}
