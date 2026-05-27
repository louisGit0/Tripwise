// Server component

type FuelType = 'ELECTRIC' | 'SP95' | 'SP95_E10' | 'SP98' | 'DIESEL' | 'E85' | 'GPL';

interface FuelBadgeProps {
  fuelType: FuelType;
  className?: string;
}

const labels: Record<FuelType, string> = {
  ELECTRIC: 'EV',
  SP95: 'SP95',
  SP95_E10: 'E10',
  SP98: 'SP98',
  DIESEL: 'Diesel',
  E85: 'E85',
  GPL: 'GPL',
};

const styles: Record<FuelType, string> = {
  // EV → teal-green
  ELECTRIC: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  // Gasoline variants → amber
  SP95:     'bg-amber-500/15 text-amber-400 border-amber-500/30',
  SP95_E10: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  SP98:     'bg-amber-500/15 text-amber-400 border-amber-500/30',
  // Diesel → sky blue
  DIESEL:   'bg-sky-500/15 text-sky-400 border-sky-500/30',
  // Bio-ethanol → green
  E85:      'bg-lime-500/15 text-lime-400 border-lime-500/30',
  // LPG → violet
  GPL:      'bg-violet-500/15 text-violet-400 border-violet-500/30',
};

export function FuelBadge({ fuelType, className = '' }: FuelBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold tracking-eye uppercase rounded border ${styles[fuelType]} ${className}`}
    >
      {labels[fuelType]}
    </span>
  );
}
