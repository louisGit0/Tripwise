import { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  useColorScheme,
  type DimensionValue,
  type ViewStyle,
} from 'react-native';
import { Colors } from '@/constants/theme';
import { useReducedMotion } from '@/src/hooks/useReducedMotion';

type DataBarHeight = 'sm' | 'md';

interface DataBarBaseProps {
  /** Track height: `sm` = 6px, `md` = 10px. Default `md`. */
  height?: DataBarHeight;
  style?: ViewStyle;
}

/**
 * Variant A — segmented breakdown bar (Énergie vs Péage).
 * One track, two flush adjacent fills: the energy segment (`energyFill`) sized
 * `energyValue / total`, then the toll segment (theme `toll`) sized
 * `tollValue / total`. The toll segment is hidden entirely when `tollValue <= 0`
 * (D-04 hide-when-0), leaving a single full-width energy bar.
 */
interface DataBarSegmentedProps extends DataBarBaseProps {
  energyValue: number;
  tollValue: number;
  /** Grand total the two segments are sized against. */
  total: number;
  /** Energy fill colour as an RN colour string, e.g. `c.ev` / `c.fuelGas`. */
  energyFill: string;
  value?: never;
  max?: never;
  fill?: never;
  muted?: never;
}

/**
 * Variant B — single comparison bar (one value against a max).
 * Non-current rows render muted (opacity 0.45); the current row at opacity 1.
 */
interface DataBarSingleProps extends DataBarBaseProps {
  value: number;
  max: number;
  /** Fill colour as an RN colour string, e.g. `c.fuelDie`. */
  fill: string;
  muted?: boolean;
  energyValue?: never;
  tollValue?: never;
  total?: never;
  energyFill?: never;
}

export type DataBarProps = DataBarSegmentedProps | DataBarSingleProps;

const HEIGHTS: Record<DataBarHeight, number> = { sm: 6, md: 10 };
const REVEAL_DURATION_MS = 600;

/** Clamp a part/whole ratio to a 0–100 percentage, guarding zero/NaN totals. */
function pct(part: number, whole: number): number {
  if (!whole || whole <= 0) return 0;
  const ratio = (part / whole) * 100;
  if (Number.isNaN(ratio)) return 0;
  return Math.max(0, Math.min(100, ratio));
}

/** Build a typed RN percentage width from a part/whole ratio. */
function widthPct(part: number, whole: number): DimensionValue {
  return `${pct(part, whole)}%` as DimensionValue;
}

export function DataBar(props: DataBarProps) {
  const { height = 'md', style } = props;
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme];
  const reduced = useReducedMotion();

  // Mount reveal: fade the fills in (opacity is compositor-friendly and keeps
  // layout stable — the widths are final on first paint). Skipped under reduced
  // motion (fills are opaque immediately).
  const reveal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) {
      reveal.setValue(1);
      return;
    }
    reveal.setValue(0);
    const animation = Animated.timing(reveal, {
      toValue: 1,
      duration: REVEAL_DURATION_MS,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [reduced, reveal]);

  const trackStyle = [
    styles.track,
    { height: HEIGHTS[height], backgroundColor: c.surface2 },
    style,
  ];

  // Variant A — segmented Énergie/Péage breakdown bar.
  if ('energyValue' in props && props.energyValue !== undefined) {
    const showToll = props.tollValue > 0;
    return (
      <View style={trackStyle}>
        <View style={styles.row}>
          <Animated.View
            style={[
              styles.segment,
              { width: widthPct(props.energyValue, props.total), backgroundColor: props.energyFill },
              { opacity: reveal },
            ]}
          />
          {showToll && (
            <Animated.View
              style={[
                styles.segment,
                { width: widthPct(props.tollValue, props.total), backgroundColor: c.toll },
                { opacity: reveal },
              ]}
            />
          )}
        </View>
      </View>
    );
  }

  // Variant B — single comparison bar.
  return (
    <View style={trackStyle}>
      <Animated.View
        style={[
          styles.singleFill,
          {
            width: widthPct(props.value, props.max),
            backgroundColor: props.fill,
          },
          { opacity: Animated.multiply(reveal, props.muted ? 0.45 : 1) },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    borderRadius: 9999,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    height: '100%',
    width: '100%',
  },
  segment: {
    height: '100%',
  },
  singleFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    height: '100%',
    borderRadius: 9999,
  },
});
