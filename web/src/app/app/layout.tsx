import { AppNav } from '@/components/AppNav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      <AppNav />
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
