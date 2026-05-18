import { useState } from 'react';
import { MetricCard } from '../components/MetricCard';
import { QuarterSelector } from '../components/QuarterSelector';

export function SLAHealth({ metrics, selectedQuarterKey, onSelectQuarter }) {
  if (!metrics) return null;
  const { slaBreachRate, slaEligibleCount, quarterlyTrend, selectedQLabel, avgResolutionDays } = metrics;
  const [hover, setHover] = useState(null);

  const TARGET_BREACH = 2.0;

  // SVG line chart dimensions
  const W = 1100, H = 240;
  const pad = { l: 36, r: 24, t: 16, b: 26 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const maxVol = Math.max(...quarterlyTrend.map(q => q.count), 1);
  const yMax = Math.ceil(maxVol / 450) * 450;
  const yTicks = Array.from({ length: Math.floor(yMax / 450) + 1 }, (_, i) => i * 450);

  const stepX = quarterlyTrend.length > 1 ? innerW / (quarterlyTrend.length - 1) : innerW;
  const pts = quarterlyTrend.map((q, i) => ({
    x: pad.l + i * stepX,
    y: pad.t + innerH - (q.count / yMax) * innerH,
    v: q.count,
    q: q.label,
    isSelected: q.isSelected
  }));

  let path = pts.length > 0 ? `M ${pts[0].x} ${pts[0].y}` : '';
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1], p1 = pts[i];
    const c1x = p0.x + stepX / 3, c1y = p0.y;
    const c2x = p1.x - stepX / 3, c2y = p1.y;
    path += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p1.x} ${p1.y}`;
  }
  const areaPath = pts.length > 0
    ? path + ` L ${pts[pts.length - 1].x} ${pad.t + innerH} L ${pts[0].x} ${pad.t + innerH} Z`
    : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <MetricCard eyebrow="SLA breach rate"
          value={<>{slaBreachRate}<span style={{ fontSize: 16, color: 'var(--ink3)', marginLeft: 2 }}>%</span></>}
          foot={selectedQLabel ? `For ${selectedQLabel}` : 'First response breaches'}
          footTone={slaBreachRate > TARGET_BREACH ? 'neg' : 'pos'} />
        <MetricCard eyebrow="Tickets evaluated"
          value={slaEligibleCount.toLocaleString()}
          foot="With first response due date" />
        <MetricCard eyebrow="Tickets met SLA"
          value={Math.round(slaEligibleCount * (1 - slaBreachRate / 100)).toLocaleString()}
          foot="On-time first responses"
          footTone="pos" />
        <MetricCard eyebrow="Avg resolution"
          value={<>{avgResolutionDays}<span style={{ fontSize: 16, color: 'var(--ink3)', marginLeft: 2 }}>d</span></>}
          foot="Completed tickets" />
      </div>

      {/* Quarter selector */}
      <div className="it-card" style={{ padding: '0 18px' }}>
        <QuarterSelector
          quarters={quarterlyTrend}
          selectedKey={selectedQuarterKey}
          onChange={onSelectQuarter}
        />
      </div>

      {/* SVG trend line */}
      <div className="it-card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div className="it-section-title">Quarterly ticket volume trend</div>
            <div className="it-section-sub">All quarters · SLA metrics above filter to selected quarter</div>
          </div>
          <div style={{ display: 'flex', gap: 14, fontSize: 11.5, color: 'var(--ink3)', fontFamily: 'DM Mono, monospace' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--blue)' }} />
              Selected quarter
            </span>
          </div>
        </div>

        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
          {yTicks.map(y => {
            const yp = pad.t + innerH - (y / yMax) * innerH;
            return (
              <g key={y}>
                <line x1={pad.l} x2={W - pad.r} y1={yp} y2={yp}
                  stroke={y === 0 ? 'var(--border-strong)' : 'var(--border)'}
                  strokeDasharray={y === 0 ? '0' : '3 4'} />
                <text x={pad.l - 8} y={yp + 4} textAnchor="end"
                  fontSize="10" fill="var(--ink4)"
                  fontFamily="DM Mono, monospace">{y}</text>
              </g>
            );
          })}

          <path d={areaPath} fill="var(--blue)" opacity={0.07} />
          <path d={path} fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinejoin="round" />

          {pts.map((p, i) => (
            <g key={p.q}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}>
              <circle cx={p.x} cy={p.y}
                r={p.isSelected ? 6 : 4}
                fill={p.isSelected ? 'var(--blue)' : 'white'}
                stroke="var(--blue)"
                strokeWidth={p.isSelected ? 2.5 : 2} />
              <text x={p.x} y={H - 4} textAnchor="middle"
                fontSize="10.5" fill="var(--ink3)"
                fontFamily="DM Mono, monospace">{p.q}</text>
              {hover === i && (
                <g>
                  <rect x={p.x - 60} y={p.y - 52} width="120" height="36"
                    rx="6" fill="white" stroke="var(--border)" />
                  <text x={p.x} y={p.y - 36} textAnchor="middle"
                    fontSize="11" fontFamily="DM Mono, monospace"
                    fill="var(--ink3)">{p.q}</text>
                  <text x={p.x} y={p.y - 22} textAnchor="middle"
                    fontSize="12" fontFamily="DM Mono, monospace"
                    fill="var(--ink)">{p.v.toLocaleString()} tickets</text>
                </g>
              )}
            </g>
          ))}

          <line x1={pad.l} x2={W - pad.r}
            y1={pad.t + innerH} y2={pad.t + innerH}
            stroke="var(--border-strong)" />
        </svg>
      </div>

      {/* Breach rate per quarter */}
      <div className="it-card" style={{ padding: 20 }}>
        <div style={{ marginBottom: 12 }}>
          <div className="it-section-title">Quarterly breach rate</div>
          <div className="it-section-sub">Target: ≤ {TARGET_BREACH}% · Color = within / above target</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {quarterlyTrend.map(q => {
            const above = slaBreachRate > TARGET_BREACH;
            return (
              <div key={q.key} style={{
                display: 'grid', gridTemplateColumns: '60px 1fr 60px',
                gap: 12, alignItems: 'center'
              }}>
                <div className="it-mono" style={{ fontSize: 11.5, color: 'var(--ink3)' }}>{q.label}</div>
                <div style={{ position: 'relative', height: 8 }}>
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'var(--slate-soft)', borderRadius: 999
                  }} />
                  <div style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0,
                    width: `${(TARGET_BREACH / 10) * 100}%`,
                    background: 'var(--green-soft)', borderRadius: 999,
                    borderRight: '1.5px dashed var(--green)'
                  }} />
                  <div style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0,
                    width: `${q.isSelected ? Math.min((slaBreachRate / 10) * 100, 100) : 0}%`,
                    background: above ? 'var(--red)' : 'var(--green)',
                    borderRadius: 999
                  }} />
                </div>
                <div className="it-mono" style={{
                  fontSize: 12, textAlign: 'right',
                  color: q.isSelected ? (above ? 'var(--red)' : 'var(--ink)') : 'var(--ink4)'
                }}>
                  {q.isSelected ? `${slaBreachRate}%` : '—'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}