import type { Metadata, Viewport } from 'next';
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

const TITLE = 'verygoodtrip — Calculez le coût de vos trajets';
const DESCRIPTION =
  'Estimez le coût réel de vos trajets en voiture ou en véhicule électrique. Gratuit, sans publicité.';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://verygoodtrip.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: 'verygoodtrip',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
    ],
    shortcut: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    title: TITLE,
    description: DESCRIPTION,
    siteName: 'verygoodtrip',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'verygoodtrip' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/og-image.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#0E0C0A',
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
