// Server component
import React from 'react';

interface KPICellProps {
  label: string;
  value: React.ReactNode;
  unit?: string;
  delta?: number; // positive = up, negative = down
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const valueSize = {
  sm: 'text-xl font-bold tracking-display',
  md: 'text-3xl font-bold tracking-display',
  lg: 'text-5xl font-bold tracking-display-lg',
};

export function KPICell({ label, value, unit, delta, size = 'md', className = '' }: KPICellProps) {
  const isUp = delta !== undefined && delta > 0;
  const isDown = delta !== undefined && delta < 0;

  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      <span className="text-[10px] font-semibold tracking-eye-wide uppercase text-carbon-muted">
        {label}
      </span>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-carbon-ink ${valueSize[size]}`}>{value}</span>
        {unit && (
          <span className="text-sm font-medium text-carbon-muted">{unit}</span>
        )}
      </div>
      {delta !== undefined && (
        <span
          className={`text-[11px] font-medium tabular-nums ${
            isUp ? 'text-emerald-400' : isDown ? 'text-red-400' : 'text-carbon-muted'
          }`}
        >
          {isUp && '↑'}
          {isDown && '↓'}
          {Math.abs(delta).toFixed(1)}%
        </span>
      )}
    </div>
  );
}
