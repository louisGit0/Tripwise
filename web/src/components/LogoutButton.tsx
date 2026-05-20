'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { logout } from '@/lib/auth';
import Button from '@/components/ui/Button';

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    await logout();
    router.push('/login');
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleLogout} loading={loading} aria-label="Déconnexion">
      <LogOut className="h-4 w-4" />
      <span className="hidden sm:inline">Déconnexion</span>
    </Button>
  );
}
