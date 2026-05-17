import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string;
  helper?: string;
  accent?: string;
  trend?: ReactNode;
}

export default function StatCard({ label, value, helper, accent = 'from-accent/30 to-accent2/30', trend }: StatCardProps) {
  return (
    <div className="rounded-2xl border p-5 transition hover:shadow-sm" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-card)' }}>
      <div className="flex items-center justify-between">
        <div className={`mb-3 h-1.5 w-16 rounded-full bg-gradient-to-r ${accent}`} />
        {trend && <div className="mb-3">{trend}</div>}
      </div>
      <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{label}</div>
      <div className="mt-2 text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</div>
      {helper ? <div className="mt-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>{helper}</div> : null}
    </div>
  );
}
