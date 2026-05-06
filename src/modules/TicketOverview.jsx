import { MetricCard } from '../components/MetricCard';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#4f8ef7', '#e09a3a', '#4caf78', '#e05c5c'];

export function TicketOverview({ data }) {
  if (!data) return null;
  const { summary, open, categories, sla } = data;

  // Build month-over-month chart data (last 12 months)
  const monthKeys = Object.keys(summary.byMonth).sort();
  const midpoint = Math.floor(monthKeys.length / 2);
  const currentMonths = monthKeys.slice(midpoint);
  const priorMonths = monthKeys.slice(0, midpoint);

  const volumeData = currentMonths.map((month, i) => ({
    month: new Date(month + '-01').toLocaleString('default', { month: 'short' }),
    current: summary.byMonth[month] || 0,
    prior: summary.byMonth[priorMonths[i]] || 0
  }));

  // Category pie
  const catData = Object.entries(categories.byCategory).map(([name, value]) => ({ name, value }));

  // Deltas
  const currentTotal = currentMonths.reduce((s, m) => s + (summary.byMonth[m] || 0), 0);
  const priorTotal = priorMonths.reduce((s, m) => s + (summary.byMonth[m] || 0), 0);
  const volumeChange = priorTotal ? (((currentTotal - priorTotal) / priorTotal) * 100).toFixed(0) : 0;
  const slaChange = (sla.current.breachRate - sla.prior.breachRate).toFixed(1);

  const tickStyle = { fill: 'var(--text-secondary)', fontSize: 11, fontFamily: 'DM Mono, monospace' };
  const tooltipStyle = { background: '#1c1f25', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#e8e6e1', fontSize: 12 };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <MetricCard label="Tickets (6mo)" value={currentTotal.toLocaleString()}
          delta={`${volumeChange > 0 ? '+' : ''}${volumeChange}% vs prior 6mo`}
          deltaDir={volumeChange > 0 ? 'up-bad' : 'down-good'} />
        <MetricCard label="Avg open age" value={`${open.avgAgeInDays}d`}
          delta="Days tickets stay open" deltaDir="neutral" />
        <MetricCard label="SLA breach rate" value={`${sla.current.breachRate}%`}
          delta={`${slaChange > 0 ? '+' : ''}${slaChange}pts vs prior 6mo`}
          deltaDir={slaChange > 0 ? 'up-bad' : 'down-good'} />
        <MetricCard label="Open tickets" value={open.total.toLocaleString()}
          delta="Currently open" deltaDir="neutral" />
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          className="col-span-3 rounded-xl p-6">
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Monthly ticket volume</p>
          <p className="text-xs mb-5" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace' }}>
            Current 6 months vs prior 6 months
          </p>
          <div className="flex gap-4 mb-4">
            <span className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#4f8ef7' }} /> Current
            </span>
            <span className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: 'rgba(79,142,247,0.3)' }} /> Prior
            </span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={volumeData} barGap={3}>
              <XAxis dataKey="month" tick={tickStyle} axisLine={false} tickLine={false} />
              <YAxis tick={tickStyle} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="current" fill="#4f8ef7" radius={[3,3,0,0]} />
              <Bar dataKey="prior" fill="rgba(79,142,247,0.3)" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          className="col-span-2 rounded-xl p-6">
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>By category</p>
          <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace' }}>Current 6 months</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={catData} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                dataKey="value" paddingAngle={3}>
                {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Legend iconSize={10} iconType="square"
                formatter={(v) => <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{v}</span>} />
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
