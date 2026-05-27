// Server component
import React from 'react';

type PillColor = 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

interface PillProps {
  children: React.ReactNode;
  color?: PillColor;
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

const colorClasses: Record<PillColor, string> = {
  default: 'bg-carbon-surface2 text-carbon-ink2 border-carbon-hairline',
  accent: 'bg-blue-500/15 text-carbon-accent border-blue-500/30',
  success: 'bg-emerald-500/12 text-emerald-400 border-emerald-500/25',
  warning: 'bg-amber-500/12 text-amber-400 border-amber-500/25',
  danger: 'bg-red-500/12 text-red-400 border-red-500/25',
  info: 'bg-sky-500/12 text-sky-400 border-sky-500/25',
};

const dotColors: Record<PillColor, string> = {
  default: 'bg-carbon-muted',
  accent: 'bg-carbon-accent',
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  danger: 'bg-red-400',
  info: 'bg-sky-400',
};

const sizeClasses = {
  sm: 'h-5 px-2 text-[10px] gap-1',
  md: 'h-6 px-2.5 text-xs gap-1.5',
};

export function Pill({ children, color = 'default', size = 'md', dot = false, className = '' }: PillProps) {
  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${colorClasses[color]} ${sizeClasses[size]} ${className}`}
    >
      {dot && (
        <span
          className={`inline-block rounded-full shrink-0 ${dotColors[color]}`}
          style={{ width: size === 'sm' ? 5 : 6, height: size === 'sm' ? 5 : 6 }}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
