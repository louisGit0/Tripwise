import React from 'react';

type Padding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps {
  children: React.ReactNode;
  padding?: Padding;
  className?: string;
}

const paddingClasses: Record<Padding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-8',
};

export function Card({ children, padding = 'md', className = '' }: CardProps) {
  return (
    <div
      className={`bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-sm ${paddingClasses[padding]} ${className}`}
    >
      {children}
    </div>
  );
}
