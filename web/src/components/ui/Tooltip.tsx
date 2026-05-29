'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';

interface TooltipProps {
  children: ReactNode;
  content: ReactNode;
  className?: string;
}

/**
 * Lightweight Carbon-token tooltip atom.
 * Reveals on hover (desktop), keyboard focus, and tap (touch) — D-02.
 */
export function Tooltip({ children, content, className = '' }: TooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className={`relative inline-flex group ${className}`}
      tabIndex={0}
      onClick={() => setOpen((v) => !v)}
      onBlur={() => setOpen(false)}
    >
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 w-max max-w-[200px] -translate-x-1/2 rounded-lg border border-carbon-hairline bg-carbon-surface2 px-2.5 py-1.5 text-[11px] leading-snug text-carbon-ink2 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 ${open ? 'opacity-100' : 'opacity-0'}`}
      >
        {content}
      </span>
    </span>
  );
}
