import { MetricCard } from '../components/MetricCard';
import { QuarterSelector } from '../components/QuarterSelector';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#4f8ef7','#e09a3a','#4caf78','#e05c5c','#9b72f7','#f76f4f','#4fd4c4','#f7c94f'];

const tooltipStyle = {
  background: '#ffffff', border: '1px solid rgba(0,0,0,0.1)',
  borderRadius: 8, color: '#1a1b1e', fontSize: 12,
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
};

export function TicketOverview({ metrics, selectedQuarterKey, onSelectQuarter }) {
  if (!metrics) return null;
  const {
    ytd, currentQuarter, quarterlyTrend,
    avgOpenAge, avgResolutionDays, slaBreachRate,
    byIssueType, selectedQLabel
  } = metrics;

  const tickStyle = { fill: '#6b7280', fontSize: 11, fontFamily: 'DM Mono, monospace' };

  // Issue type pie
  const issueEntries = Object.entries(byIssueType || {}).sort((a, b) => b[1] - a[1]);
  const top7 = issueEntries.slice(0, 7);
  const otherCount = issueEntries.slice(7).reduce((s, [, v]) => s + v, 0);
  const pieData = [
    ...top7.map(([name, value]) => ({ name, value })),
    ...(otherCount > 0 ? [{ name: 'Other', value: otherCount }] : [])
  ];

  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid grid-cols-4 gap-4">
        {/* YTD comparison card */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
          className="rounded-xl p-5 col-span-1">
          <p style={{ color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace' }}
            className="text-xs uppercase tracking-widest mb-3">Year to Date</p>
          <div className="flex items-end gap-3 mb-2">
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{ytd.priorLabel}</p>
              <p className="text-2xl font-light" style={{ color: 'var(--text-secondary)' }}>
                {ytd.prior.toLocaleString()}
              </p>
            </div>
            <p className="text-lg mb-1" style={{ color: 'var(--text-secondary)' }}>→</p>
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{ytd.currentLabel}</p>
              <p className="text-2xl font-light" style={{ color: 'var(--text-primary)' }}>
                {ytd.current.toLocaleString()}
              </p>
            </div>
          </div>
          <p className={`text-xs font-medium ${ytd.change > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {ytd.change > 0 ? '+' : ''}{ytd.change}% year over year
          </p>
        </div>

        {/* Current quarter comparison card */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
          className="rounded-xl p-5 col-span-1">
          <p style={{ color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace' }}
            className="text-xs uppercase tracking-widest mb-3">Current Quarter</p>
          <div className="flex items-end gap-3 mb-2">
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{currentQuarter.priorLabel}</p>
              <p className="text-2xl font-light" style={{ color: 'var(--text-secondary)' }}>
                {currentQuarter.prior.toLocaleString()}
              </p>
            </div>
            <p className="text-lg mb-1" style={{ color: 'var(--text-secondary)' }}>→</p>
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{currentQuarter.currentLabel}</p>
              <p className="text-2xl font-light" style={{ color: 'var(--text-primary)' }}>
                {currentQuarter.current.toLocaleString()}
              </p>
            </div>
          </div>
          <p className={`text-xs font-medium ${currentQuarter.change > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {currentQuarter.change > 0 ? '+' : ''}{currentQuarter.change}% vs same quarter prior year
          </p>
        </div>

        <MetricCard label="Avg resolution" value={`${avgResolutionDays}d`}
          delta="Completed tickets" deltaDir="neutral" />
        <MetricCard label="SLA breach rate" value={`${slaBreachRate}%`}
          delta="First response breaches"
          deltaDir={slaBreachRate > 10 ? 'up-bad' : 'down-good'} />
      </div>

      {/* Quarterly trend chart */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        className="rounded-xl p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Quarterly ticket volume
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace' }}>
              Click a quarter to filter all views
              {selectedQLabel && ` · Selected: ${selectedQLabel}`}
            </p>
          </div>
          <QuarterSelector
            quarters={quarterlyTrend}
            selectedKey={selectedQuarterKey}
            onChange={onSelectQuarter}
          />
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={quarterlyTrend} barGap={4}
            onClick={(e) => e?.activePayload?.[0] && onSelectQuarter(e.activePayload[0].payload.key)}>
            <XAxis dataKey="label" tick={tickStyle} axisLine={false} tickLine={false} />
            <YAxis tick={tickStyle} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
            <Bar dataKey="count" name="Tickets" radius={[4,4,0,0]}
              fill="#2563eb"
              style={{ cursor: 'pointer' }}
              shape={(props) => {
                const { x, y, width, height, payload } = props;
                const selected = payload.isSelected;
                return (
                  <rect x={x} y={y} width={width} height={height}
                    fill={selected ? '#1d4ed8' : '#2563eb'}
                    opacity={selected ? 1 : 0.65}
                    rx={4} ry={4} />
                );
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Issue type */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        className="rounded-xl p-6">
        <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
          Tickets by issue type
        </p>
        <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace' }}>
          {selectedQLabel || 'All available data'}
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={pieData} cx="40%" cy="50%" innerRadius={65} outerRadius={100}
              dataKey="value" paddingAngle={3}>
              {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Legend layout="vertical" align="right" verticalAlign="middle"
              iconSize={10} iconType="square"
              formatter={(v) => <span style={{ color: '#6b7280', fontSize: 11 }}>{v}</span>} />
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}