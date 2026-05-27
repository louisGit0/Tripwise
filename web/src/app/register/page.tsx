'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TWAppIcon } from '@/components/ui/TWAppIcon';
import { Wordmark } from '@/components/ui/Wordmark';
import { Hairline } from '@/components/ui/Hairline';
import { CTAButton } from '@/components/ui/CTAButton';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/providers/ToastProvider';
import { register as registerUser, setAuthCookie } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

function buildSchema(passwordMismatch: string) {
  return z
    .object({
      displayName: z.string().optional(),
      email: z.string().email(),
      password: z
        .string()
        .min(8, 'Minimum 8 caractères')
        .regex(/\d/, 'Doit contenir au moins un chiffre'),
      confirmPassword: z.string().min(1),
    })
    .refine((d) => d.password === d.confirmPassword, {
      message: passwordMismatch,
      path: ['confirmPassword'],
    });
}

type FormData = {
  displayName?: string;
  email: string;
  password: string;
  confirmPassword: string;
};

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

export default function RegisterPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const schema = buildSchema(t('passwordMismatch'));

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
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-carbon-bg">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <TWAppIcon size={44} />
          <Wordmark size="md" />
          <p className="text-sm text-carbon-muted mt-1">{t('registerTitle')}</p>
        </div>

        {/* Card */}
        <div className="rounded-card bg-carbon-surface border border-carbon-hairline p-6">
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
            <Input
              label={t('confirmPassword')}
              type="password"
              autoComplete="new-password"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />
            <CTAButton
              type="submit"
              loading={isLoading}
              variant="accent"
              size="lg"
              className="w-full mt-1"
            >
              {t('register')}
            </CTAButton>
          </form>

          <div className="my-5 flex items-center gap-3">
            <Hairline className="flex-1" />
            <span className="text-xs text-carbon-muted">{t('orContinueWith')}</span>
            <Hairline className="flex-1" />
          </div>

          <a
            href={`${API_URL}/auth/google`}
            className="flex items-center justify-center gap-2.5 h-9 px-4 border border-carbon-hairline rounded-xl text-sm font-medium text-carbon-ink2 bg-carbon-surface2 hover:bg-carbon-faint transition-colors"
          >
            <GoogleIcon />
            {t('googleLogin')}
          </a>
        </div>

        <p className="text-center text-sm text-carbon-muted mt-6">
          {t('alreadyAccount')}{' '}
          <Link href="/login" className="text-carbon-accent font-medium hover:underline">
            {t('loginLink')}
          </Link>
        </p>
      </div>
    </div>
  );
}
