import { useState } from 'react';
import { MetricCard } from '../components/MetricCard';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#4f8ef7','#e09a3a','#4caf78','#e05c5c','#9b72f7','#f76f4f','#4fd4c4','#f7c94f'];
const PERIODS = [3, 6, 9, 12];

export function TicketOverview({ data }) {
  if (!data) return null;
  const [comparePeriod, setComparePeriod] = useState(6);
  const { summary, open, issueTypes, slaBreachRate } = data;

  const tickStyle = { fill: 'var(--text-secondary)', fontSize: 11, fontFamily: 'DM Mono, monospace' };
  const tooltipStyle = {
  background: '#ffffff', border: '1px solid rgba(0,0,0,0.1)',
  borderRadius: 8, color: '#1a1b1e', fontSize: 12,
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
};

  // Build volume chart with selected comparison period
  const allMonths = Object.keys(summary.byMonth).sort();
  const totalMonths = allMonths.length;
  const periodMonths = allMonths.slice(-comparePeriod);
  const priorMonths = allMonths.slice(
    Math.max(0, totalMonths - comparePeriod * 2),
    Math.max(0, totalMonths - comparePeriod)
  );

  const volumeData = periodMonths.map((month, i) => {
  const currentLabel = new Date(month + '-01').toLocaleString('default', { month: 'short' });
  const priorLabel = priorMonths[i]
    ? new Date(priorMonths[i] + '-01').toLocaleString('default', { month: 'short' })
    : '';
  return {
    month: priorLabel ? `${currentLabel} vs ${priorLabel}` : currentLabel,
    current: summary.byMonth[month] || 0,
    prior: summary.byMonth[priorMonths[i]] || 0
  };
});

  const currentTotal = periodMonths.reduce((s, m) => s + (summary.byMonth[m] || 0), 0);
  const priorTotal = priorMonths.reduce((s, m) => s + (summary.byMonth[m] || 0), 0);
  const volumeChange = priorTotal
    ? (((currentTotal - priorTotal) / priorTotal) * 100).toFixed(0)
    : 0;

  // Issue type pie — top 7 + Other
  const issueEntries = Object.entries(issueTypes || {}).sort((a, b) => b[1] - a[1]);
  const top7 = issueEntries.slice(0, 7);
  const otherCount = issueEntries.slice(7).reduce((s, [, v]) => s + v, 0);
  const pieData = otherCount > 0 ? [...top7.map(([name, value]) => ({ name, value })), { name: 'Other', value: otherCount }]
    : top7.map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <MetricCard label={`Tickets (${comparePeriod}mo)`} value={currentTotal.toLocaleString()}
          delta={`${volumeChange > 0 ? '+' : ''}${volumeChange}% vs prior ${comparePeriod}mo`}
          deltaDir={volumeChange > 0 ? 'up-bad' : 'down-good'} />
        <MetricCard label="Avg age (open)" value={`${open.avgAgeInDays}d`}
          delta="Days since created" deltaDir="neutral" />
        <MetricCard label="Avg resolution" value={`${open.avgResolutionDays}d`}
          delta="Completed tickets" deltaDir="neutral" />
        <MetricCard label="SLA breach rate" value={`${slaBreachRate}%`}
          delta="First response breaches" deltaDir={slaBreachRate > 10 ? 'up-bad' : 'down-good'} />
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        className="rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Monthly ticket volume
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace' }}>
              Current period vs prior period
            </p>
          </div>
          <div className="flex gap-2">
            {PERIODS.map(p => (
              <button key={p} onClick={() => setComparePeriod(p)}
                style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 20,
                  border: '1px solid var(--border)', cursor: 'pointer',
                  background: comparePeriod === p ? 'var(--accent-dim)' : 'transparent',
                  color: comparePeriod === p ? 'var(--accent)' : 'var(--text-secondary)',
                  fontFamily: 'DM Mono, monospace'
                }}>
                {p}mo
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-4 mb-4">
          <span className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#4f8ef7' }} /> Current
          </span>
          <span className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: 'rgba(79,142,247,0.3)' }} /> Prior
          </span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={volumeData} barGap={3}>
            <XAxis dataKey="month" tick={tickStyle} axisLine={false} tickLine={false} />
            <YAxis tick={tickStyle} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="current" name="Current" fill="#4f8ef7" radius={[3,3,0,0]} />
            <Bar dataKey="prior" name="Prior" fill="rgba(79,142,247,0.3)" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        className="rounded-xl p-6">
        <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
          Tickets by issue type
        </p>
        <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace' }}>
          Last 12 months
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={pieData} cx="40%" cy="50%" innerRadius={65} outerRadius={100}
              dataKey="value" paddingAngle={3}>
              {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Legend layout="vertical" align="right" verticalAlign="middle" iconSize={10} iconType="square"
              formatter={(v) => <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{v}</span>} />
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}