import React from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
}

export function Select({ label, options, placeholder, error, className = '', id, ...props }: SelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-[var(--foreground)]">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`w-full px-3 py-2 bg-[var(--card)] border rounded-lg text-sm text-[var(--foreground)] transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ${
          error ? 'border-red-400 focus:ring-red-400' : 'border-[var(--border)]'
        } ${className}`}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
