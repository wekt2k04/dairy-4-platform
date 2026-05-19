import type { HealthStatus } from '../types';

interface GaugeChartProps {
  score: number;
  status: HealthStatus;
}

const statusTone: Record<HealthStatus, string> = {
  Healthy: 'text-emerald-600 dark:text-emerald-300 border-emerald-500/30 bg-emerald-500/10',
  Warning: 'text-amber-600 dark:text-amber-300 border-amber-500/30 bg-amber-500/10',
  Critical: 'text-rose-600 dark:text-rose-300 border-rose-500/30 bg-rose-500/10',
};

const statusFill: Record<HealthStatus, string> = {
  Healthy: '#10b981',
  Warning: '#f59e0b',
  Critical: '#f43f5e',
};

const healthMessages: Record<HealthStatus, { title: string; description: string }> = {
  Healthy: {
    title: 'Vache en bon état',
    description: 'Tous les paramètres sont dans les normes. Continuez la surveillance routinière.',
  },
  Warning: {
    title: 'Attention requise',
    description: 'Certains paramètres sont en dehors des limites normales. Surveillez de près.',
  },
  Critical: {
    title: 'État critique',
    description: 'La vache nécessite une attention immédiate. Intervention vétérinaire recommandée.',
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
          <div className="text-xs uppercase tracking-[0.24em]" style={{ color: 'var(--text-secondary)' }}>Health Block</div>
          <div className="mt-2 text-lg font-medium" style={{ color: 'var(--text-primary)' }}>Cow wellness score</div>
        </div>
        <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusTone[status]}`}>{status}</div>
      </div>

      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="relative h-48 w-48 shrink-0">
          <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90">
            <circle cx="90" cy="90" r={radius} fill="none" stroke="rgba(128,128,128,0.15)" strokeWidth={stroke} />
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
            <div className="text-5xl font-semibold" style={{ color: 'var(--text-primary)' }}>{Math.round(score)}</div>
            <div className="mt-2 text-xs uppercase tracking-[0.24em]" style={{ color: 'var(--text-secondary)' }}>/ 100</div>
          </div>
        </div>

        <div className="space-y-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{healthMessages[status].title}</p>
          <p>{healthMessages[status].description}</p>
        </div>
      </div>
    </div>
  );
}
