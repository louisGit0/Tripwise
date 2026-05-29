// Server component — uses CSS animation defined in globals.css

interface WordmarkProps {
  size?: 'sm' | 'md' | 'lg';
  showCursor?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'text-sm font-semibold tracking-display',
  md: 'text-base font-semibold tracking-display',
  lg: 'text-lg font-bold tracking-display',
};

export function Wordmark({ size = 'md', showCursor = false, className = '' }: WordmarkProps) {
  return (
    <span
      className={`inline-flex items-baseline gap-0 font-display text-carbon-ink select-none ${sizeClasses[size]} ${className}`}
    >
      <span className="text-carbon-ink">very</span>
      <span className="text-carbon-accent">good</span>
      <span className="text-carbon-ink">trip</span>
      <span className="text-carbon-accent">.</span>
      {showCursor && (
        <span
          className="inline-block ml-0.5 w-[2px] h-[1.1em] bg-carbon-accent align-middle"
          style={{ animation: 'twcursor 1.1s step-start infinite' }}
          aria-hidden="true"
        />
      )}
    </span>
  );
}
