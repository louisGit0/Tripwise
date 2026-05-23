'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/providers/ToastProvider';
import { register as registerUser, setAuthCookie } from '@/lib/auth';

const schema = z.object({
  displayName: z.string().optional(),
  email: z.string().email(),
  password: z
    .string()
    .min(8, 'Minimum 8 caractères')
    .regex(/\d/, 'Doit contenir au moins un chiffre'),
});

type FormData = z.infer<typeof schema>;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export default function RegisterPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setIsLoading(true);
    try {
      const auth = await registerUser(data.email, data.password, data.displayName);
      await setAuthCookie(auth.accessToken);
      router.push('/app/dashboard');
      router.refresh();
    } catch {
      showToast('error', t('registerError'));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--background)]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="font-bold text-2xl text-primary-600 tracking-tight">
            Tripwise
          </Link>
          <h1 className="mt-4 text-2xl font-bold">{t('registerTitle')}</h1>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input
              label={t('displayName')}
              type="text"
              autoComplete="given-name"
              {...register('displayName')}
            />
            <Input
              label={t('email')}
              type="email"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label={t('password')}
              type="password"
              autoComplete="new-password"
              hint={t('passwordHint')}
              error={errors.password?.message}
              {...register('password')}
            />
            <Button type="submit" loading={isLoading} size="lg" className="w-full mt-2">
              {t('register')}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-xs text-[var(--muted)]">{t('orContinueWith')}</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          <div className="flex flex-col gap-3">
            <a
              href={`${API_URL}/auth/google`}
              className="flex items-center justify-center gap-3 px-4 py-2.5 border border-[var(--border)] rounded-lg text-sm font-medium hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              {t('googleLogin')}
            </a>
          </div>
        </div>

        <p className="text-center text-sm text-[var(--muted)] mt-6">
          {t('alreadyAccount')}{' '}
          <Link href="/login" className="text-primary-600 font-medium hover:underline">
            {t('loginLink')}
          </Link>
        </p>
      </div>
    </div>
  );
}
