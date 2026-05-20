import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { MapPin, Zap, Star } from 'lucide-react';

export default function LandingPage() {
  return (
    <main className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-bold text-primary-600 text-lg tracking-tight">Tripwise</span>
          <nav className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
              Connexion
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-primary-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
            >
              S&apos;inscrire
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 bg-gradient-to-b from-primary-50 to-white dark:from-slate-900 dark:to-slate-800">
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white leading-tight max-w-2xl">
          Calculez le coût de{' '}
          <span className="text-primary-600">vos trajets</span>
        </h1>
        <p className="mt-4 text-lg text-slate-600 dark:text-slate-400 max-w-lg">
          Essence, diesel, électrique — obtenez une estimation précise du coût de votre trajet en quelques secondes.
        </p>
        <Link
          href="/register"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-base font-semibold text-white hover:bg-primary-700 transition-colors shadow-lg shadow-primary-200 dark:shadow-none"
        >
          Commencer gratuitement
        </Link>
        <p className="mt-3 text-sm text-slate-500">Gratuit, sans carte bancaire.</p>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-white dark:bg-slate-900">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Zap className="h-6 w-6 text-primary-600" />}
            title="Prix en temps réel"
            description="Données carburant actualisées toutes les 10 minutes depuis le réseau officiel."
          />
          <FeatureCard
            icon={<MapPin className="h-6 w-6 text-primary-600" />}
            title="Multi-véhicules"
            description="Gérez plusieurs véhicules et comparez les coûts instantanément."
          />
          <FeatureCard
            icon={<Star className="h-6 w-6 text-primary-600" />}
            title="Favoris"
            description="Sauvegardez vos trajets habituels pour y accéder en un clic."
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-sm text-slate-500 dark:text-slate-500 bg-white dark:bg-slate-900">
        © 2026 Tripwise
      </footer>
    </main>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center text-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-900/30">
        {icon}
      </div>
      <h3 className="font-semibold text-slate-900 dark:text-white">{title}</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>
    </div>
  );
}
