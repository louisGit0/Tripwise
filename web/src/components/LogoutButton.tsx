'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { logout } from '@/lib/auth';
import { Button } from './ui/Button';

interface LogoutButtonProps {
  label?: string;
}

export function LogoutButton({ label = 'Se déconnecter' }: LogoutButtonProps) {
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push('/login');
    router.refresh();
  }

  return (
    <Button variant="ghost" onClick={handleLogout} className="gap-2">
      <LogOut size={16} />
      {label}
    </Button>
  );
}
