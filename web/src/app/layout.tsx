import type { Metadata } from 'next';
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import { Providers } from '@/providers/Providers';
import './globals.css';

// Display & UI font — Space Grotesk
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
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
  title: 'VeryGoodTrip — Calculez le coût de vos trajets',
  description:
    'Estimez le coût réel de vos trajets en voiture ou en véhicule électrique. Gratuit, sans publicité.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
  openGraph: {
    type: 'website',
    title: 'VeryGoodTrip — Calculez le coût de vos trajets',
    description:
      'Estimez le coût réel de vos trajets en voiture ou en véhicule électrique. Gratuit, sans publicité.',
    siteName: 'VeryGoodTrip',
  },
  twitter: {
    card: 'summary',
    title: 'VeryGoodTrip — Calculez le coût de vos trajets',
    description:
      'Estimez le coût réel de vos trajets en voiture ou en véhicule électrique. Gratuit, sans publicité.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} font-display`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
