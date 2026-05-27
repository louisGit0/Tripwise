'use client';

import { useId } from 'react';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
  strokeWidth?: number;
  className?: string;
}

function buildPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ');
}

export function Sparkline({
  data,
  width = 80,
  height = 28,
  color = 'var(--c-accent)',
  fill = true,
  strokeWidth = 1.5,
  className = '',
}: SparklineProps) {
  const reactId = useId();
  const uid = `sparkfill-${reactId.replace(/:/g, '')}`;

  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = strokeWidth;

  const points = data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * (width - pad * 2),
    y: (height - pad) - ((v - min) / range) * (height - pad * 2),
  }));

  const linePath = buildPath(points);
  const fillPath =
    fill && linePath
      ? `${linePath} L ${points[points.length - 1].x.toFixed(2)} ${(height - pad).toFixed(2)} L ${points[0].x.toFixed(2)} ${(height - pad).toFixed(2)} Z`
      : '';

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {fill && (
        <defs>
          <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
      )}
      {fill && fillPath && (
        <path d={fillPath} fill={`url(#${uid})`} />
      )}
      <path
        d={linePath}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
