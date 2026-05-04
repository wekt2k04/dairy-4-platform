import { AlertTriangle, ArrowLeft, BadgeCheck, Milk, ShieldCheck } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import GaugeChart from '../components/GaugeChart';
import ProductionChart from '../components/ProductionChart';
import StatCard from '../components/StatCard';
import VideoPanel from '../components/VideoPanel';
import type { DashboardState } from '../types';

export default function DashboardPage() {
  const navigate = useNavigate();
  const state = useMemo(() => {
    const raw = localStorage.getItem('dairy4:dashboard');
    return (raw ? (JSON.parse(raw) as DashboardState) : null) ?? null;
  }, []);

  if (!state?.health || !state.production) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-8">
        <div className="glass-panel w-full max-w-xl rounded-[2rem] p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-accent">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-white">No simulation data found</h1>
          <p className="mt-2 text-sm text-slate-300">Run a simulation first so the dashboard has predictions to render.</p>
          <button className="soft-button mt-6 bg-gradient-to-r from-accent to-accent2" onClick={() => navigate('/simulate')}>
            <ArrowLeft className="h-4 w-4" />
            Back to simulator
          </button>
        </div>
      </main>
    );
  }

  const predicted = state.production.milk_yield_liters;
  const dropBanner = state.production.drop_alert;
  const gaugeStatus = state.health.health_status;

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="glass-panel rounded-[2rem] p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="label-chip w-fit">Predictive Dashboard</div>
              <h1 className="mt-4 text-3xl font-semibold text-white">Real-time dairy decision cockpit.</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Health, yield, and behavior outputs are projected from the backend inference layer and persisted for the operator view.
              </p>
            </div>
            <button className="soft-button bg-white/10 text-white hover:bg-white/15" onClick={() => navigate('/simulate')}>
              <ArrowLeft className="h-4 w-4" />
              Re-run simulation
            </button>
          </div>
        </header>

        {dropBanner ? (
          <div className="flex items-center gap-3 rounded-[1.75rem] border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-rose-100 shadow-[0_20px_40px_rgba(255,107,120,0.12)]">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">ALERT: PRODUCTION DROP DETECTED</span>
          </div>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[0.98fr_1.02fr]">
          <GaugeChart score={state.health.health_score} status={gaugeStatus} />
          <div className="space-y-6">
            <StatCard label="Predicted milk yield" value={`${predicted.toFixed(1)} L`} helper="Forecast generated from the production wrapper." accent="from-accent to-accent2" />
            <StatCard label="Detection state" value={dropBanner ? 'Drop risk elevated' : 'Stable trend'} helper={`Confidence ${((state.production.confidence_score ?? 0) * 100).toFixed(0)}%`} accent={dropBanner ? 'from-danger to-warn' : 'from-accent2 to-accent'} />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <ProductionChart yesterday={state.inputs.milk_yesterday_liters} predicted={predicted} />
          <VideoPanel videoUrl={state.videoUrl ? `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'}${state.videoUrl}` : undefined} />
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          <StatCard
            label="Temperature"
            value={`${state.inputs.temperature_c.toFixed(1)} °C`}
            helper="Bolus feed from the simulator"
          />
          <StatCard
            label="Heart rate"
            value={`${state.inputs.heart_rate_bpm} bpm`}
            helper="Validated by FastAPI schema"
          />
          <StatCard
            label="Rumen pH"
            value={state.inputs.rumen_ph.toFixed(1)}
            helper="Mapped into the health RF wrapper"
          />
        </section>
      </div>
    </main>
  );
}
