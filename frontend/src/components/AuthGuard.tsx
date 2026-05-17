import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { onAuthStateChanged, getAuth } from 'firebase/auth';
import { getFirebaseApp } from '../services/firebase';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [status, setStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');

  useEffect(() => {
    const app = getFirebaseApp();
    if (!app) {
      setStatus('unauthenticated');
      return;
    }
    const auth = getAuth(app);
    const unsub = onAuthStateChanged(auth, (user) => {
      setStatus(user ? 'authenticated' : 'unauthenticated');
    });
    return unsub;
  }, []);

  if (status === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
          <p className="mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
