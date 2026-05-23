import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Zap, TrendingDown, Map } from 'lucide-react';

export default async function LandingPage() {
  const t = await getTranslations('landing');
  const tAuth = await getTranslations('auth');

  const features = [
    {
      icon: TrendingDown,
      title: t('feature1Title'),
      desc: t('feature1Desc'),
    },
    {
      icon: Zap,
      title: t('feature2Title'),
      desc: t('feature2Desc'),
    },
    {
      icon: Map,
      title: t('feature3Title'),
      desc: t('feature3Desc'),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 h-14 border-b border-[var(--border)]">
        <span className="font-bold text-lg text-primary-600 tracking-tight">Tripwise</span>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            {tAuth('loginLink')}
          </Link>
          <Link
            href="/register"
            className="px-4 py-1.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            {tAuth('registerLink')}
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-medium rounded-full mb-6">
            <Zap size={12} />
            Gratuit · Sans publicité
          </div>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">{t('title')}</h1>
          <p className="text-lg text-[var(--muted)] mb-8 max-w-lg mx-auto">{t('subtitle')}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/25"
            >
              {t('ctaRegister')}
            </Link>
            <Link
              href="/login"
              className="px-6 py-3 bg-[var(--card)] border border-[var(--border)] font-semibold rounded-xl hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
            >
              {t('ctaLogin')}
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 w-full max-w-3xl">
          {features.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="flex flex-col items-center text-center p-6 bg-[var(--card)] border border-[var(--border)] rounded-xl gap-3"
            >
              <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                <Icon size={20} className="text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-[var(--muted)]">{desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-[var(--muted)] border-t border-[var(--border)]">
        © {new Date().getFullYear()} Tripwise
      </footer>
    </div>
  );
}
