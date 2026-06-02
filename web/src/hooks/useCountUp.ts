import { useState, useEffect } from 'react';
import { useReducedMotion } from './useReducedMotion';

const DEFAULT_DURATION_MS = 700;

// easeOutCubic — fast start, gentle settle on the target.
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Animates a numeric value from 0 to `target` over `durationMs` using an
 * easeOutCubic curve driven by `requestAnimationFrame`.
 *
 * - Re-runs from 0 whenever `target` (or `durationMs`) changes.
 * - Honours `prefers-reduced-motion`: resolves straight to `target` with no rAF loop.
 * - Cancels any in-flight frame on unmount / target change (no leaked frames).
 *
 * Returns the raw numeric value; formatting (decimals, locale) is the caller's job.
 */
export function useCountUp(target: number, durationMs: number = DEFAULT_DURATION_MS): number {
  const reducedMotion = useReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (reducedMotion || durationMs <= 0) {
      setValue(target);
      return;
    }

    let rafId: number;
    let startTime: number | null = null;

    const tick = (now: number): void => {
      if (startTime === null) {
        startTime = now;
      }

      const elapsed = now - startTime;
      const t = Math.min(elapsed / durationMs, 1);
      setValue(target * easeOutCubic(t));

      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        setValue(target);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [target, durationMs, reducedMotion]);

  return value;
}
