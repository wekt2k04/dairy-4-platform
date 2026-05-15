import type { HealthStatus } from '../types';

interface GaugeChartProps {
  score: number;
  status: HealthStatus;
}

const statusTone: Record<HealthStatus, string> = {
  Healthy: 'text-emerald-300 border-emerald-400/30 bg-emerald-400/10',
  Warning: 'text-amber-300 border-amber-400/30 bg-amber-400/10',
  Critical: 'text-rose-300 border-rose-400/30 bg-rose-400/10',
};

const statusFill: Record<HealthStatus, string> = {
  Healthy: '#77c98b',
  Warning: '#f9b46b',
  Critical: '#ff6b78',
};
const healthMessages: Record<HealthStatus, { title: string; description: string }> = {
  Healthy: {
    title: '✅ Vache en bon état',
    description: 'Tous les paramètres sont dans les normes. Continuez la surveillance routinière.',
  },
  Warning: {
    title: '⚠️ Attention requise',
    description: 'Certains paramètres sont en dehors des limites normales. Surveillez de près et consultez un vétérinaire.',
  },
  Critical: {
    title: '🚨 État critique',
    description: 'La vache nécessite une attention immédiate. Intervention vétérinaire recommandée sans délai.',
  },
};
export default function GaugeChart({ score, status }: GaugeChartProps) {
  const radius = 72;
  const stroke = 14;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.max(0, Math.min(100, score)) / 100) * circumference;

  return (
    <div className="glass-panel rounded-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Health Block</div>
          <div className="mt-2 text-lg font-medium text-white">Cow wellness score</div>
        </div>
        <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusTone[status]}`}>{status}</div>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative h-48 w-48 shrink-0">
          <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90">
            <circle cx="90" cy="90" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
            <circle
              cx="90"
              cy="90"
              r={radius}
              fill="none"
              stroke={statusFill[status]}
              strokeWidth={stroke}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-5xl font-semibold text-white">{Math.round(score)}</div>
            <div className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-400">/ 100</div>
          </div>
        </div>

        <div className="space-y-3 text-sm text-slate-300">
          <p className="font-semibold text-white">{healthMessages[status].title}</p>
          <p>{healthMessages[status].description}</p>
        </div>
      </div>
    </div>
  );
}
