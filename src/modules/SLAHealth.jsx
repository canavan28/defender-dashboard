import { MetricCard } from '../components/MetricCard';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function SLAHealth({ data }) {
  if (!data) return null;
  const { sla, slaBreachRate } = data;

  const chartData = [
    { period: 'Prior', breachRate: sla?.prior?.breachRate || 0 },
    { period: 'Current', breachRate: slaBreachRate || 0 }
  ];

  const change = ((slaBreachRate || 0) - (sla?.prior?.breachRate || 0)).toFixed(1);
  const tickStyle = { fill: 'var(--text-secondary)', fontSize: 11, fontFamily: 'DM Mono, monospace' };
  const tooltipStyle = {
  background: '#ffffff', border: '1px solid rgba(0,0,0,0.1)',
  borderRadius: 8, color: '#1a1b1e', fontSize: 12,
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
};

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <MetricCard label="Current breach rate" value={`${slaBreachRate}%`}
          delta={`${change > 0 ? '+' : ''}${change}pts vs prior period`}
          deltaDir={change > 0 ? 'up-bad' : 'down-good'} />
        <MetricCard label="Tickets evaluated" value={(sla?.current?.total || 0).toLocaleString()}
          delta="With first response due date" deltaDir="neutral" />
        <MetricCard label="Tickets met SLA" value={Math.round((sla?.current?.total || 0) * (1 - (slaBreachRate || 0) / 100)).toLocaleString()}
          delta="On-time first responses" deltaDir="neutral" />
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        className="rounded-xl p-6 max-w-lg">
        <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>SLA breach rate trend</p>
        <p className="text-xs mb-6" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace' }}>
          Period over period
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData}>
            <XAxis dataKey="period" tick={tickStyle} axisLine={false} tickLine={false} />
            <YAxis tick={tickStyle} axisLine={false} tickLine={false} unit="%" />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, 'Breach rate']} />
            <Line type="monotone" dataKey="breachRate" stroke="var(--red)"
              strokeWidth={2} dot={{ fill: 'var(--red)', r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}