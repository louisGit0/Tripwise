'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';
import { setAuthCookie } from '@/lib/auth';

function GoogleCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      router.replace('/login');
      return;
    }

    setAuthCookie(token)
      .then(() => router.replace('/app/dashboard'))
      .catch(() => router.replace('/login'));
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-carbon-muted">
        <LoaderCircle size={28} className="animate-spin text-carbon-accent" />
        <p className="text-sm">Connexion en cours…</p>
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <LoaderCircle size={28} className="animate-spin text-carbon-accent" />
        </div>
      }
    >
      <GoogleCallbackContent />
    </Suspense>
  );
}
