'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type DataBarHeight = 'sm' | 'md';

/** One flush fill segment of a segmented (Variant A) bar. */
export interface DataBarSegment {
  /** Raw value sized against `total` (e.g. energyCost or tollCost). */
  value: number;
  /** Fill color as a CSS-var string, e.g. `var(--c-ev)` or `var(--c-toll)`. */
  fillVar: string;
}

interface DataBarBaseProps {
  /** Bar height: `sm` = 6px (h-1.5), `md` = 10px (h-2.5). Default `md`. */
  height?: DataBarHeight;
  className?: string;
}

/** Variant B — single comparison bar (one value against a max). */
interface DataBarSingleProps extends DataBarBaseProps {
  value: number;
  max: number;
  /** Energy fill color as a CSS-var string, e.g. `var(--c-fuel-gas)`. */
  fillVar: string;
  /** Non-current rows render at opacity 0.45; current at opacity 1. */
  muted?: boolean;
  segments?: never;
  total?: never;
}

/** Variant A — segmented breakdown bar (e.g. Énergie vs Péage). */
interface DataBarSegmentedProps extends DataBarBaseProps {
  /** Flush adjacent fills, rendered left→right. */
  segments: DataBarSegment[];
  /** Grand total the segments are sized against. */
  total: number;
  value?: never;
  max?: never;
  fillVar?: never;
  muted?: never;
}

export type DataBarProps = DataBarSingleProps | DataBarSegmentedProps;

const heightMap: Record<DataBarHeight, string> = {
  sm: 'h-1.5',
  md: 'h-2.5',
};

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

  // First paint renders scaleX(0); after mount we flip to scaleX(1) so the
  // CSS transition fires. Under reduced motion the fill is final immediately.
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

  // Variant A — segmented breakdown bar.
  if ('segments' in props && props.segments) {
    return (
      <div className={trackClass}>
        <div className="flex h-full w-full">
          {props.segments.map((segment, index) => (
            <div
              key={index}
              className="h-full"
              style={{
                width: `${pct(segment.value, props.total)}%`,
                background: segment.fillVar,
                ...fillReveal(),
              }}
            />
          ))}
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
