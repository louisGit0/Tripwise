import type { Metadata } from 'next';
import Link from 'next/link';
import { TWAppIcon } from '@/components/ui/TWAppIcon';
import { Wordmark } from '@/components/ui/Wordmark';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Hairline } from '@/components/ui/Hairline';

export const metadata: Metadata = {
  title: 'Support — verygoodtrip',
  description: 'Besoin d’aide avec verygoodtrip ? Contactez-nous.',
};

const CONTACT_EMAIL = 'louissoudy2@gmail.com';

const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-carbon-bg';

const FAQ = [
  {
    q: 'Les péages affichés sont-ils exacts ?',
    a: 'Le coût des péages est une estimation, clairement signalée comme telle. Elle est calculée à partir des autoroutes réellement empruntées sur l’itinéraire et de tarifs moyens par réseau, sans service payant.',
  },
  {
    q: 'D’où viennent les prix des carburants ?',
    a: 'Des données publiques françaises en temps réel (data.gouv.fr / Opendatasoft). En cas d’indisponibilité, des prix moyens de repli sont utilisés.',
  },
  {
    q: 'Comment supprimer mon compte ?',
    a: 'Dans l’application : Paramètres → Zone de danger → Supprimer mon compte. La suppression est définitive et efface toutes vos données.',
  },
  {
    q: 'L’application est-elle payante ?',
    a: 'Non. verygoodtrip est gratuite et sans publicité.',
  },
];

export default function SupportPage() {
  return (
    <div className="min-h-screen flex flex-col bg-carbon-bg text-carbon-ink">
      <header className="flex items-center justify-between px-6 h-14 border-b border-carbon-hairline">
        <Link
          href="/"
          className={`flex items-center gap-2.5 ${FOCUS_RING} rounded-md`}
          aria-label="Retour à l'accueil verygoodtrip"
        >
          <TWAppIcon size={30} />
          <Wordmark size="sm" />
        </Link>
        <Link
          href="/"
          className={`text-sm text-carbon-muted hover:text-carbon-ink transition-colors ${FOCUS_RING} rounded-md px-1`}
        >
          Accueil
        </Link>
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto px-6 py-12 space-y-10">
        <div className="space-y-3">
          <Eyebrow>Aide</Eyebrow>
          <h1 className="text-3xl font-bold tracking-tight">Support</h1>
          <p className="text-carbon-ink2 leading-relaxed">
            Une question, un bug, une suggestion ? Écrivez-nous, nous répondons dès que possible.
          </p>
          <p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className={`text-carbon-accent hover:underline ${FOCUS_RING} rounded-md`}
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>

        <Hairline />

        <section className="space-y-6">
          <h2 className="text-lg font-bold tracking-tight">Questions fréquentes</h2>
          {FAQ.map(({ q, a }) => (
            <div key={q} className="space-y-1.5">
              <h3 className="font-bold text-carbon-ink">{q}</h3>
              <p className="text-carbon-ink2 leading-relaxed">{a}</p>
            </div>
          ))}
        </section>

        <Hairline />

        <p className="text-xs text-carbon-muted">
          Voir aussi notre{' '}
          <Link href="/privacy" className={`text-carbon-accent hover:underline ${FOCUS_RING} rounded-md`}>
            politique de confidentialité
          </Link>
          .
        </p>
      </main>

      <footer className="px-6 py-6 border-t border-carbon-hairline text-center text-xs text-carbon-muted">
        © 2026 verygoodtrip — Gratuit, sans publicité.
      </footer>
    </div>
  );
}
