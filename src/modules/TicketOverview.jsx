import { useState } from 'react';
import { MetricCard } from '../components/MetricCard';
import { QuarterSelector } from '../components/QuarterSelector';

const COLORS = ['#2563eb', '#e09a3a', '#16a34a', '#dc2626', '#9b72f7', '#f76f4f', '#4fd4c4', '#f7c94f'];

export function TicketOverview({ metrics, selectedQuarterKey, onSelectQuarter, criticalFlagsCount = 0, onCriticalFlagsClick }) {
  if (!metrics) return null;
  const {
    ytd, quarterlyTrend,
    avgResolutionDays, slaBreachRate,
    byIssueType, selectedQLabel,
    issueTypeMap, subIssueMap
  } = metrics;

  const [hoverBar, setHoverBar] = useState(null);
  const [expandedIssues, setExpandedIssues] = useState(new Set());
  const toggleIssue = (name) => {
    const s = new Set(expandedIssues);
    s.has(name) ? s.delete(name) : s.add(name);
    setExpandedIssues(s);
  };
 

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

  // Issue List
  const issueEntries = Object.entries(byIssueType || {}).sort((a, b) => b[1] - a[1]);
  const totalIssues = issueEntries.reduce((s, [, v]) => s + v, 0);
    
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

        {/* Critical flags */}
        <div
          className="it-card"
          onClick={onCriticalFlagsClick}
          style={{
            padding: '18px 20px 16px',
            cursor: criticalFlagsCount > 0 ? 'pointer' : 'default',
            transition: 'box-shadow 0.15s',
            ...(criticalFlagsCount > 0 ? {
              borderColor: '#fecaca',
              boxShadow: '0 0 0 1px #fecaca'
            } : {})
          }}
          onMouseEnter={e => { if (criticalFlagsCount > 0) e.currentTarget.style.boxShadow = '0 4px 12px rgba(220,38,38,0.15)'; }}
          onMouseLeave={e => { if (criticalFlagsCount > 0) e.currentTarget.style.boxShadow = '0 0 0 1px #fecaca'; }}
        >
          <div className="it-eyebrow">Critical AI flags</div>
          <div style={{
            fontSize: 30, fontWeight: 500, lineHeight: 1.05,
            letterSpacing: '-0.02em', marginTop: 6,
            color: criticalFlagsCount > 0 ? 'var(--red)' : 'var(--ink)'
          }}>
            {criticalFlagsCount}
          </div>
          <div style={{ marginTop: 8, fontSize: 12.5, color: criticalFlagsCount > 0 ? 'var(--red)' : 'var(--ink3)' }}>
            {criticalFlagsCount > 0 ? 'Click to review →' : 'No critical flags'}
          </div>
        </div>

        {/* SLA breach rate */}
        <MetricCard
          eyebrow="SLA breach rate"
          value={<>{slaBreachRate}<span style={{ fontSize: 16, color: 'var(--ink3)', marginLeft: 2 }}>%</span></>}
          foot="First response breaches"
          footTone={slaBreachRate > 2 ? 'neg' : 'pos'}
        />
      </div>

      {/* Quarterly bar chart + issue type list side by side */}
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

        {/* Issue type list */}
        <div className="it-card" style={{ padding: 20 }}>
          <div className="it-section-title">Tickets by issue type</div>
          <div className="it-section-sub" style={{ marginBottom: 16 }}>
            {selectedQLabel || 'All available data'} · Click to expand sub-issues
          </div>

          {/* Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 80px 56px',
            gap: 12, padding: '6px 4px',
            borderBottom: '1px solid var(--border)',
            marginBottom: 4
          }}>
            <div className="it-mono" style={{ fontSize: 11, color: 'var(--ink4)' }}>ISSUE TYPE</div>
            <div className="it-mono" style={{ fontSize: 11, color: 'var(--ink4)', textAlign: 'right' }}>TICKETS</div>
            <div className="it-mono" style={{ fontSize: 11, color: 'var(--ink4)', textAlign: 'right' }}>%</div>
          </div>

          {issueEntries.map(([name, count], idx) => {
            const isOpen = expandedIssues.has(name);
            const pct = totalIssues > 0 ? ((count / totalIssues) * 100).toFixed(1) : 0;
            const color = COLORS[idx % COLORS.length];

            // Find sub-issues for this issue type
            const issueKey = Object.entries(issueTypeMap || {}).find(([, v]) => v === name)?.[0];
            const subIssues = issueKey ? Object.entries(byIssueType || {})
              .filter(([k]) => {
                const sub = subIssueMap?.[k];
                return sub && String(sub.parent) === String(issueKey);
              })
              .sort((a, b) => b[1] - a[1]) : [];

            const hasSubs = subIssues.length > 0;

            return (
              <div key={name}>
                <div
                  onClick={() => hasSubs && toggleIssue(name)}
                  style={{
                    display: 'grid', gridTemplateColumns: '1fr 80px 56px',
                    gap: 12, padding: '9px 4px', alignItems: 'center',
                    borderBottom: '1px solid var(--border)',
                    cursor: hasSubs ? 'pointer' : 'default'
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: 10, color: 'var(--ink3)',
                      visibility: hasSubs ? 'visible' : 'hidden',
                      transform: isOpen ? 'rotate(90deg)' : 'rotate(0)',
                      transition: 'transform 0.15s', display: 'inline-block'
                    }}>▶</span>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: 'var(--ink)' }}>{name}</span>
                  </div>
                  <div className="it-mono" style={{ fontSize: 12.5, color: 'var(--ink)', textAlign: 'right' }}>
                    {count.toLocaleString()}
                  </div>
                  <div className="it-mono" style={{ fontSize: 12, color: 'var(--ink3)', textAlign: 'right' }}>
                    {pct}%
                  </div>
                </div>

                {isOpen && subIssues.map(([subKey, subCount]) => {
                  const subLabel = subIssueMap?.[subKey]?.label || subKey;
                  const subPct = totalIssues > 0 ? ((subCount / totalIssues) * 100).toFixed(1) : 0;
                  return (
                    <div key={subKey} style={{
                      display: 'grid', gridTemplateColumns: '1fr 80px 56px',
                      gap: 12, padding: '7px 4px 7px 32px', alignItems: 'center',
                      borderBottom: '1px solid var(--border)',
                      background: '#fafbfc'
                    }}>
                      <div style={{ fontSize: 12.5, color: 'var(--ink2)' }}>└ {subLabel}</div>
                      <div className="it-mono" style={{ fontSize: 12, color: 'var(--ink2)', textAlign: 'right' }}>
                        {subCount.toLocaleString()}
                      </div>
                      <div className="it-mono" style={{ fontSize: 11.5, color: 'var(--ink4)', textAlign: 'right' }}>
                        {subPct}%
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  )
}