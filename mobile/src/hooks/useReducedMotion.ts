import { useState, useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * RN equivalent of the web `useReducedMotion` hook (PD5-3).
 *
 * Reads the live OS "Reduce Motion" accessibility setting via
 * `AccessibilityInfo.isReduceMotionEnabled()` and re-renders whenever it
 * changes (the `reduceMotionChanged` subscription). Returns `false` until the
 * initial async read resolves — mirroring the web hook's first-paint default —
 * then reflects the live boolean.
 *
 * The `reduceMotionChanged` subscription is cleaned up on unmount via the
 * subscription object's `.remove()` (RN 0.65+ contract; no `removeEventListener`).
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let isMounted = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (isMounted) setReduced(value);
      })
      .catch(() => {
        // Treat an unavailable accessibility query as "no reduction".
        if (isMounted) setReduced(false);
      });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduced,
    );

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  return reduced;
}
