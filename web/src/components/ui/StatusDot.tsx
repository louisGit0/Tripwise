// Server component

type Status = 'online' | 'idle' | 'offline' | 'error' | 'warning';

interface StatusDotProps {
  status?: Status;
  pulse?: boolean;
  size?: number;
  label?: string;
  className?: string;
}

const statusColors: Record<Status, string> = {
  online: 'bg-emerald-500',
  idle: 'bg-amber-400',
  offline: 'bg-carbon-faint',
  error: 'bg-red-500',
  warning: 'bg-amber-500',
};

export function StatusDot({
  status = 'online',
  pulse = false,
  size = 8,
  label,
  className = '',
}: StatusDotProps) {
  return (
    <span
      role="status"
      aria-label={label ?? status}
      className={`inline-flex items-center gap-1.5 ${className}`}
    >
      <span className="relative inline-flex" style={{ width: size, height: size }}>
        {pulse && (
          <span
            className={`absolute inset-0 rounded-full opacity-75 animate-ping ${statusColors[status]}`}
          />
        )}
        <span
          className={`relative inline-flex rounded-full ${statusColors[status]}`}
          style={{ width: size, height: size }}
        />
      </span>
      {label && (
        <span className="text-xs text-carbon-muted">{label}</span>
      )}
    </span>
  );
}
