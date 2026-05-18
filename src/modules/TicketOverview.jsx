import { MetricCard } from '../components/MetricCard';
import { QuarterSelector } from '../components/QuarterSelector';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#4f8ef7', '#e09a3a', '#4caf78', '#e05c5c', '#9b72f7', '#f76f4f', '#4fd4c4', '#f7c94f'];

const tooltipStyle = {
  background: '#ffffff', border: '1px solid rgba(0,0,0,0.1)',
  borderRadius: 8, color: '#1a1b1e', fontSize: 12,
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
};

export function TicketOverview({ metrics, selectedQuarterKey, onSelectQuarter }) {
  if (!metrics) return null;
  const {
    ytd, quarterlyTrend,
    avgResolutionDays, slaBreachRate,
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

  // Selected quarter calculations
  const selectedQ = selectedQuarterKey ? (() => {
    const year = parseInt(selectedQuarterKey.split('-Q')[0]);
    const quarter = parseInt(selectedQuarterKey.split('-Q')[1]);
    const priorKey = `${year - 1}-Q${quarter}`;
    const currentCount = quarterlyTrend.find(q => q.key === selectedQuarterKey)?.count || 0;
    const priorCount = quarterlyTrend.find(q => q.key === priorKey)?.count || 0;
    const change = priorCount ? (((currentCount - priorCount) / priorCount) * 100).toFixed(0) : null;
    return {
      currentLabel: `Q${quarter} ${year}`,
      priorLabel: `Q${quarter} ${year - 1}`,
      currentCount, priorCount, change
    };
  })() : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>

        {/* YTD card */}
        <div className="it-card" style={{ padding: '18px 20px 16px' }}>
          <div className="it-eyebrow">Year to date</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6 }}>
            <span style={{ color: 'var(--ink3)', fontSize: 22, fontVariantNumeric: 'tabular-nums' }}>
              {ytd.prior.toLocaleString()}
            </span>
            <span style={{ color: 'var(--ink4)', fontSize: 16 }}>→</span>
            <span style={{ fontSize: 30, fontWeight: 500, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
              {ytd.current.toLocaleString()}
            </span>
          </div>
          <div style={{ marginTop: 8, fontSize: 12.5, color: ytd.change > 0 ? 'var(--red)' : 'var(--green)' }}>
            {ytd.change > 0 ? '+' : ''}{ytd.change}% year over year
          </div>
          <div className="it-mono" style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 6 }}>
            {ytd.priorLabel} · {ytd.currentLabel}
          </div>
        </div>

        {/* Selected quarter card */}
        <div className="it-card" style={{ padding: '18px 20px 16px' }}>
          <div className="it-eyebrow">Selected quarter</div>
          {selectedQ ? (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6 }}>
                {selectedQ.priorCount > 0 && (
                  <>
                    <span style={{ color: 'var(--ink3)', fontSize: 22, fontVariantNumeric: 'tabular-nums' }}>
                      {selectedQ.priorCount.toLocaleString()}
                    </span>
                    <span style={{ color: 'var(--ink4)', fontSize: 16 }}>→</span>
                  </>
                )}
                <span style={{ fontSize: 30, fontWeight: 500, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                  {selectedQ.currentCount.toLocaleString()}
                </span>
              </div>
              {selectedQ.change !== null && selectedQ.priorCount > 0 ? (
                <div style={{ marginTop: 8, fontSize: 12.5, color: parseInt(selectedQ.change) > 0 ? 'var(--red)' : 'var(--green)' }}>
                  {parseInt(selectedQ.change) > 0 ? '+' : ''}{selectedQ.change}% vs same quarter prior year
                </div>
              ) : (
                <div style={{ marginTop: 8, fontSize: 12.5, color: 'var(--ink3)' }}>
                  No prior year data available
                </div>
              )}
              <div className="it-mono" style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 6 }}>
                {selectedQ.priorLabel} · {selectedQ.currentLabel}
              </div>
            </>
          ) : (
            <div style={{ marginTop: 6, fontSize: 13, color: 'var(--ink3)' }}>
              Select a quarter below
            </div>
          )}
        </div>

        {/* Avg resolution */}
        <MetricCard
          eyebrow="Avg resolution"
          value={<>{avgResolutionDays}<span style={{ fontSize: 16, color: 'var(--ink3)', marginLeft: 2 }}>d</span></>}
          foot="Completed tickets"
        />

        {/* SLA breach rate */}
        <MetricCard
          eyebrow="SLA breach rate"
          value={<>{slaBreachRate}<span style={{ fontSize: 16, color: 'var(--ink3)', marginLeft: 2 }}>%</span></>}
          foot="First response breaches"
          footTone={slaBreachRate > 10 ? 'neg' : 'pos'}
        />
      </div>

      {/* Quarterly trend chart */}
      <div className="it-card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div className="it-section-title">Quarterly ticket volume</div>
            <div className="it-section-sub">
              Click a quarter to filter all views
              {selectedQLabel && ` · Selected: ${selectedQLabel}`}
            </div>
          </div>
          <QuarterSelector
            quarters={quarterlyTrend}
            selectedKey={selectedQuarterKey}
            onChange={onSelectQuarter}
          />
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            data={quarterlyTrend}
            barGap={4}
            onClick={(e) => e?.activePayload?.[0] && onSelectQuarter(e.activePayload[0].payload.key)}>
            <XAxis dataKey="label" tick={tickStyle} axisLine={false} tickLine={false} />
            <YAxis tick={tickStyle} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
            <Bar
              dataKey="count"
              name="Tickets"
              radius={[4, 4, 0, 0]}
              style={{ cursor: 'pointer' }}
              shape={(props) => {
                const { x, y, width, height, payload } = props;
                return (
                  <rect
                    x={x} y={y} width={width} height={height}
                    fill={payload.isSelected ? '#1d4ed8' : '#2563eb'}
                    opacity={payload.isSelected ? 1 : 0.65}
                    rx={4} ry={4}
                  />
                );
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Issue type donut */}
      <div className="it-card" style={{ padding: 20 }}>
        <div className="it-section-title">Tickets by issue type</div>
        <div className="it-section-sub" style={{ marginBottom: 16 }}>
          {selectedQLabel || 'All available data'}
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={pieData}
              cx="40%" cy="50%"
              innerRadius={65} outerRadius={100}
              dataKey="value" paddingAngle={3}>
              {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Legend
              layout="vertical" align="right" verticalAlign="middle"
              iconSize={10} iconType="square"
              formatter={(v) => <span style={{ color: 'var(--ink3)', fontSize: 11 }}>{v}</span>}
            />
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}