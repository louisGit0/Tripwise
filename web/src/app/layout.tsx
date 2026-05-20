import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { getLocale } from 'next-intl/server';
import './globals.css';
import Providers from '@/providers/Providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Tripwise — Calculez le coût de vos trajets',
  description: 'Estimez le coût de vos trajets en voiture : essence, diesel ou électrique.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();

  return (
    <html lang={locale} className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-[--background] text-[--foreground]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
