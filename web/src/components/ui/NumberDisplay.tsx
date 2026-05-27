// Server component

interface NumberDisplayProps {
  value: number;
  unit?: string;
  decimals?: number;
  locale?: string;
  compact?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: 'ink' | 'accent' | 'ev' | 'gas' | 'diesel' | 'muted';
  className?: string;
}

const sizeClasses = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-2xl',
  xl: 'text-4xl',
};

const colorClasses = {
  ink: 'text-carbon-ink',
  accent: 'text-carbon-accent',
  ev: 'text-carbon-ev',
  gas: 'text-carbon-fuelGas',
  diesel: 'text-carbon-fuelDie',
  muted: 'text-carbon-muted',
};

export function NumberDisplay({
  value,
  unit,
  decimals = 2,
  locale = 'fr-FR',
  compact = false,
  size = 'md',
  color = 'ink',
  className = '',
}: NumberDisplayProps) {
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: compact ? 0 : decimals,
    maximumFractionDigits: decimals,
    notation: compact ? 'compact' : 'standard',
  }).format(value);

  return (
    <span
      className={`font-mono tabular-nums font-medium ${sizeClasses[size]} ${colorClasses[color]} ${className}`}
    >
      {formatted}
      {unit && (
        <span className="text-[0.7em] font-sans font-normal text-carbon-muted ml-0.5">
          {unit}
        </span>
      )}
    </span>
  );
}
