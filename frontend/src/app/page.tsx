'use client';

import { useEffect, useState } from 'react';
import { AuthScreen } from '../components/AuthScreen';
import { Dashboard } from '../components/Dashboard';
import { apiUrl } from '../lib/api';
import { User } from '../types';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    fetch(`${apiUrl}/api/auth/me`, { credentials: 'include' })
      .then((response) => (response.ok ? response.json() : null))
      .then((result) => setUser(result?.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setCheckingSession(false));
  }, []);

  if (checkingSession) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm text-(--ink-muted)">
        Loading your workspace...
      </div>
    );
  }

  if (!user) return <AuthScreen onAuthenticated={setUser} />;
  return <Dashboard user={user} onLogout={() => setUser(null)} />;
}
