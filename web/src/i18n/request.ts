import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

const VALID_LOCALES = ['fr', 'en'] as const;
type Locale = (typeof VALID_LOCALES)[number];

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const raw = cookieStore.get('locale')?.value ?? 'fr';
  const locale: Locale = VALID_LOCALES.includes(raw as Locale) ? (raw as Locale) : 'fr';

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
