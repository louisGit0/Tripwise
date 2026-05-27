'use client';

import React from 'react';

interface Segment<T extends string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface SegmentedControlProps<T extends string> {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  className?: string;
}

const sizeClasses = {
  sm: { wrap: 'p-0.5 gap-0.5', seg: 'h-7 px-3 text-xs rounded-lg' },
  md: { wrap: 'p-1 gap-0.5', seg: 'h-8 px-3.5 text-sm rounded-xl' },
};

export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  size = 'md',
  className = '',
}: SegmentedControlProps<T>) {
  const cls = sizeClasses[size];

  return (
    <div
      role="group"
      className={`inline-flex ${cls.wrap} rounded-xl bg-carbon-surface2 border border-carbon-hairline ${className}`}
    >
      {segments.map((seg) => {
        const isActive = seg.value === value;
        return (
          <button
            key={seg.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={seg.disabled}
            onClick={() => !seg.disabled && onChange(seg.value)}
            className={[
              `inline-flex items-center justify-center gap-1.5 font-medium transition-all`,
              cls.seg,
              isActive
                ? 'bg-carbon-accent text-white shadow-sm'
                : 'text-carbon-muted hover:text-carbon-ink2 disabled:opacity-40 disabled:cursor-not-allowed',
            ].join(' ')}
          >
            {seg.icon && (
              <span className="shrink-0" aria-hidden="true">
                {seg.icon}
              </span>
            )}
            {seg.label}
          </button>
        );
      })}
    </div>
  );
}
