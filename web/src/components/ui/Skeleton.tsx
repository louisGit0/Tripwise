'use client';

import type { CSSProperties } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface SkeletonProps {
  /** Width — number → px, string → passed through (e.g. `'40%'`). */
  width?: number | string;
  /** Height — number → px, string → passed through. */
  height?: number | string;
  /** Tailwind radius class override. Default `rounded`. */
  rounded?: string;
  className?: string;
}

function toSize(value: number | string | undefined): string | undefined {
  if (value === undefined) return undefined;
  return typeof value === 'number' ? `${value}px` : value;
}

/**
 * Compositor-friendly loading placeholder: a `bg-carbon-surface2` block with
 * an opacity-based `animate-pulse`. The pulse is dropped under reduced motion.
 */
export function Skeleton({ width, height, rounded = 'rounded', className = '' }: SkeletonProps) {
  const reducedMotion = useReducedMotion();

  const style: CSSProperties = {
    width: toSize(width),
    height: toSize(height),
  };

  const pulse = reducedMotion ? '' : 'animate-pulse';

  return (
    <div
      aria-hidden="true"
      className={`bg-carbon-surface2 ${rounded} ${pulse} ${className}`}
      style={style}
    />
  );
}
