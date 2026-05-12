import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const tooltipStyle = {
  background: '#ffffff', border: '1px solid rgba(0,0,0,0.1)',
  borderRadius: 8, color: '#1a1b1e', fontSize: 12,
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
};

function MetricCard({ label, value, delta, deltaDir }) {
  const deltaColor =
    deltaDir === 'up-bad' ? 'text-red-600' :
    deltaDir === 'down-good' ? 'text-green-600' :
    'text-gray-400';
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
      className="rounded-xl p-5">
      <p style={{ color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace' }}
        className="text-xs uppercase tracking-widest mb-3">{label}</p>
      <p className="text-3xl font-light mb-2" style={{ color: 'var(--text-primary)' }}>{value}</p>
      {delta && <p className={`text-xs font-medium ${deltaColor}`}>{delta}</p>}
    </div>
  );
}

export function SLAHealth({ metrics }) {
  if (!metrics) return null;
  const { slaBreachRate, slaEligibleCount, quarterlyTrend, selectedQLabel } = metrics;

  const tickStyle = { fill: '#6b7280', fontSize: 11, fontFamily: 'DM Mono, monospace' };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <MetricCard label="SLA breach rate" value={`${slaBreachRate}%`}
          delta={selectedQLabel ? `For ${selectedQLabel}` : 'First response breaches'}
          deltaDir={slaBreachRate > 10 ? 'up-bad' : 'down-good'} />
        <MetricCard label="Tickets evaluated" value={slaEligibleCount.toLocaleString()}
          delta="With first response due date" deltaDir="neutral" />
        <MetricCard label="Tickets met SLA"
          value={Math.round(slaEligibleCount * (1 - slaBreachRate / 100)).toLocaleString()}
          delta="On-time first responses" deltaDir="neutral" />
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        className="rounded-xl p-6">
        <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
          Ticket volume trend
        </p>
        <p className="text-xs mb-6" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace' }}>
          Quarterly — use Ticket Overview to filter SLA by quarter
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={quarterlyTrend}>
            <XAxis dataKey="label" tick={tickStyle} axisLine={false} tickLine={false} />
            <YAxis tick={tickStyle} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="count" name="Tickets" stroke="#2563eb"
              strokeWidth={2} dot={{ fill: '#2563eb', r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}