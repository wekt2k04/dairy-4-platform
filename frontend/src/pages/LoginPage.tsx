import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, ShieldCheck } from 'lucide-react';

import { mockLogin } from '../services/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await mockLogin(username, password);
      localStorage.setItem('dairy4:auth', JSON.stringify({ token: result.token, user: username }));
      navigate('/simulate');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(141,220,255,0.14),_transparent_28%),radial-gradient(circle_at_80%_20%,_rgba(119,201,139,0.12),_transparent_22%)]" />
      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center">
        <section className="grid w-full gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="animate-float rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-glow backdrop-blur-xl lg:p-10">
            <div className="label-chip w-fit">Dairy 4.0 / Precision Livestock Farming</div>
            <h1 className="mt-6 max-w-xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              A production cockpit for dairy health, yield, and vision telemetry.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
              Connect the farm’s bolus signals, video stream, and pre-trained inference models through a single
              operator interface.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                ['FastAPI', 'validated model orchestration'],
                ['Firebase', 'auth + data persistence'],
                ['React', 'operator-grade control panel'],
              ].map(([title, detail]) => (
                <div key={title} className="rounded-3xl border border-white/10 bg-black/20 p-4">
                  <div className="text-sm font-medium text-white">{title}</div>
                  <div className="mt-2 text-sm text-slate-300">{detail}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-[2rem] p-8 lg:p-10">
            <div className="flex items-center gap-3 text-accent">
              <ShieldCheck className="h-5 w-5" />
              <span className="text-xs uppercase tracking-[0.24em] text-slate-300">Operator Login</span>
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-white">Sign in to simulate the herd.</h2>
            <p className="mt-2 text-sm text-slate-300">Use the hardcoded credentials <span className="font-semibold text-white">admin / admin</span>.</p>

            <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-2 block text-sm text-slate-300" htmlFor="username">Username</label>
                <input id="username" className="soft-input" value={username} onChange={(event) => setUsername(event.target.value)} />
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-300" htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  className="soft-input"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>

              {error ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

              <button
                type="submit"
                disabled={loading}
                className="soft-button w-full bg-gradient-to-r from-accent to-accent2 shadow-[0_18px_40px_rgba(119,201,139,0.24)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <LogIn className="h-4 w-4" />
                {loading ? 'Authenticating...' : 'Enter simulation'}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
