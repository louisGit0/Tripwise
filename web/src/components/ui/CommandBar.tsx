'use client';

import { Search, X } from 'lucide-react';
import React, { useEffect, useRef } from 'react';

interface CommandBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  escAction?: () => void;
  autoFocus?: boolean;
  className?: string;
}

export function CommandBar({
  value,
  onChange,
  placeholder = 'Rechercher...',
  escAction,
  autoFocus = false,
  className = '',
}: CommandBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    if (!escAction) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') escAction?.();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [escAction]);

  function handleClear() {
    onChange('');
    inputRef.current?.focus();
  }

  return (
    <div
      className={`flex items-center gap-2 h-10 px-3 rounded-xl border border-carbon-hairline bg-carbon-surface2 focus-within:border-blue-500/60 focus-within:bg-carbon-surface transition-colors ${className}`}
    >
      <Search size={15} className="text-carbon-muted shrink-0" aria-hidden="true" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-sm text-carbon-ink placeholder:text-carbon-faint focus:outline-none min-w-0"
        aria-label={placeholder}
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Effacer"
          className="text-carbon-muted hover:text-carbon-ink2 transition-colors shrink-0"
        >
          <X size={14} />
        </button>
      )}
      {!value && escAction && (
        <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono rounded border border-carbon-hairline text-carbon-faint bg-carbon-bg shrink-0">
          ESC
        </kbd>
      )}
    </div>
  );
}
