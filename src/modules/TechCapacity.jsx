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


function TechNarrativeSection({ analysis, onRun, isRunning, techId }) {
  if (!analysis && !isRunning) {
    return (
      <div style={{
        marginTop: 20, padding: '14px 16px', borderRadius: 8,
        border: '1px dashed var(--border)', textAlign: 'center'
      }}>
        <div style={{ fontSize: 13, color: 'var(--ink3)', marginBottom: 8 }}>
          No AI analysis run yet for this tech
        </div>
        <button
          className="it-btn ai-soft"
          onClick={() => onRun(techId)}
          style={{ fontSize: 12 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          Run AI Analysis
        </button>
      </div>
    );
  }

  if (isRunning) {
    return (
      <div style={{
        marginTop: 20, padding: '14px 16px', borderRadius: 8,
        background: 'var(--ai-soft)', border: '1px solid #d6daff',
        display: 'flex', alignItems: 'center', gap: 10
      }}>
        <svg className="it-spin" width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="var(--ai-deep)" strokeWidth="2.5" strokeLinecap="round">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        <span className="it-mono" style={{ fontSize: 12, color: 'var(--ai-deep)' }}>
          Analyzing performance...
        </span>
      </div>
    );
  }

  const { narrative, quarterSummaries, currentQ, priorQ, currentQKey, priorQKey, generatedAt } = analysis;

  const trend = (curr, prior, lowerBetter = true) => {
    if (curr == null || prior == null) return { arrow: '→', color: 'var(--ink4)' };
    const improved = lowerBetter ? curr < prior : curr > prior;
    const same = curr === prior;
    if (same) return { arrow: '→', color: 'var(--ink4)' };
    return improved
      ? { arrow: '↑', color: 'var(--green)' }
      : { arrow: '↓', color: 'var(--red)' };
  };

  const metrics = [
    {
      label: 'Avg Response Time',
      curr: currentQ?.avgResponseMins != null ? `${currentQ.avgResponseMins}min` : '—',
      prior: priorQ?.avgResponseMins != null ? `${priorQ.avgResponseMins}min` : '—',
      t: trend(currentQ?.avgResponseMins, priorQ?.avgResponseMins, true)
    },
    {
      label: 'Avg Resolution Time',
      curr: currentQ?.avgResolutionMins != null ? `${currentQ.avgResolutionMins}min` : '—',
      prior: priorQ?.avgResolutionMins != null ? `${priorQ.avgResolutionMins}min` : '—',
      t: trend(currentQ?.avgResolutionMins, priorQ?.avgResolutionMins, true)
    },
    {
      label: 'SLA Breach Rate',
      curr: currentQ?.slaBreachRate != null ? `${currentQ.slaBreachRate}%` : '—',
      prior: priorQ?.slaBreachRate != null ? `${priorQ.slaBreachRate}%` : '—',
      t: trend(currentQ?.slaBreachRate, priorQ?.slaBreachRate, true)
    },
    {
      label: 'FCR Rate',
      curr: currentQ?.fcrRate != null ? `${currentQ.fcrRate}%` : '—',
      prior: priorQ?.fcrRate != null ? `${priorQ.fcrRate}%` : '—',
      t: trend(currentQ?.fcrRate, priorQ?.fcrRate, false)
    },
    {
      label: 'Notes Issues',
      curr: currentQ?.notesIssueRate != null ? `${currentQ.notesIssueRate}%` : '—',
      prior: priorQ?.notesIssueRate != null ? `${priorQ.notesIssueRate}%` : '—',
      t: trend(currentQ?.notesIssueRate, priorQ?.notesIssueRate, true)
    },
    {
      label: 'Escalations',
      curr: currentQ?.escalations != null ? currentQ.escalations : '—',
      prior: priorQ?.escalations != null ? priorQ.escalations : '—',
      t: { arrow: '·', color: 'var(--ink4)' } // context dependent — no arrow
    }
  ];

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div className="it-eyebrow" style={{ color: 'var(--ai-deep)' }}>AI Performance Analysis</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="it-mono" style={{ fontSize: 10.5, color: 'var(--ink4)' }}>
            Generated {new Date(generatedAt).toLocaleDateString()}
          </span>
          <button
            className="it-btn sm"
            onClick={() => onRun(techId)}
            style={{ fontSize: 11 }}>
            Refresh
          </button>
        </div>
      </div>

      {/* Narrative */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16
      }}>
        {[
          { label: 'Strengths', text: narrative?.strengths, color: 'var(--green)', bg: 'var(--green-soft)' },
          { label: 'Concerns', text: narrative?.concerns, color: 'var(--red)', bg: 'var(--red-soft)' },
          { label: 'Trends', text: narrative?.trends, color: 'var(--blue)', bg: 'var(--blue-soft)' },
          { label: 'Recommendation', text: narrative?.recommendation, color: 'var(--ai-deep)', bg: 'var(--ai-soft)' }
        ].map(({ label, text, color, bg }) => (
          <div key={label} style={{
            padding: '12px 14px', borderRadius: 8,
            background: bg, borderLeft: `3px solid ${color}`
          }}>
            <div className="it-mono" style={{ fontSize: 10.5, color, fontWeight: 600, marginBottom: 5 }}>
              {label.toUpperCase()}
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5 }}>
              {text || '—'}
            </div>
          </div>
        ))}
      </div>

      {/* QoQ Trend Table */}
      <div className="it-eyebrow" style={{ marginBottom: 8 }}>
        Quarter over Quarter — {priorQKey || 'Prior'} → {currentQKey || 'Current'}
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 100px 100px 40px',
        gap: 0, borderRadius: 8, overflow: 'hidden',
        border: '1px solid var(--border)'
      }}>
        <div style={{ padding: '6px 12px', background: 'var(--slate-soft)' }}>
          <span className="it-mono" style={{ fontSize: 10.5, color: 'var(--ink4)' }}>METRIC</span>
        </div>
        <div style={{ padding: '6px 12px', background: 'var(--slate-soft)', textAlign: 'right' }}>
          <span className="it-mono" style={{ fontSize: 10.5, color: 'var(--ink4)' }}>PRIOR</span>
        </div>
        <div style={{ padding: '6px 12px', background: 'var(--slate-soft)', textAlign: 'right' }}>
          <span className="it-mono" style={{ fontSize: 10.5, color: 'var(--ink4)' }}>CURRENT</span>
        </div>
        <div style={{ padding: '6px 12px', background: 'var(--slate-soft)', textAlign: 'center' }}>
          <span className="it-mono" style={{ fontSize: 10.5, color: 'var(--ink4)' }}></span>
        </div>
        {metrics.map(({ label, curr, prior, t }, i) => (
          <>
            <div key={`l${i}`} style={{
              padding: '8px 12px', fontSize: 12.5, color: 'var(--ink)',
              borderTop: '1px solid var(--border)'
            }}>{label}</div>
            <div key={`p${i}`} style={{
              padding: '8px 12px', textAlign: 'right',
              borderTop: '1px solid var(--border)'
            }}>
              <span className="it-mono" style={{ fontSize: 12, color: 'var(--ink3)' }}>{prior}</span>
            </div>
            <div key={`c${i}`} style={{
              padding: '8px 12px', textAlign: 'right',
              borderTop: '1px solid var(--border)'
            }}>
              <span className="it-mono" style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 600 }}>{curr}</span>
            </div>
            <div key={`t${i}`} style={{
              padding: '8px 12px', textAlign: 'center',
              borderTop: '1px solid var(--border)'
            }}>
              <span style={{ fontSize: 16, color: t.color, fontWeight: 700 }}>{t.arrow}</span>
            </div>
          </>
        ))}
      </div>
    </div>
  );
}

function TechGradeRow({ tech, isExpanded, onToggle, analysis, isRunning, onRunAnalysis }) {
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
                detail={`${metrics.sla.breachPct}% breach rate · ${metrics.sla.breaches} of ${metrics.sla.eligible} SLA tickets`}
                subDetail="Perfect = ≤1% · score 0 at ≥2%"
              />
              <MetricBar
                label="Response time"
                score={metrics.responseTime.score}
                maxScore={metrics.responseTime.maxScore}
                detail={metrics.responseTime.avgMins != null
                  ? `${metrics.responseTime.avgMins}min avg · team ${metrics.responseTime.teamAvgMins}min · ${metrics.responseTime.sampleSize} tickets`
                  : 'Insufficient data (need 5+ eligible tickets)'}
                subDetail="First time entry per ticket · Perfect = ≤30min · 0 at 2hrs · excl. low priority & internal"
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
                detail={metrics.fcr.notApplicable
                  ? 'N/A — escalation point (T2/T3 receive tickets as second touch)'
                  : metrics.fcr.rate != null
                    ? `${metrics.fcr.rate}% one-touch close · ${metrics.fcr.oneTouchCount} of ${metrics.fcr.eligible} tickets`
                    : `Only ${metrics.fcr.eligible} eligible tickets (need 10+)`}
                subDetail={metrics.fcr.notApplicable
                  ? 'Points redistributed across other metrics'
                  : "Perfect = ≥90% · -10% per 5% below 90%"}
              />
            </div>
          </div>
          <OutlierSection outliers={issueOutliers} />
          <TechNarrativeSection
            analysis={analysis}
            isRunning={isRunning}
            onRun={onRunAnalysis}
            techId={tech.id}
          />
        </div>
      )}
    </div>
  );
}

export function TechCapacity({ metrics, selectedQuarterKey, onSelectQuarter, aiReview }) {
  if (!metrics) return null;
  const {
    openByTechList, closedByTechList, selectedQLabel,
    quarterlyTrend, avgOpenAge, avgResolutionDays, techGrades
  } = metrics;

  const [expandedTech, setExpandedTech] = useState(null);
  const { techAnalysis = {}, techAnalysisRunning = null, loadTechAnalysis, runTechAnalysis } = aiReview || {};

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
          <button
            className="it-btn ai-soft"
            onClick={loadTechAnalysis}
            style={{ fontSize: 12 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            Load AI Analysis
          </button>
          <div style={{ display: 'flex', gap: 16 }}>
            {[
              { label: 'SLA', pts: '20/22' },
              { label: 'Response', pts: '20/22' },
              { label: 'Resolution', pts: '20/22' },
              { label: 'Escalation', pts: '15/17' },
              { label: 'Notes', pts: '15/17' },
              { label: 'FCR', pts: '10/N/A' }
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
              analysis={techAnalysis[tech.id] || null}
              isRunning={techAnalysisRunning === tech.id}
              onRunAnalysis={runTechAnalysis}
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
