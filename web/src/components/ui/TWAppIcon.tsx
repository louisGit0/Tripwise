// Server component — no interactivity needed
//
// verygoodtrip app icon: dark surface tile + 1px hairline border + accent "V"
// route mark (origin ring → destination dot, dashed baseline). This is the
// primary brand lockup icon. The tile is a fixed dark brand surface so the mark
// reads identically on light and dark themes (an app icon does not invert).

type Variant = 'default' | 'mono';

interface TWAppIconProps {
  size?: number;
  variant?: Variant;
  className?: string;
}

// Brand tokens (fixed — the icon is a brand asset, theme-independent)
const SURFACE = '#181612';
const HAIRLINE = '#3a3328';
const ACCENT = '#4d8bff';
const DARK = '#0e0c0a';

export function TWAppIcon({ size = 48, variant = 'default', className = '' }: TWAppIconProps) {
  // default = dark tile + accent mark · mono = single-colour (currentColor tile, dark mark)
  const tileFill = variant === 'mono' ? 'currentColor' : SURFACE;
  const tileStroke = variant === 'mono' ? 'none' : HAIRLINE;
  const markColor = variant === 'mono' ? DARK : ACCENT;
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
      {/* Surface tile + hairline border */}
      <rect
        x="0.5"
        y="0.5"
        width="47"
        height="47"
        rx={radius}
        fill={tileFill}
        stroke={tileStroke}
        strokeWidth="1"
      />

      {/* Dashed baseline horizon */}
      <line
        x1="9"
        y1="38"
        x2="39"
        y2="38"
        stroke={markColor}
        strokeOpacity="0.25"
        strokeWidth="1"
        strokeDasharray="1.5 2.5"
      />

      {/* "V" route mark */}
      <path
        d="M10 15 L24 34 L38 15"
        stroke={markColor}
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Origin waypoint (hollow ring) */}
      <circle
        cx="10"
        cy="15"
        r="3"
        fill="none"
        stroke={markColor}
        strokeWidth="2.3"
      />

      {/* Destination waypoint (filled dot) */}
      <circle cx="38" cy="15" r="3.2" fill={markColor} />
    </svg>
  );
}
