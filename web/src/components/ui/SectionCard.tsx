// Server component
import React from 'react';

interface SectionCardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  border?: boolean;
  className?: string;
}

const paddingMap = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

export function SectionCard({
  title,
  subtitle,
  action,
  children,
  padding = 'md',
  border = true,
  className = '',
}: SectionCardProps) {
  const hasHeader = title || subtitle || action;

  return (
    <section
      className={`rounded-card bg-carbon-surface ${border ? 'border border-carbon-hairline' : ''} ${className}`}
    >
      {hasHeader && (
        <div
          className={`flex items-start justify-between gap-4 ${paddingMap[padding]} ${padding !== 'none' ? 'pb-0' : ''}`}
        >
          <div className="flex flex-col gap-0.5 min-w-0">
            {title && (
              <h2 className="text-sm font-semibold text-carbon-ink leading-tight truncate">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-[11px] text-carbon-muted leading-tight">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={paddingMap[padding]}>{children}</div>
    </section>
  );
}
