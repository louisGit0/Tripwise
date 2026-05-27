// Server component

interface BrandAvatarProps {
  brand: string;
  model?: string;
  size?: number;
  className?: string;
}

/** Derives a stable hue from a brand name so each brand gets a consistent accent color */
function brandHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
  }
  return hash % 360;
}

/** Returns the 1 or 2 character initials to display */
function initials(brand: string): string {
  const words = brand.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return brand.slice(0, 2).toUpperCase();
}

export function BrandAvatar({ brand, size = 36, className = '' }: BrandAvatarProps) {
  const hue = brandHue(brand);
  const bg = `hsl(${hue} 45% 18%)`;
  const fg = `hsl(${hue} 80% 72%)`;

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-semibold select-none shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        background: bg,
        color: fg,
        fontSize: Math.round(size * 0.36),
      }}
      aria-label={brand}
    >
      {initials(brand)}
    </span>
  );
}
