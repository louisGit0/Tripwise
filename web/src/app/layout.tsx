import type { Metadata } from 'next';
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { Providers } from '@/providers/Providers';
import './globals.css';

// Display & UI font — Space Grotesk
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
  // Fallback if CDN is unreachable
  fallback: ['-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
});

// Mono / numerics — JetBrains Mono
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mono',
  display: 'swap',
  fallback: ["'Courier New'", 'Courier', 'monospace'],
});

export const metadata: Metadata = {
  title: 'Tripwise — Calculez le coût de vos trajets',
  description:
    'Estimez le coût réel de vos trajets en voiture ou en véhicule électrique. Gratuit, sans publicité.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
  openGraph: {
    type: 'website',
    title: 'Tripwise — Calculez le coût de vos trajets',
    description:
      'Estimez le coût réel de vos trajets en voiture ou en véhicule électrique. Gratuit, sans publicité.',
    siteName: 'Tripwise',
  },
  twitter: {
    card: 'summary',
    title: 'Tripwise — Calculez le coût de vos trajets',
    description:
      'Estimez le coût réel de vos trajets en voiture ou en véhicule électrique. Gratuit, sans publicité.',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      // next-themes sets data-theme attribute; suppressHydrationWarning
      // prevents React mismatch on the server-rendered default.
      suppressHydrationWarning
    >
      <body className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} font-display`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
