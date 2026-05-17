import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ProductionChartProps {
  yesterday: number;
  predicted: number;
}

export default function ProductionChart({ yesterday, predicted }: ProductionChartProps) {
  const change = predicted - yesterday;
  const pctChange = yesterday > 0 ? ((change / yesterday) * 100) : 0;
  const isUp = change > 0;
  const isDown = change < 0;
  const data = [
    { label: 'Yesterday', liters: yesterday },
    { label: 'Forecast', liters: predicted },
  ];

  return (
    <div className="glass-panel rounded-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.24em]" style={{ color: 'var(--text-secondary)' }}>Production Block</div>
          <div className="mt-2 text-lg font-medium" style={{ color: 'var(--text-primary)' }}>Milk yield forecast</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            {predicted.toFixed(1)} <span className="text-sm font-normal" style={{ color: 'var(--text-secondary)' }}>L</span>
          </div>
          <div className={`flex items-center gap-1 text-xs font-medium mt-0.5 ${
            isUp ? 'text-emerald-500' : isDown ? 'text-rose-500' : 'text-slate-400'
          }`}>
            {isUp ? <TrendingUp className="h-3 w-3" /> : isDown ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
            {isUp ? '+' : ''}{pctChange.toFixed(1)}% vs yesterday
          </div>
        </div>
      </div>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 12, left: 0, bottom: 0 }}>
            <XAxis dataKey="label" tickLine={false} axisLine={false} style={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
            <YAxis tickLine={false} axisLine={false} style={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 12,
                color: 'var(--text-primary)',
                fontSize: 12,
              }}
            />
            <Bar dataKey="liters" radius={[8, 8, 0, 0]} maxBarSize={80}>
              {data.map((entry, index) => (
                <Cell key={index} fill={index === 0 ? 'var(--text-secondary)' : 'var(--accent)'} opacity={index === 0 ? 0.4 : 1} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
