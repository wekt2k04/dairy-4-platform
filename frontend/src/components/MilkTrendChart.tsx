type Props = {
  value: number;
  milkYesterday: number;
};

function buildPoints(value: number, milkYesterday: number) {
  const baseline = milkYesterday || value || 1;
  return Array.from({ length: 7 }, (_, index) => {
    const drift = index - 3;
    const wave = Math.sin(index * 0.8) * 0.8;
    const projected = Math.max(0, value + drift * 0.12 * baseline * 0.03 + wave * 0.55);
    return {
      label: `D-${6 - index}`,
      projected: Number(projected.toFixed(2)),
    };
  });
}

export function MilkTrendChart({ value, milkYesterday }: Props) {
  const data = buildPoints(value, milkYesterday);
  const width = 580;
  const height = 240;
  const padding = 28;
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  const maxValue = Math.max(...data.map((point) => point.projected), value * 1.2, 1);
  const minValue = Math.max(0, Math.min(...data.map((point) => point.projected), value * 0.82));
  const range = Math.max(maxValue - minValue, 1);

  const points = data.map((point, index) => {
    const x = padding + (usableWidth / (data.length - 1)) * index;
    const y = padding + usableHeight - ((point.projected - minValue) / range) * usableHeight;
    return { ...point, x, y };
  });

  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");

  return (
    <div className="rounded-[2rem] border border-pasture/10 bg-white/85 p-5 shadow-panel backdrop-blur-sm">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-pasture/55">Production outlook</p>
          <h3 className="mt-2 font-display text-2xl font-bold text-slateInk">Predicted milk yield</h3>
        </div>
        <div className="rounded-2xl bg-pasture/8 px-4 py-2 text-right">
          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-pasture/60">Current forecast</div>
          <div className="font-display text-2xl font-bold text-pastureDark">{value.toFixed(2)} L</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-gradient-to-br from-sand-50 via-white to-emerald-50">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[240px] w-full">
          <defs>
            <linearGradient id="milkLine" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#2C5E4E" />
              <stop offset="100%" stopColor="#C46A3C" />
            </linearGradient>
            <linearGradient id="milkArea" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(44, 94, 78, 0.26)" />
              <stop offset="100%" stopColor="rgba(44, 94, 78, 0.02)" />
            </linearGradient>
          </defs>

          {[0, 1, 2, 3].map((index) => {
            const y = padding + (usableHeight / 3) * index;
            return <line key={index} x1={padding} x2={width - padding} y1={y} y2={y} stroke="#dce4dc" strokeDasharray="4 8" />;
          })}

          <path
            d={`${path} L ${points[points.length - 1]?.x ?? width - padding} ${height - padding} L ${padding} ${height - padding} Z`}
            fill="url(#milkArea)"
          />
          <path d={path} fill="none" stroke="url(#milkLine)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

          {points.map((point) => (
            <g key={point.label}>
              <circle cx={point.x} cy={point.y} r="5.5" fill="#f4ebdd" stroke="#2C5E4E" strokeWidth="3" />
              <text x={point.x} y={height - 10} textAnchor="middle" fontSize="11" fill="#5d7068">
                {point.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
