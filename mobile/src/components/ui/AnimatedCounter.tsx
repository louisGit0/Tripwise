import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  useColorScheme,
  type TextStyle,
} from 'react-native';
import { Colors, Fonts } from '@/constants/theme';
import { useReducedMotion } from '@/src/hooks/useReducedMotion';

const DEFAULT_DURATION_MS = 700;

interface AnimatedCounterProps {
  /** Final numeric value the counter tweens to (from 0). */
  value: number;
  /** Extra text styles (size / color overrides) merged over the mono base. */
  style?: TextStyle;
  /** Tween duration in ms (default 700, mirrors the web useCountUp). */
  durationMs?: number;
}

/** FR formatting: fixed 2 decimals, comma decimal separator. */
function formatFr(n: number): string {
  return n.toFixed(2).replace('.', ',');
}

/**
 * Animated cost counter (PD5-3) — RN mirror of the web `useCountUp` figure.
 *
 * Tweens a displayed number 0 -> `value` over ~700ms with an easeOutCubic curve
 * driven by `Animated.timing` (JS-driven `Animated.Value` + listener, so the
 * `useNativeDriver: false` value is readable on the JS thread for formatting).
 * Re-runs from 0 whenever `value` changes. Under reduced motion it resolves to
 * the final value INSTANTLY with no animation. Only the value/opacity-style
 * numeric is touched — no layout-bound props animate (compositor-friendly).
 *
 * The `Animated.Value` listener and the running animation are both torn down on
 * unmount / value change, so no frames leak (mitigates T-05-03-01).
 */
export function AnimatedCounter({
  value,
  style,
  durationMs = DEFAULT_DURATION_MS,
}: AnimatedCounterProps) {
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme];
  const reduced = useReducedMotion();

  const av = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    // Reduced motion (or zero duration): jump straight to the final value.
    if (reduced || durationMs <= 0) {
      av.stopAnimation();
      av.setValue(value);
      setDisplay(value);
      return;
    }

    av.setValue(0);
    setDisplay(0);

    const listenerId = av.addListener(({ value: v }) => setDisplay(v));
    const animation = Animated.timing(av, {
      toValue: value,
      duration: durationMs,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start();

    return () => {
      animation.stop();
      av.removeListener(listenerId);
    };
  }, [value, durationMs, reduced, av]);

  return <Text style={[styles.counter, { color: c.ink }, style]}>{formatFr(display)}</Text>;
}

const styles = StyleSheet.create({
  counter: {
    // JetBrains Mono 700 — tabular, monospaced numerics.
    fontFamily: Fonts.mono,
    fontWeight: '700',
  },
});
