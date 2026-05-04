interface StatCardProps {
  label: string;
  value: string;
  helper?: string;
  accent?: string;
}

export default function StatCard({ label, value, helper, accent = 'from-accent/30 to-accent2/30' }: StatCardProps) {
  return (
    <div className="glass-panel rounded-3xl p-5">
      <div className={`mb-4 h-1.5 w-20 rounded-full bg-gradient-to-r ${accent}`} />
      <div className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</div>
      <div className="mt-3 text-3xl font-semibold text-white">{value}</div>
      {helper ? <div className="mt-2 text-sm text-slate-300">{helper}</div> : null}
    </div>
  );
}
