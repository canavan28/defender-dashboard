import { useState } from 'react';
import { MetricCard } from '../components/MetricCard';
import { QuarterSelector } from '../components/QuarterSelector';

const COLORS = ['#2563eb', '#e09a3a', '#16a34a', '#dc2626', '#9b72f7', '#f76f4f', '#4fd4c4', '#f7c94f'];

export function TicketOverview({ metrics, selectedQuarterKey, onSelectQuarter }) {
  if (!metrics) return null;
  const {
    ytd, quarterlyTrend,
    avgResolutionDays, slaBreachRate,
    byIssueType, selectedQLabel
  } = metrics;

  const [hoverBar, setHoverBar] = useState(null);
  const [hoverSlice, setHoverSlice] = useState(null);

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

  // Bar chart SVG
  const maxVol = Math.max(...quarterlyTrend.map(q => q.count), 1);
  const yMax = Math.ceil(maxVol / 450) * 450;
  const yTicks = Array.from({ length: Math.floor(yMax / 450) + 1 }, (_, i) => i * 450);
  const BAR_W = 760, BAR_H = 260;
  const pad = { l: 36, r: 16, t: 16, b: 28 };
  const innerW = BAR_W - pad.l - pad.r;
  const innerH = BAR_H - pad.t - pad.b;
  const barCount = quarterlyTrend.length;
  const barSlot = barCount > 0 ? innerW / barCount : innerW;
  const barW = Math.min(barSlot * 0.6, 48);

  // Donut chart
  const issueEntries = Object.entries(byIssueType || {}).sort((a, b) => b[1] - a[1]);
  const top7 = issueEntries.slice(0, 7);
  const otherCount = issueEntries.slice(7).reduce((s, [, v]) => s + v, 0);
  const donutData = [
    ...top7.map(([name, value]) => ({ name, value })),
    ...(otherCount > 0 ? [{ name: 'Other', value: otherCount }] : [])
  ];
  const totalIssues = donutData.reduce((s, d) => s + d.value, 0);
  const cx = 110, cy = 110, r = 78, rInner = 56;
  let accAngle = -Math.PI / 2;
  const slices = donutData.map((item, i) => {
    const angle = totalIssues > 0 ? (item.value / totalIssues) * Math.PI * 2 : 0;
    const a0 = accAngle, a1 = accAngle + angle;
    accAngle = a1;
    const x0 = cx + Math.cos(a0) * r, y0 = cy + Math.sin(a0) * r;
    const x1 = cx + Math.cos(a1) * r, y1 = cy + Math.sin(a1) * r;
    const xi1 = cx + Math.cos(a1) * rInner, yi1 = cy + Math.sin(a1) * rInner;
    const xi0 = cx + Math.cos(a0) * rInner, yi0 = cy + Math.sin(a0) * rInner;
    const large = angle > Math.PI ? 1 : 0;
    const d = `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} L ${xi1} ${yi1} A ${rInner} ${rInner} 0 ${large} 0 ${xi0} ${yi0} Z`;
    return { ...item, d, color: COLORS[i % COLORS.length] };
  });

  const hoveredSlice = hoverSlice !== null ? slices[hoverSlice] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>

        {/* YTD card */}
        <div className="it-card" style={{ padding: '18px 20px 16px' }}>
          <div className="it-eyebrow">Year to date</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6 }}>
            <span className="it-mono" style={{ color: 'var(--ink3)', fontSize: 22 }}>
              {ytd.prior.toLocaleString()}
            </span>
            <span style={{ color: 'var(--ink4)', fontSize: 16 }}>→</span>
            <span className="it-mono" style={{ fontSize: 30, fontWeight: 500, letterSpacing: '-0.02em' }}>
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
                    <span className="it-mono" style={{ color: 'var(--ink3)', fontSize: 22 }}>
                      {selectedQ.priorCount.toLocaleString()}
                    </span>
                    <span style={{ color: 'var(--ink4)', fontSize: 16 }}>→</span>
                  </>
                )}
                <span className="it-mono" style={{ fontSize: 30, fontWeight: 500, letterSpacing: '-0.02em' }}>
                  {selectedQ.currentCount.toLocaleString()}
                </span>
              </div>
              {selectedQ.change !== null && selectedQ.priorCount > 0 ? (
                <div style={{
                  marginTop: 8, fontSize: 12.5,
                  color: parseInt(selectedQ.change) > 0 ? 'var(--red)' : 'var(--green)'
                }}>
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
            <div style={{ marginTop: 6, fontSize: 13, color: 'var(--ink3)' }}>Select a quarter below</div>
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
          footTone={slaBreachRate > 2 ? 'neg' : 'pos'}
        />
      </div>

      {/* Quarterly bar chart + donut side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14 }}>

        {/* Bar chart */}
        <div className="it-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
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

          <svg width="100%" viewBox={`0 0 ${BAR_W} ${BAR_H}`} style={{ display: 'block' }}>
            {/* Y grid */}
            {yTicks.map(y => {
              const yp = pad.t + innerH - (y / yMax) * innerH;
              return (
                <g key={y}>
                  <line x1={pad.l} x2={BAR_W - pad.r} y1={yp} y2={yp}
                    stroke={y === 0 ? 'var(--border-strong)' : 'var(--border)'}
                    strokeDasharray={y === 0 ? '0' : '3 4'} />
                  <text x={pad.l - 8} y={yp + 4} textAnchor="end"
                    fontSize="10" fill="var(--ink4)"
                    fontFamily="DM Mono, monospace">{y}</text>
                </g>
              );
            })}

            {/* Bars */}
            {quarterlyTrend.map((q, i) => {
              const barH = (q.count / yMax) * innerH;
              const x = pad.l + i * barSlot + (barSlot - barW) / 2;
              const y = pad.t + innerH - barH;
              const isSelected = q.isSelected;
              const isHovered = hoverBar === i;
              return (
                <g key={q.key}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onSelectQuarter(q.key)}
                  onMouseEnter={() => setHoverBar(i)}
                  onMouseLeave={() => setHoverBar(null)}>
                  <rect
                    x={x} y={y} width={barW} height={barH}
                    fill="var(--blue)"
                    opacity={isSelected ? 1 : isHovered ? 0.8 : 0.65}
                    rx={4} ry={4}
                  />
                  <text x={x + barW / 2} y={BAR_H - 6}
                    textAnchor="middle" fontSize="10.5"
                    fill="var(--ink3)"
                    fontFamily="DM Mono, monospace">{q.label}</text>
                  {isHovered && (
                    <g>
                      <rect x={x + barW / 2 - 40} y={y - 32} width="80" height="26"
                        rx="5" fill="white" stroke="var(--border)" />
                      <text x={x + barW / 2} y={y - 15}
                        textAnchor="middle" fontSize="12"
                        fontFamily="DM Mono, monospace"
                        fill="var(--ink)">{q.count.toLocaleString()}</text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* X axis */}
            <line x1={pad.l} x2={BAR_W - pad.r}
              y1={pad.t + innerH} y2={pad.t + innerH}
              stroke="var(--border-strong)" />
          </svg>
        </div>

        {/* Donut */}
        <div className="it-card" style={{ padding: 20 }}>
          <div className="it-section-title">By issue type</div>
          <div className="it-section-sub" style={{ marginBottom: 12 }}>
            {selectedQLabel || 'All available data'}
          </div>
          <div style={{ position: 'relative' }}>
            <svg width="220" height="220" viewBox="0 0 220 220" style={{ display: 'block', margin: '0 auto' }}>
              {slices.map((slice, i) => (
                <path
                  key={slice.name}
                  d={slice.d}
                  fill={slice.color}
                  opacity={hoverSlice === null || hoverSlice === i ? 1 : 0.4}
                  style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
                  onMouseEnter={() => setHoverSlice(i)}
                  onMouseLeave={() => setHoverSlice(null)}
                />
              ))}
              {/* Center text */}
              {hoveredSlice ? (
                <>
                  <text x={cx} y={cy - 8} textAnchor="middle"
                    fontSize="11" fontFamily="DM Mono, monospace"
                    fill="var(--ink3)">{hoveredSlice.value.toLocaleString()}</text>
                  <text x={cx} y={cy + 8} textAnchor="middle"
                    fontSize="10" fontFamily="DM Mono, monospace"
                    fill="var(--ink4)">{totalIssues > 0 ? ((hoveredSlice.value / totalIssues) * 100).toFixed(1) : 0}%</text>
                </>
              ) : (
                <>
                  <text x={cx} y={cy - 8} textAnchor="middle"
                    fontSize="18" fontWeight="500"
                    fontFamily="DM Mono, monospace"
                    fill="var(--ink)">{totalIssues.toLocaleString()}</text>
                  <text x={cx} y={cy + 10} textAnchor="middle"
                    fontSize="10" fontFamily="DM Mono, monospace"
                    fill="var(--ink4)">tickets</text>
                </>
              )}
            </svg>
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 8 }}>
            {slices.map((slice, i) => (
              <div key={slice.name}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  opacity: hoverSlice === null || hoverSlice === i ? 1 : 0.4,
                  cursor: 'pointer', transition: 'opacity 0.15s'
                }}
                onMouseEnter={() => setHoverSlice(i)}
                onMouseLeave={() => setHoverSlice(null)}>
                <span style={{
                  width: 8, height: 8, borderRadius: 2,
                  background: slice.color, flexShrink: 0
                }} />
                <span style={{ fontSize: 11.5, color: 'var(--ink3)', flex: 1 }}>{slice.name}</span>
                <span className="it-mono" style={{ fontSize: 11, color: 'var(--ink4)' }}>
                  {slice.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}