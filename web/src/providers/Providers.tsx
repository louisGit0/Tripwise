'use client';

import { ThemeProvider } from 'next-themes';
import { ToastProvider } from './ToastProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    // attribute="data-theme": next-themes sets data-theme="dark"|"light" on <html>
    // defaultTheme="dark":    Carbon design is dark-first
    // enableSystem={false}:   Explicit user choice only — no OS preference
    <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem={false}>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}
