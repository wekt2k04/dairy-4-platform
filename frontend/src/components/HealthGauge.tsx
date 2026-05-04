type Props = {
  score: number;
  status: string;
};

const diameter = 190;
const radius = 72;
const strokeWidth = 14;
const circumference = 2 * Math.PI * radius;

function statusTone(status: string) {
  if (status === "Healthy") {
    return { ring: "stroke-emerald-500", pill: "bg-emerald-100 text-emerald-800 border-emerald-200" };
  }
  if (status === "Warning") {
    return { ring: "stroke-amber-500", pill: "bg-amber-100 text-amber-900 border-amber-200" };
  }
  return { ring: "stroke-rose-500", pill: "bg-rose-100 text-rose-800 border-rose-200" };
}

export function HealthGauge({ score, status }: Props) {
  const pct = Math.max(0, Math.min(100, score));
  const dashOffset = circumference - (pct / 100) * circumference;
  const tone = statusTone(status);

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-[2rem] border border-pasture/10 bg-white/85 p-6 shadow-panel backdrop-blur-sm">
      <div className="relative flex items-center justify-center" style={{ width: diameter, height: diameter }}>
        <svg viewBox="0 0 190 190" className="h-[190px] w-[190px] -rotate-90">
          <circle
            cx="95"
            cy="95"
            r={radius}
            fill="none"
            className="stroke-slate-200"
            strokeWidth={strokeWidth}
          />
          <circle
            cx="95"
            cy="95"
            r={radius}
            fill="none"
            className={`${tone.ring} drop-shadow-sm`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div className="absolute flex flex-col items-center gap-1 text-center">
          <span className="font-display text-5xl font-bold tracking-tight text-slateInk">{Math.round(pct)}</span>
          <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slateInk/55">Health score</span>
        </div>
      </div>
      <span className={`rounded-full border px-4 py-1 text-sm font-semibold ${tone.pill}`}>{status}</span>
    </div>
  );
}
