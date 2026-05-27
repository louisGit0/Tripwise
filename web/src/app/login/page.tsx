'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TWAppIcon } from '@/components/ui/TWAppIcon';
import { Wordmark } from '@/components/ui/Wordmark';
import { Hairline } from '@/components/ui/Hairline';
import { CTAButton } from '@/components/ui/CTAButton';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/providers/ToastProvider';
import { login, setAuthCookie } from '@/lib/auth';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type FormData = z.infer<typeof schema>;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

// Google SVG icon
function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

// Apple SVG icon
function AppleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Redirect already-authenticated users away from login
  useEffect(() => {
    const hasToken = document.cookie
      .split(';')
      .some((c) => c.trim().startsWith('access_token='));
    if (hasToken) router.replace('/app/dashboard');
  }, [router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setIsLoading(true);
    try {
      const auth = await login(data.email, data.password);
      await setAuthCookie(auth.accessToken);
      router.push('/app/dashboard');
      router.refresh();
    } catch {
      showToast('error', 'Email ou mot de passe incorrect');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-carbon-bg">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <TWAppIcon size={44} />
          <Wordmark size="md" />
          <p className="text-sm text-carbon-muted mt-1">Connexion</p>
        </div>

        {/* Card */}
        <div className="rounded-card bg-carbon-surface border border-carbon-hairline p-6">

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input
              label="Adresse email"
              type="email"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Mot de passe"
              type="password"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register('password')}
            />
            <CTAButton
              type="submit"
              loading={isLoading}
              variant="accent"
              size="lg"
              className="w-full mt-1"
            >
              Se connecter
            </CTAButton>
          </form>

          <div className="my-5 flex items-center gap-3">
            <Hairline className="flex-1" />
            <span className="text-xs text-carbon-muted">ou</span>
            <Hairline className="flex-1" />
          </div>

          <div className="flex flex-col gap-2">
            <a
              href={`${API_URL}/auth/google`}
              className="flex items-center justify-center gap-2.5 h-9 px-4 border border-carbon-hairline rounded-xl text-sm font-medium text-carbon-ink2 bg-carbon-surface2 hover:bg-carbon-faint transition-colors"
            >
              <GoogleIcon />
              Continuer avec Google
            </a>
            <a
              href={`${API_URL}/auth/apple`}
              className="flex items-center justify-center gap-2.5 h-9 px-4 border border-carbon-hairline rounded-xl text-sm font-medium text-carbon-ink2 bg-carbon-surface2 hover:bg-carbon-faint transition-colors"
            >
              <AppleIcon />
              Continuer avec Apple
            </a>
          </div>
        </div>

        <p className="text-center text-sm text-carbon-muted mt-6">
          Pas encore de compte ?{' '}
          <Link href="/register" className="text-carbon-accent font-medium hover:underline">
            S&apos;inscrire
          </Link>
        </p>
      </div>
    </div>
  );
}
