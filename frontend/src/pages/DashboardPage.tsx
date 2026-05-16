import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, ShieldCheck } from 'lucide-react';

import GaugeChart from '../components/GaugeChart';
import ProductionChart from '../components/ProductionChart';
import VideoPanel from '../components/VideoPanel';
import { getPredictionById } from '../services/firebase';
import type { DashboardState } from '../types';

function isDashboardState(value: unknown): value is DashboardState {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.prediction_id === 'string' &&
    typeof candidate.created_at === 'string' &&
    (candidate.source === 'api' || candidate.source === 'firestore') &&
    typeof candidate.inputs === 'object' &&
    typeof candidate.health === 'object' &&
    typeof candidate.production === 'object'
  );
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

export default function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const predictionId = searchParams.get('prediction_id') ?? '';
  const [state, setState] = useState<DashboardState | null>(() => (isDashboardState(location.state) ? location.state : null));
  const [loading, setLoading] = useState(() => !isDashboardState(location.state) && Boolean(predictionId));
  const [error, setError] = useState('');

  useEffect(() => {
    const routeState = isDashboardState(location.state) ? location.state : null;
    if (routeState) {
      setState(routeState);
      setLoading(false);
      setError('');
      return;
    }

    if (!predictionId) {
      setState(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    void getPredictionById(predictionId)
      .then((record) => {
        if (cancelled) {
          return;
        }

        if (!record) {
          setState(null);
          setError('No simulation data found for this run.');
          return;
        }

        setState(record);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : 'Could not load dashboard state');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [location.state, predictionId]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-8">
        <div className="glass-panel w-full max-w-xl rounded-[2rem] p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-accent">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-white">Loading simulation...</h1>
          <p className="mt-2 text-sm text-slate-300">Fetching the latest diagnostic snapshot.</p>
        </div>
      </main>
    );
  }

  if (!state) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-8">
        <div className="glass-panel w-full max-w-xl rounded-[2rem] p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-accent">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-white">No simulation data found</h1>
          <p className="mt-2 text-sm text-slate-300">{error || 'Run a simulation first so the dashboard has predictions to render.'}</p>
          <button className="soft-button mt-6 bg-gradient-to-r from-accent to-accent2" onClick={() => navigate('/simulate')}>
            <ArrowLeft className="h-4 w-4" />
            Back to simulator
          </button>
        </div>
      </main>
    );
  }

  const showVision = Boolean(state.inputs.video_url || state.vision?.processed_video_url);
  const resolvedVideoUrl = state.vision?.processed_video_url ?? state.inputs.video_url ?? undefined;
  const videoUrl = resolvedVideoUrl
    ? resolvedVideoUrl.startsWith('http')
      ? resolvedVideoUrl
      : `${apiBaseUrl}${resolvedVideoUrl}`
    : undefined;

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="glass-panel rounded-[2rem] p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="label-chip w-fit">Predictive Dashboard</div>
              <h1 className="mt-4 text-3xl font-semibold text-white">Real-time dairy decision cockpit.</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Health, production, and optional vision outputs are loaded from the backend and mirrored in Firestore.
              </p>
            </div>
            <button className="soft-button bg-white/10 text-white hover:bg-white/15" onClick={() => navigate('/simulate')}>
              <ArrowLeft className="h-4 w-4" />
              Re-run simulation
            </button>
          </div>
        </header>

        {state.production.drop_alert ? (
          <div className="flex items-center gap-3 rounded-[1.75rem] border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-rose-100 shadow-[0_20px_40px_rgba(255,107,120,0.12)]">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">ALERT: PRODUCTION DROP DETECTED</span>
          </div>
        ) : null}

        <section className={`grid gap-6 ${showVision ? 'xl:grid-cols-3' : 'xl:grid-cols-2'}`}>
          <GaugeChart score={state.health.health_score} status={state.health.health_status} />
          <ProductionChart yesterday={state.inputs.milk_yesterday_liters} predicted={state.production.milk_yield_liters} />
          {showVision ? <VideoPanel videoUrl={videoUrl} /> : null}
        </section>

        <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
          Prediction {state.prediction_id} · {state.source}
        </div>
      </div>
    </main>
  );
}
