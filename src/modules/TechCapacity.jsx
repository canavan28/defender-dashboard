import { useState } from 'react';
import { MetricCard } from '../components/MetricCard';
import { QuarterSelector } from '../components/QuarterSelector';

function ScoreRing({ score }) {
  const size = 56;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 80 ? 'var(--green)' : score >= 60 ? 'var(--amber)' : 'var(--red)';
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 700, color,
        fontFamily: 'DM Mono, monospace'
      }}>
        {score}
      </div>
    </div>
  );
}

function MetricBar({ label, score, maxScore, detail, subDetail }) {
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
  const color = pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--amber)' : 'var(--red)';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 80px', gap: 10, alignItems: 'center' }}>
      <div>
        <div style={{ fontSize: 12.5, color: 'var(--ink)' }}>{label}</div>
        {detail && <div className="it-mono" style={{ fontSize: 10.5, color: 'var(--ink3)', marginTop: 1 }}>{detail}</div>}
        {subDetail && <div className="it-mono" style={{ fontSize: 10.5, color: 'var(--ink4)', marginTop: 1 }}>{subDetail}</div>}
      </div>
      <div className="it-bar-track" style={{ height: 6 }}>
        <div className="it-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="it-mono" style={{ fontSize: 12, color: 'var(--ink)', textAlign: 'right' }}>
        {score}<span style={{ color: 'var(--ink4)', fontSize: 10 }}>/{maxScore}</span>
      </div>
    </div>
  );
}

function OutlierSection({ outliers }) {
  if (!outliers || outliers.length === 0) return null;
  return (
    <div style={{ marginTop: 20 }}>
      <div className="it-eyebrow" style={{ marginBottom: 8, color: 'var(--amber)' }}>
        Issue Type Outliers — ≥1.25x team average
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {outliers.map(({ issue, flags }) => (
          <div key={issue} style={{
            padding: '10px 14px', borderRadius: 8,
            background: 'var(--amber-soft)',
            border: '1px solid var(--amber)',
            borderLeft: '3px solid var(--amber)'
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
              {issue}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {flags.map((f, i) => (
                <div key={i} className="it-mono" style={{ fontSize: 11.5, color: 'var(--ink2)', display: 'flex', gap: 8 }}>
                  <span style={{ color: 'var(--amber)', fontWeight: 600 }}>
                    {f.type === 'response' ? 'Response' : f.type === 'resolution' ? 'Resolution' : 'Escalation'}
                  </span>
                  {f.type === 'response' && (
                    <span>{Math.round(f.techAvg * 60)}min avg vs team {Math.round(f.teamAvg * 60)}min ({f.ratio}x)</span>
                  )}
                  {f.type === 'resolution' && (
                    <span>{Math.round(f.techAvg * 60)}min avg vs team {Math.round(f.teamAvg * 60)}min ({f.ratio}x)</span>
                  )}
                  {f.type === 'escalation' && (
                    <span>{f.techRate}% escalation rate vs team {f.teamRate}% ({f.ratio}x)</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TechGradeRow({ tech, isExpanded, onToggle }) {
  const { name, score, ticketCount, metrics, issueOutliers } = tech;
  const scoreColor = score >= 80 ? 'var(--green)' : score >= 60 ? 'var(--amber)' : 'var(--red)';

  const metricCols = [
    { label: 'SLA', m: metrics.sla },
    { label: 'Response', m: metrics.responseTime },
    { label: 'Resolution', m: metrics.resolutionTime },
    { label: 'Escalation', m: metrics.escalation },
    { label: 'Notes', m: metrics.notes },
    { label: 'FCR', m: metrics.fcr }
  ];

  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <div
        onClick={onToggle}
        style={{
          display: 'grid',
          gridTemplateColumns: '72px 1fr 90px 90px 90px 90px 90px 90px',
          gap: 10, padding: '14px 20px',
          alignItems: 'center', cursor: 'pointer',
          background: isExpanded ? '#fafbfe' : 'white'
        }}>
        <ScoreRing score={score} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{name}</div>
          <div className="it-mono" style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 2 }}>
            {ticketCount} tickets
            {issueOutliers?.length > 0 && (
              <span style={{ color: 'var(--amber)', marginLeft: 8 }}>
                ⚠ {issueOutliers.length} outlier{issueOutliers.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        {metricCols.map(({ label, m }) => {
          const pct = m.maxScore > 0 ? m.score / m.maxScore : 0;
          const c = pct >= 0.8 ? 'var(--green)' : pct >= 0.5 ? 'var(--amber)' : 'var(--red)';
          const bg = pct >= 0.8 ? 'var(--green-soft)' : pct >= 0.5 ? 'var(--amber-soft)' : 'var(--red-soft)';
          return (
            <div key={label} style={{ textAlign: 'center' }}>
              <div className="it-mono" style={{ fontSize: 10.5, color: 'var(--ink4)', marginBottom: 4 }}>{label}</div>
              <span style={{
                display: 'inline-block', padding: '2px 8px', borderRadius: 999,
                background: bg, color: c,
                fontSize: 12, fontWeight: 600, fontFamily: 'DM Mono, monospace'
              }}>
                {m.score}/{m.maxScore}
              </span>
            </div>
          );
        })}
      </div>

      {isExpanded && (
        <div style={{
          padding: '16px 20px 20px',
          background: '#fafbfe',
          borderTop: '1px solid var(--border)'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <MetricBar
                label="SLA compliance"
                score={metrics.sla.score}
                maxScore={metrics.sla.maxScore}
                detail={`${metrics.sla.breaches} breach${metrics.sla.breaches !== 1 ? 'es' : ''} out of ${metrics.sla.eligible} eligible tickets`}
                subDetail="Perfect = ≤5 breaches · -10% per breach above 5"
              />
              <MetricBar
                label="Response time"
                score={metrics.responseTime.score}
                maxScore={metrics.responseTime.maxScore}
                detail={metrics.responseTime.avgMins != null
                  ? `${metrics.responseTime.avgMins}min avg · team ${metrics.responseTime.teamAvgMins}min`
                  : 'Insufficient data'}
                subDetail="Perfect = ≤30min avg · 0 at 2hrs · excl. low priority & internal tickets"
              />
              <MetricBar
                label="Resolution time"
                score={metrics.resolutionTime.score}
                maxScore={metrics.resolutionTime.maxScore}
                detail={metrics.resolutionTime.avgMins != null
                  ? `${metrics.resolutionTime.avgMins}min avg logged · team ${metrics.resolutionTime.teamAvgMins}min · ${metrics.resolutionTime.completedTickets} tickets`
                  : 'Insufficient data'}
                subDetail="Perfect = ≤30min avg hours logged · -10% per 5min over"
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <MetricBar
                label="Escalation rate"
                score={metrics.escalation.score}
                maxScore={metrics.escalation.maxScore}
                detail={`${metrics.escalation.count} escalation${metrics.escalation.count !== 1 ? 's' : ''} out of ${metrics.escalation.totalTickets} tickets`}
                subDetail="Perfect = ≤5 upward escalations · -5% per above 5"
              />
              <MetricBar
                label="Notes quality"
                score={metrics.notes.score}
                maxScore={metrics.notes.maxScore}
                detail={`${metrics.notes.pct}% tickets without doc flags`}
                subDetail={metrics.notes.method === 'ai' ? 'Based on AI documentation flags' : 'Based on time entry notes coverage'}
              />
              <MetricBar
                label="First contact resolution"
                score={metrics.fcr.score}
                maxScore={metrics.fcr.maxScore}
                detail={metrics.fcr.rate != null
                  ? `${metrics.fcr.rate}% one-touch close · ${metrics.fcr.oneTouchCount} of ${metrics.fcr.eligible} tickets`
                  : `Only ${metrics.fcr.eligible} eligible tickets (need 10+)`}
                subDetail="Perfect = ≥90% · -10% per 5% below 90%"
              />
            </div>
          </div>
          <OutlierSection outliers={issueOutliers} />
        </div>
      )}
    </div>
  );
}

export function TechCapacity({ metrics, selectedQuarterKey, onSelectQuarter }) {
  if (!metrics) return null;
  const {
    openByTechList, closedByTechList, selectedQLabel,
    quarterlyTrend, avgOpenAge, avgResolutionDays, techGrades
  } = metrics;

  const [expandedTech, setExpandedTech] = useState(null);

  const maxOpen = Math.max(24, ...(openByTechList.map(t => t.count)));
  const maxClosed = closedByTechList[0]?.count || 1;

  const loadStatus = (n) => {
    if (n <= 12) return { color: 'var(--green)', label: 'healthy' };
    if (n <= 24) return { color: 'var(--amber)', label: 'moderate' };
    return { color: 'var(--red)', label: 'high' };
  };

  const activeCount = openByTechList.length;
  const avgOpen = activeCount
    ? Math.round(openByTechList.reduce((s, t) => s + t.count, 0) / activeCount)
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <MetricCard eyebrow="Active technicians" value={activeCount} foot="With open tickets" />
        <MetricCard eyebrow="Avg open tickets" value={avgOpen}
          foot={avgOpen <= 12 ? 'Within healthy range' : avgOpen <= 24 ? 'Moderate load' : 'Above healthy threshold'}
          footTone={avgOpen <= 12 ? 'pos' : avgOpen <= 24 ? 'warn' : 'neg'} />
        <MetricCard eyebrow="Avg ticket age"
          value={<>{avgOpenAge}<span style={{ fontSize: 16, color: 'var(--ink3)', marginLeft: 2 }}>d</span></>}
          foot="Days since created" footTone={avgOpenAge > 7 ? 'warn' : 'pos'} />
        <MetricCard eyebrow="Avg resolution"
          value={<>{avgResolutionDays}<span style={{ fontSize: 16, color: 'var(--ink3)', marginLeft: 2 }}>d</span></>}
          foot="Completed tickets" />
      </div>

      <div className="it-card" style={{ padding: '0 18px' }}>
        <QuarterSelector
          quarters={quarterlyTrend}
          selectedKey={selectedQuarterKey}
          onChange={onSelectQuarter}
          label="Closed tickets period:"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="it-card" style={{ padding: 20 }}>
          <div className="it-section-title">Current open tickets</div>
          <div className="it-section-sub" style={{ marginBottom: 20 }}>
            Live workload · ≤12 healthy · ≤24 moderate · &gt;24 high
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {openByTechList.map(tech => {
              const status = loadStatus(tech.count);
              return (
                <div key={tech.id} style={{
                  display: 'grid', gridTemplateColumns: '120px 1fr 32px',
                  gap: 14, alignItems: 'center'
                }}>
                  <div style={{ fontSize: 13, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tech.name}
                  </div>
                  <div className="it-bar-track">
                    <div className="it-bar-fill" style={{ width: `${(tech.count / maxOpen) * 100}%`, background: status.color }} />
                  </div>
                  <div className="it-mono" style={{ fontSize: 13, color: 'var(--ink)', textAlign: 'right' }}>{tech.count}</div>
                </div>
              );
            })}
            {openByTechList.length === 0 && <p style={{ fontSize: 13, color: 'var(--ink3)' }}>No open tickets</p>}
          </div>
        </div>

        <div className="it-card" style={{ padding: 20 }}>
          <div className="it-section-title">Tickets closed per tech</div>
          <div className="it-section-sub" style={{ marginBottom: 20 }}>
            {selectedQLabel || 'Select a quarter'} · Based on completed date
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {closedByTechList.map(tech => (
              <div key={tech.id} style={{
                display: 'grid', gridTemplateColumns: '120px 1fr 32px',
                gap: 14, alignItems: 'center'
              }}>
                <div style={{ fontSize: 13, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {tech.name}
                </div>
                <div className="it-bar-track">
                  <div className="it-bar-fill" style={{ width: `${(tech.count / maxClosed) * 100}%`, background: 'var(--blue)' }} />
                </div>
                <div className="it-mono" style={{ fontSize: 13, color: 'var(--ink)', textAlign: 'right' }}>{tech.count}</div>
              </div>
            ))}
            {closedByTechList.length === 0 && (
              <p style={{ fontSize: 13, color: 'var(--ink3)' }}>
                {selectedQuarterKey ? 'No completed tickets for this quarter' : 'Select a quarter above'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tech Performance */}
      <div className="it-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div>
            <div className="it-section-title">Tech performance scores</div>
            <div className="it-section-sub">
              {selectedQLabel || 'All available data'} · Min 30 tickets · Click to expand · Score out of 100
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            {[
              { label: 'SLA', pts: 20 },
              { label: 'Response', pts: 20 },
              { label: 'Resolution', pts: 20 },
              { label: 'Escalation', pts: 15 },
              { label: 'Notes', pts: 15 },
              { label: 'FCR', pts: 10 }
            ].map(({ label, pts }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div className="it-mono" style={{ fontSize: 10.5, color: 'var(--ink4)' }}>{label}</div>
                <div className="it-mono" style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 1 }}>{pts}pts</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '72px 1fr 90px 90px 90px 90px 90px 90px',
          gap: 10, padding: '8px 20px',
          background: 'var(--slate-soft)', borderBottom: '1px solid var(--border)'
        }}>
          {['Score', 'Technician', 'SLA', 'Response', 'Resolution', 'Escalation', 'Notes', 'FCR'].map(h => (
            <div key={h} className="it-mono" style={{ fontSize: 11, color: 'var(--ink4)' }}>{h}</div>
          ))}
        </div>

        {techGrades && techGrades.length > 0 ? (
          techGrades.map(tech => (
            <TechGradeRow
              key={tech.id}
              tech={tech}
              isExpanded={expandedTech === tech.id}
              onToggle={() => setExpandedTech(prev => prev === tech.id ? null : tech.id)}
            />
          ))
        ) : (
          <div style={{ padding: '32px 20px', textAlign: 'center' }}>
            <div className="it-mono" style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 6 }}>INSUFFICIENT DATA</div>
            <div style={{ fontSize: 13, color: 'var(--ink3)' }}>
              Each tech needs at least 30 tickets in the selected period to receive a score.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
