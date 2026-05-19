import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Languages, Sun, Moon, LogIn, Heart } from 'lucide-react';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';
import { getFirebaseApp } from '../services/firebase';

export default function LoginPage() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang, t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');

    const app = getFirebaseApp();
    if (!app) {
      setError('Firebase is not configured.');
      setLoading(false);
      return;
    }

    try {
      const auth = getAuth(app);
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      if (msg.includes('auth/user-not-found') || msg.includes('auth/wrong-password') || msg.includes('auth/invalid-credential')) {
        setError('Invalid email or password');
      } else if (msg.includes('auth/invalid-email')) {
        setError('Invalid email format');
      } else if (msg.includes('auth/too-many-requests')) {
        setError('Too many attempts. Try again later.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <button
          onClick={() => setLang(lang === 'en' ? 'fr' : 'en')}
          className="rounded-xl border p-2 transition hover:bg-black/5 dark:hover:bg-white/5"
          style={{ borderColor: 'var(--border-color)' }}
          title={t('language')}
        >
          <Languages className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
        </button>
        <button
          onClick={toggleTheme}
          className="rounded-xl border p-2 transition hover:bg-black/5 dark:hover:bg-white/5"
          style={{ borderColor: 'var(--border-color)' }}
          title={theme === 'dark' ? t('lightMode') : t('darkMode')}
        >
          {theme === 'dark'
            ? <Sun className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
            : <Moon className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
          }
        </button>
      </div>

      <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center px-4 py-12">
        <div className="mb-4 flex items-center justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))' }}>
            <Heart className="h-6 w-6 text-white" />
          </span>
        </div>
        <h1 className="text-center text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: 'var(--text-primary)' }}>
          {t('appTitle')}
        </h1>
        <p className="mt-2 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
          Sign in to your account
        </p>

        <div className="mt-8 w-full">
          <div className="rounded-3xl border p-8 backdrop-blur-xl" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-card)' }}>
            <form className="space-y-4" onSubmit={handleLogin}>
              <div>
                <label className="mb-1.5 block text-sm font-medium" htmlFor="email" style={{ color: 'var(--text-secondary)' }}>Email</label>
                <input
                  id="email"
                  type="email"
                  className="soft-input"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium" htmlFor="password" style={{ color: 'var(--text-secondary)' }}>{t('loginPass')}</label>
                <input
                  id="password"
                  type="password"
                  className="soft-input"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              {error ? (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-500">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="soft-button w-full text-white disabled:cursor-not-allowed disabled:opacity-70"
                style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))' }}
              >
                <LogIn className="h-4 w-4" />
                {loading ? 'Signing in...' : t('loginBtn')}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
