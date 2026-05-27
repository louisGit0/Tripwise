// Server component
import React from 'react';

interface EyebrowProps {
  children: React.ReactNode;
  className?: string;
  as?: 'p' | 'span' | 'div';
}

export function Eyebrow({ children, className = '', as: Tag = 'p' }: EyebrowProps) {
  return (
    <Tag
      className={`text-[10px] font-semibold tracking-eye-wide uppercase text-carbon-muted ${className}`}
    >
      {children}
    </Tag>
  );
}
