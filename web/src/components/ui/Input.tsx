import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className = '', id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold tracking-wider uppercase text-carbon-muted"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full px-3 py-2.5 bg-carbon-surface border rounded-xl text-sm text-carbon-ink placeholder:text-carbon-muted transition-colors focus:outline-none focus:ring-2 focus:ring-carbon-accent focus:ring-offset-0 ${
          error
            ? 'border-red-400 focus:ring-red-400'
            : 'border-carbon-hairline focus:border-carbon-accent'
        } ${className}`}
        {...props}
      />
      {hint && !error && <p className="text-xs text-carbon-muted">{hint}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
