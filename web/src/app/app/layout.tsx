import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AppLayout } from '@/components/layouts/AppLayout';

// Force dynamic rendering so cookies() is evaluated on every request
export const dynamic = 'force-dynamic';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;

  if (!token) {
    redirect('/login');
  }

  return <AppLayout>{children}</AppLayout>;
}
