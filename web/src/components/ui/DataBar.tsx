'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type DataBarHeight = 'sm' | 'md';

interface DataBarBaseProps {
  /** Bar height: `sm` = 6px (h-1.5), `md` = 10px (h-2.5). Default `md`. */
  height?: DataBarHeight;
  className?: string;
}

/**
 * Variant A — segmented breakdown bar (Énergie vs Péage).
 * One track, two flush adjacent fills: the energy segment (`energyFillVar`)
 * sized `energyValue / total`, then the toll segment (`var(--c-toll)`) sized
 * `tollValue / total`. The toll segment is hidden entirely when `tollValue === 0`
 * (D-04 hide-when-0), leaving a single full-width energy bar.
 */
interface DataBarSegmentedProps extends DataBarBaseProps {
  energyValue: number;
  tollValue: number;
  /** Grand total the two segments are sized against. */
  total: number;
  /** Energy fill color as a CSS-var string, e.g. `var(--c-ev)` / `var(--c-fuel-gas)`. */
  energyFillVar: string;
  value?: never;
  max?: never;
  fillVar?: never;
  muted?: never;
}

/**
 * Variant B — single comparison bar (one value against a max).
 * Non-current rows render muted (opacity 0.45); the current row at opacity 1.
 */
interface DataBarSingleProps extends DataBarBaseProps {
  value: number;
  max: number;
  /** Fill color as a CSS-var string, e.g. `var(--c-fuel-die)`. */
  fillVar: string;
  muted?: boolean;
  energyValue?: never;
  tollValue?: never;
  total?: never;
  energyFillVar?: never;
}

export type DataBarProps = DataBarSegmentedProps | DataBarSingleProps;

const heightMap: Record<DataBarHeight, string> = {
  sm: 'h-1.5',
  md: 'h-2.5',
};

const TOLL_FILL = 'var(--c-toll)';
const REVEAL_TRANSITION = 'transform 600ms cubic-bezier(0.16,1,0.3,1)';

function pct(part: number, whole: number): number {
  if (!whole || whole <= 0) return 0;
  const ratio = (part / whole) * 100;
  if (Number.isNaN(ratio)) return 0;
  return Math.max(0, Math.min(100, ratio));
}

export function DataBar(props: DataBarProps) {
  const { height = 'md', className = '' } = props;
  const reducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  // First paint renders scaleX(0); after mount we flip to scaleX(1) so the CSS
  // transition fires. Under reduced motion the fill is final immediately.
  useEffect(() => {
    setMounted(true);
  }, []);

  const revealed = reducedMotion || mounted;
  const fillReveal = (): CSSProperties => ({
    transform: revealed ? 'scaleX(1)' : 'scaleX(0)',
    transformOrigin: 'left',
    transition: reducedMotion ? 'none' : REVEAL_TRANSITION,
  });

  const trackClass = `relative w-full ${heightMap[height]} bg-carbon-surface2 rounded-full overflow-hidden ${className}`;

  // Variant A — segmented Énergie/Péage breakdown bar.
  if ('energyValue' in props && props.energyValue !== undefined) {
    const showToll = props.tollValue > 0;
    return (
      <div className={trackClass}>
        <div className="flex h-full w-full">
          <div
            className="h-full"
            style={{
              width: `${pct(props.energyValue, props.total)}%`,
              background: props.energyFillVar,
              ...fillReveal(),
            }}
          />
          {showToll && (
            <div
              className="h-full"
              style={{
                width: `${pct(props.tollValue, props.total)}%`,
                background: TOLL_FILL,
                ...fillReveal(),
              }}
            />
          )}
        </div>
      </div>
    );
  }

  // Variant B — single comparison bar.
  return (
    <div className={trackClass}>
      <div
        className="absolute inset-y-0 left-0 h-full rounded-full"
        style={{
          width: `${pct(props.value, props.max)}%`,
          background: props.fillVar,
          opacity: props.muted ? 0.45 : 1,
          ...fillReveal(),
        }}
      />
    </div>
  );
}
