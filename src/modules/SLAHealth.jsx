import { MetricCard } from '../components/MetricCard';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function SLAHealth({ data }) {
  if (!data) return null;
  const { sla } = data;
  const change = (sla.current.breachRate - sla.prior.breachRate).toFixed(1);

  const chartData = [
    { period: 'Prior 6mo', breachRate: sla.prior.breachRate },
    { period: 'Current 6mo', breachRate: sla.current.breachRate }
  ];

  const tickStyle = { fill: 'var(--text-secondary)', fontSize: 11, fontFamily: 'DM Mono, monospace' };
  const tooltipStyle = { background: '#1c1f25', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#e8e6e1', fontSize: 12 };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <MetricCard label="Current breach rate" value={`${sla.current.breachRate}%`}
          delta={`${change > 0 ? '+' : ''}${change}pts period over period`}
          deltaDir={change > 0 ? 'up-bad' : 'down-good'} />
        <MetricCard label="Prior breach rate" value={`${sla.prior.breachRate}%`}
          delta="Prior 6 months" deltaDir="neutral" />
        <MetricCard label="Tickets evaluated" value={sla.current.total.toLocaleString()}
          delta="Completed tickets (current)" deltaDir="neutral" />
        <MetricCard label="Tickets met SLA" value={Math.round(sla.current.total * (1 - sla.current.breachRate / 100)).toLocaleString()}
          delta="On-time completions" deltaDir="neutral" />
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        className="rounded-xl p-6 max-w-lg">
        <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>SLA breach rate trend</p>
        <p className="text-xs mb-6" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace' }}>
          Period over period comparison
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData}>
            <XAxis dataKey="period" tick={tickStyle} axisLine={false} tickLine={false} />
            <YAxis tick={tickStyle} axisLine={false} tickLine={false} unit="%" />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, 'Breach rate']} />
            <Line type="monotone" dataKey="breachRate" stroke="var(--red)" strokeWidth={2} dot={{ fill: 'var(--red)', r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
