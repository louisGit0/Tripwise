// Server component

interface HairlineProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function Hairline({ orientation = 'horizontal', className = '' }: HairlineProps) {
  if (orientation === 'vertical') {
    return (
      <span
        role="separator"
        aria-orientation="vertical"
        className={`inline-block self-stretch w-px bg-carbon-hairline ${className}`}
      />
    );
  }

  return (
    <hr
      role="separator"
      className={`border-none h-px bg-carbon-hairline ${className}`}
    />
  );
}
