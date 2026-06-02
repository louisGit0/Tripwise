import Link from 'next/link';
import { Zap, Map, Fuel } from 'lucide-react';
import { TWAppIcon } from '@/components/ui/TWAppIcon';
import { Wordmark } from '@/components/ui/Wordmark';
import { Pill } from '@/components/ui/Pill';
import { SectionCard } from '@/components/ui/SectionCard';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Hairline } from '@/components/ui/Hairline';
import { CTAButton } from '@/components/ui/CTAButton';

// Canonical focus-visible ring (PD3-1) for hand-rolled links.
const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-carbon-bg';

const FEATURES = [
  {
    icon: Fuel,
    title: 'Carburant & Électrique',
    desc: 'Calculez le coût pour tous les types de motorisation : essence, diesel, GPL, E85 et véhicules électriques.',
  },
  {
    icon: Zap,
    title: 'Prix en temps réel',
    desc: 'Les prix des carburants sont mis à jour en temps réel depuis les données gouvernementales françaises.',
  },
  {
    icon: Map,
    title: 'Itinéraire précis',
    desc: 'Calcul basé sur l\'itinéraire réel via Mapbox pour une estimation au plus proche.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-carbon-bg text-carbon-ink">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 h-14 border-b border-carbon-hairline">
        <div className="flex items-center gap-2.5">
          <TWAppIcon size={30} />
          <Wordmark size="sm" />
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className={`text-sm text-carbon-muted hover:text-carbon-ink transition-colors rounded-lg ${FOCUS_RING}`}
          >
            Se connecter
          </Link>
          <Link href="/register">
            <CTAButton variant="accent" size="md">
              Créer un compte
            </CTAButton>
          </Link>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="max-w-2xl mx-auto">
          {/* Badge row */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
            <Pill color="default" size="sm">Gratuit · Sans pub</Pill>
          </div>

          {/* Headline */}
          <h1 className="text-display font-display leading-tight tracking-display mb-5">
            Calculez le coût
            <br />
            de vos trajets
          </h1>

          <p className="text-lg text-carbon-muted mb-8 max-w-lg mx-auto leading-relaxed">
            Verygoodtrip calcule précisément le coût de vos trajets en voiture, que vous rouliez à l&apos;essence, au diesel ou à l&apos;électricité.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 justify-center mb-10">
            <Pill color="accent" dot>Véhicule électrique</Pill>
            <Pill color="default" dot>Carburant</Pill>
            <Pill color="info" dot>Itinéraire Mapbox</Pill>
          </div>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register" className="w-full sm:w-auto">
              <CTAButton
                variant="accent"
                size="lg"
                className="w-full shadow-lg shadow-blue-500/20"
              >
                Commencer gratuitement
              </CTAButton>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
              <CTAButton variant="surface" size="lg" className="w-full">
                Se connecter
              </CTAButton>
            </Link>
          </div>
        </div>

        {/* ── Feature cards ──────────────────────────────────── */}
        <div className="mt-20 w-full max-w-3xl">
          <Eyebrow className="text-center mb-6">Fonctionnalités</Eyebrow>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <SectionCard key={title} padding="lg">
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center">
                    <Icon size={18} className="text-carbon-accent" />
                  </div>
                  <h3 className="font-bold text-carbon-ink text-sm">{title}</h3>
                  <p className="text-sm text-carbon-muted leading-relaxed">{desc}</p>
                </div>
              </SectionCard>
            ))}
          </div>
        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="py-6 px-6">
        <Hairline className="mb-4" />
        <p className="text-center text-caption text-carbon-muted">
          © {new Date().getFullYear()} verygoodtrip &nbsp;·&nbsp; v2.4 — BUILD 0521
        </p>
      </footer>
    </div>
  );
}
