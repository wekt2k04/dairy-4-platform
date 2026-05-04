import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface ProductionChartProps {
  yesterday: number;
  predicted: number;
}

export default function ProductionChart({ yesterday, predicted }: ProductionChartProps) {
  const data = [
    { label: 'Yesterday', liters: yesterday },
    { label: 'Forecast', liters: predicted },
  ];

  return (
    <div className="glass-panel rounded-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Production Block</div>
          <div className="mt-2 text-lg font-medium text-white">Milk yield forecast</div>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
          {predicted.toFixed(1)} L predicted
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 20, right: 12, left: 0, bottom: 0 }}>
            <XAxis dataKey="label" tickLine={false} axisLine={false} stroke="#9fb4d1" />
            <YAxis tickLine={false} axisLine={false} stroke="#9fb4d1" />
            <Tooltip
              contentStyle={{
                background: '#0d1730',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 16,
                color: '#e7eefb',
              }}
            />
            <Line type="monotone" dataKey="liters" stroke="#8ddcff" strokeWidth={4} dot={{ r: 5, fill: '#8ddcff' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
