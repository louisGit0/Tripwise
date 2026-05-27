// Server component — no interactivity needed

type Variant = 'default' | 'mono';

interface TWAppIconProps {
  size?: number;
  variant?: Variant;
  className?: string;
}

export function TWAppIcon({ size = 48, variant = 'default', className = '' }: TWAppIconProps) {
  const bgColor = variant === 'mono' ? 'currentColor' : 'var(--c-accent)';
  const fgColor = variant === 'mono' ? 'var(--c-bg)' : '#ffffff';
  const radius = Math.round(size * 0.22); // 22% rounded corners

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      {/* Background rounded square */}
      <rect
        x="0"
        y="0"
        width="48"
        height="48"
        rx={radius}
        fill={bgColor}
      />

      {/* Baseline dashed horizon */}
      <line
        x1="6"
        y1="38"
        x2="42"
        y2="38"
        stroke={fgColor}
        strokeOpacity="0.25"
        strokeWidth="1"
        strokeDasharray="1.5 2.5"
      />

      {/* Route W mark */}
      <path
        d="M10 18 L18 32 L24 22 L30 32 L38 18"
        stroke={fgColor}
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Origin dot (hollow) */}
      <circle
        cx="10"
        cy="18"
        r="3"
        fill="none"
        stroke={fgColor}
        strokeWidth="2.3"
      />

      {/* Destination dot (filled) */}
      <circle cx="38" cy="18" r="3.2" fill={fgColor} />
    </svg>
  );
}
