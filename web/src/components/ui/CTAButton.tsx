'use client';

import { LoaderCircle } from 'lucide-react';
import React from 'react';

type Variant = 'accent' | 'surface' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface CTAButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: boolean;
}

const variantClasses: Record<Variant, string> = {
  // accent colour ≈ blue-500 (#4d8bff) — using concrete class so /opacity works
  accent:
    'bg-carbon-accent text-white hover:brightness-110 active:brightness-90 focus-visible:ring-blue-500/50',
  surface:
    'bg-carbon-surface2 text-carbon-ink border border-carbon-hairline hover:bg-carbon-faint active:bg-carbon-hairline focus-visible:ring-blue-500/30',
  ghost:
    'text-carbon-ink2 hover:text-carbon-ink hover:bg-carbon-faint active:bg-carbon-hairline focus-visible:ring-blue-500/30',
  danger:
    'bg-red-600 text-white hover:bg-red-500 active:bg-red-700 focus-visible:ring-red-500/40',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs rounded-lg gap-1.5',
  md: 'h-9 px-4 text-sm rounded-xl gap-2',
  lg: 'h-11 px-5 text-sm rounded-xl gap-2',
};

export function CTAButton({
  variant = 'accent',
  size = 'md',
  loading = false,
  icon,
  iconRight = false,
  disabled,
  children,
  className = '',
  ...props
}: CTAButtonProps) {
  const isDisabled = disabled || loading;
  const leadIcon = !iconRight && (loading ? <LoaderCircle size={14} className="animate-spin" /> : icon);
  const trailIcon = iconRight && !loading ? icon : null;

  return (
    <button
      disabled={isDisabled}
      className={[
        'inline-flex items-center justify-center font-medium transition-all',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-carbon-bg',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(' ')}
      {...props}
    >
      {leadIcon}
      {children}
      {trailIcon}
    </button>
  );
}
