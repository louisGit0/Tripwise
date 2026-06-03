import type { Metadata } from 'next';
import Link from 'next/link';
import { TWAppIcon } from '@/components/ui/TWAppIcon';
import { Wordmark } from '@/components/ui/Wordmark';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Hairline } from '@/components/ui/Hairline';

export const metadata: Metadata = {
  title: 'Politique de confidentialité — verygoodtrip',
  description:
    'Comment verygoodtrip collecte, utilise et protège vos données. Aucune publicité, aucun pistage.',
};

const CONTACT_EMAIL = 'louissoudy2@gmail.com';
const LAST_UPDATED = '3 juin 2026';

const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-carbon-bg';

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      <div className="space-y-3 text-carbon-ink2 leading-relaxed">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-carbon-bg text-carbon-ink">
      {/* ── Header ─────────────────────────────────────────────── */}
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

      {/* ── Content ────────────────────────────────────────────── */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-6 py-12 space-y-10">
        <div className="space-y-3">
          <Eyebrow>Confidentialité</Eyebrow>
          <h1 className="text-3xl font-bold tracking-tight">Politique de confidentialité</h1>
          <p className="text-sm text-carbon-muted">Dernière mise à jour : {LAST_UPDATED}</p>
        </div>

        <Hairline />

        <p className="text-carbon-ink2 leading-relaxed">
          verygoodtrip (« l&apos;application ») calcule le coût réel de vos trajets en voiture
          (carburant ou électrique), péages inclus. Cette politique explique quelles données
          sont collectées, pourquoi, et comment elles sont protégées.{' '}
          <strong className="text-carbon-ink">
            verygoodtrip n&apos;affiche aucune publicité et ne pratique aucun pistage publicitaire.
          </strong>
        </p>

        <Section title="1. Données que nous collectons">
          <p>Nous collectons uniquement les données nécessaires au fonctionnement du service :</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong className="text-carbon-ink">Compte</strong> : votre adresse e-mail (et, pour
              la connexion Google/Apple, l&apos;identifiant fourni par ces services). Mot de passe
              stocké de façon chiffrée (haché), jamais en clair.
            </li>
            <li>
              <strong className="text-carbon-ink">Pseudonyme</strong> : le nom d&apos;affichage que
              vous choisissez.
            </li>
            <li>
              <strong className="text-carbon-ink">Vos contenus</strong> : véhicules de votre garage,
              trajets calculés et sauvegardés, favoris, et préférences (thème, prix de référence).
            </li>
          </ul>
          <p>
            Nous ne collectons pas votre localisation en arrière-plan. Les adresses de départ et
            d&apos;arrivée que vous saisissez servent uniquement à calculer l&apos;itinéraire.
          </p>
        </Section>

        <Section title="2. Utilisation des données">
          <p>Vos données servent exclusivement à :</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>vous authentifier et sécuriser votre compte ;</li>
            <li>calculer et afficher le coût de vos trajets ;</li>
            <li>conserver votre garage, votre historique et vos favoris.</li>
          </ul>
          <p>
            Nous n&apos;utilisons jamais vos données à des fins publicitaires et ne les vendons
            à personne.
          </p>
        </Section>

        <Section title="3. Services tiers">
          <p>
            Pour fonctionner, l&apos;application transmet certaines données techniques à des
            prestataires, sans finalité publicitaire :
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong className="text-carbon-ink">Mapbox</strong> : cartographie, géocodage et
              calcul d&apos;itinéraire (adresses saisies).
            </li>
            <li>
              <strong className="text-carbon-ink">Données publiques françaises</strong>{' '}
              (data.gouv.fr / Opendatasoft) : prix des carburants, bornes de recharge, réseau
              autoroutier (aucune donnée personnelle envoyée).
            </li>
            <li>
              <strong className="text-carbon-ink">CarImages</strong> : photos des modèles de
              véhicules (la marque et le modèle uniquement, via notre serveur).
            </li>
            <li>
              <strong className="text-carbon-ink">Hébergement</strong> : Render (backend) et Vercel
              (web), au sein de l&apos;Union européenne ou avec garanties équivalentes.
            </li>
          </ul>
        </Section>

        <Section title="4. Conservation">
          <p>
            Vos données sont conservées tant que votre compte est actif. Vous pouvez demander la
            suppression de votre compte et de l&apos;ensemble des données associées à tout moment
            (voir « Vos droits »).
          </p>
        </Section>

        <Section title="5. Vos droits (RGPD)">
          <p>
            Conformément au Règlement général sur la protection des données, vous disposez d&apos;un
            droit d&apos;accès, de rectification, d&apos;effacement, de portabilité et
            d&apos;opposition concernant vos données personnelles. Pour exercer ces droits,
            contactez-nous à l&apos;adresse ci-dessous.
          </p>
        </Section>

        <Section title="6. Sécurité">
          <p>
            Les échanges sont chiffrés via HTTPS. Les mots de passe sont hachés (bcrypt). Les
            jetons d&apos;authentification sont stockés de manière sécurisée sur votre appareil
            (Keychain iOS / stockage chiffré). Les clés des services tiers restent côté serveur et
            ne sont jamais exposées dans l&apos;application.
          </p>
        </Section>

        <Section title="7. Enfants">
          <p>
            L&apos;application n&apos;est pas destinée aux personnes de moins de 13 ans et ne
            collecte pas sciemment leurs données.
          </p>
        </Section>

        <Section title="8. Contact & support">
          <p>
            Pour toute question relative à cette politique, au support, ou pour exercer vos droits :
          </p>
          <p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className={`text-carbon-accent hover:underline ${FOCUS_RING} rounded-md`}
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </Section>

        <Hairline />

        <p className="text-xs text-carbon-muted">
          Cette politique peut être mise à jour ; la date de dernière mise à jour figure en haut de
          page.
        </p>
      </main>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="px-6 py-6 border-t border-carbon-hairline text-center text-xs text-carbon-muted">
        © 2026 verygoodtrip — Gratuit, sans publicité.
      </footer>
    </div>
  );
}
