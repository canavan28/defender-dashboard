import { useState } from 'react';
import { MetricCard } from '../components/MetricCard';
import { QuarterSelector } from '../components/QuarterSelector';

const ISSUE_COLORS = [
  '#2563eb', '#e09a3a', '#16a34a', '#dc2626',
  '#9b72f7', '#f76f4f', '#4fd4c4', '#f7c94f'
];

export function TimeAnalytics({ metrics, selectedQuarterKey, onSelectQuarter }) {
  if (!metrics) return null;
  const { timeAnalytics, quarterlyTrend, selectedQLabel } = metrics;
  const {
    totalHours, totalBillableHours, totalNonBillableHours,
    overallBillablePct, notesCoverage, hoursByTechList,
    hoursByIssueList, entryCount
  } = timeAnalytics;

  const [expanded, setExpanded] = useState(new Set());
  const toggle = (label) => {
    const s = new Set(expanded);
    s.has(label) ? s.delete(label) : s.add(label);
    setExpanded(s);
  };

  const maxTechHours = hoursByTechList[0]?.hours || 1;
  const maxIssueHours = hoursByIssueList[0]?.hours || 1;
  const targetBillablePct = 80;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <MetricCard eyebrow="Total hours"
          value={<>{totalHours}<span style={{ fontSize: 16, color: 'var(--ink3)', marginLeft: 2 }}>h</span></>}
          foot={selectedQLabel || 'All available data'} />
        <MetricCard eyebrow="Billable hours"
          value={<>{totalBillableHours}<span style={{ fontSize: 16, color: 'var(--ink3)', marginLeft: 2 }}>h</span></>}
          foot={`${overallBillablePct}% of total`}
          footTone={overallBillablePct >= targetBillablePct ? 'pos' : 'warn'} />
        <MetricCard eyebrow="Non-billable hours"
          value={<>{totalNonBillableHours}<span style={{ fontSize: 16, color: 'var(--ink3)', marginLeft: 2 }}>h</span></>}
          foot={`${100 - overallBillablePct}% of total`} />
        <MetricCard eyebrow="Notes coverage"
          value={<>{notesCoverage}<span style={{ fontSize: 16, color: 'var(--ink3)', marginLeft: 2 }}>%</span></>}
          foot={`${entryCount.toLocaleString()} time entries`}
          footTone={notesCoverage >= 80 ? 'pos' : 'warn'} />
      </div>

      {/* Quarter selector */}
      <div className="it-card" style={{ padding: '0 18px' }}>
        <QuarterSelector
          quarters={quarterlyTrend}
          selectedKey={selectedQuarterKey}
          onChange={onSelectQuarter}
        />
      </div>

      {/* Hours by tech */}
      <div className="it-card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div className="it-section-title">Hours logged per technician</div>
            <div className="it-section-sub">
              {selectedQLabel || 'All available data'} · Billable (solid) vs non-billable (light) · % billable on right
            </div>
          </div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink3)' }}>
              <span style={{ width: 12, height: 10, background: 'var(--blue)', borderRadius: 2 }} />
              Billable
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink3)' }}>
              <span style={{ width: 12, height: 10, background: '#cfdcfb', borderRadius: 2 }} />
              Non-billable
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {hoursByTechList.map(tech => {
            const billGood = tech.billablePct >= targetBillablePct;
            return (
              <div key={tech.name} style={{
                display: 'grid',
                gridTemplateColumns: '120px 1fr 70px 56px',
                gap: 14, alignItems: 'center'
              }}>
                <div style={{
                  fontSize: 13, color: 'var(--ink)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>
                  {tech.name}
                </div>
                <div style={{
                  position: 'relative', height: 18,
                  background: 'var(--slate-soft)',
                  borderRadius: 4, overflow: 'hidden', display: 'flex'
                }}>
                  <div style={{
                    width: `${(tech.billable / maxTechHours) * 100}%`,
                    background: 'var(--blue)'
                  }} />
                  <div style={{
                    width: `${(tech.nonBillable / maxTechHours) * 100}%`,
                    background: '#cfdcfb'
                  }} />
                </div>
                <div className="it-mono" style={{ fontSize: 13, color: 'var(--ink)', textAlign: 'right' }}>
                  {tech.hours}<span style={{ color: 'var(--ink4)' }}>h</span>
                </div>
                <div className="it-mono" style={{
                  fontSize: 12, textAlign: 'right',
                  color: billGood ? 'var(--green)' : 'var(--amber)'
                }}>
                  {tech.billablePct}%
                </div>
              </div>
            );
          })}
        </div>
        <div className="it-mono" style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 14 }}>
          Target billable rate: {targetBillablePct}% · team avg: {overallBillablePct}%
        </div>
      </div>

      {/* Hours by issue type */}
      <div className="it-card" style={{ padding: 20 }}>
        <div style={{ marginBottom: 12 }}>
          <div className="it-section-title">Hours by issue type</div>
          <div className="it-section-sub">
            {selectedQLabel || 'All available data'} · Click a row to expand sub-issues
          </div>
        </div>

        {/* Header row */}
        <div style={{
          display: 'grid', gridTemplateColumns: '24px 1fr 1fr 70px 56px',
          gap: 12, padding: '8px 4px',
          fontSize: 11, fontFamily: 'DM Mono, monospace',
          color: 'var(--ink4)', borderBottom: '1px solid var(--border)'
        }}>
          <div />
          <div>ISSUE</div>
          <div>SHARE</div>
          <div style={{ textAlign: 'right' }}>HOURS</div>
          <div style={{ textAlign: 'right' }}>%</div>
        </div>

        {hoursByIssueList.map((issue, idx) => {
          const isOpen = expanded.has(issue.label);
          const hasSubs = issue.subIssues.length > 0;
          const color = ISSUE_COLORS[idx % ISSUE_COLORS.length];
          const pct = totalHours > 0 ? ((issue.hours / totalHours) * 100).toFixed(1) : 0;

          return (
            <div key={issue.label}>
              <div
                onClick={() => hasSubs && toggle(issue.label)}
                style={{
                  display: 'grid', gridTemplateColumns: '24px 1fr 1fr 70px 56px',
                  gap: 12, padding: '10px 4px', alignItems: 'center',
                  borderBottom: '1px solid var(--border)',
                  cursor: hasSubs ? 'pointer' : 'default'
                }}>
                <div style={{
                  color: 'var(--ink3)', fontSize: 10,
                  transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.15s',
                  visibility: hasSubs ? 'visible' : 'hidden'
                }}>▶</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                  {issue.label}
                </div>
                <div className="it-bar-track" style={{ height: 6, maxWidth: 280 }}>
                  <div className="it-bar-fill" style={{
                    width: `${(issue.hours / maxIssueHours) * 100}%`,
                    background: color
                  }} />
                </div>
                <div className="it-mono" style={{ fontSize: 12.5, color: 'var(--ink)', textAlign: 'right' }}>
                  {issue.hours}<span style={{ color: 'var(--ink4)' }}>h</span>
                </div>
                <div className="it-mono" style={{ fontSize: 12, color: 'var(--ink3)', textAlign: 'right' }}>
                  {pct}%
                </div>
              </div>

              {isOpen && hasSubs && (
                <div style={{
                  padding: '8px 0 14px 36px',
                  background: '#fbfcfe',
                  borderBottom: '1px solid var(--border)'
                }}>
                  {issue.subIssues.map(sub => (
                    <div key={sub.label} style={{
                      display: 'grid', gridTemplateColumns: '1fr 200px 70px 56px',
                      gap: 12, padding: '5px 4px', alignItems: 'center'
                    }}>
                      <div style={{ fontSize: 12.5, color: 'var(--ink2)' }}>{sub.label}</div>
                      <div className="it-bar-track" style={{ height: 4 }}>
                        <div className="it-bar-fill" style={{
                          width: `${issue.hours > 0 ? (sub.hours / issue.hours) * 100 : 0}%`,
                          background: color, opacity: 0.65
                        }} />
                      </div>
                      <div className="it-mono" style={{ fontSize: 12, color: 'var(--ink2)', textAlign: 'right' }}>
                        {sub.hours}<span style={{ color: 'var(--ink4)' }}>h</span>
                      </div>
                      <div className="it-mono" style={{ fontSize: 11.5, color: 'var(--ink4)', textAlign: 'right' }}>
                        {totalHours > 0 ? ((sub.hours / totalHours) * 100).toFixed(1) : 0}%
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {hoursByIssueList.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--ink3)', padding: '16px 4px' }}>
            No time entry data for this period
          </p>
        )}
      </div>
    </div>
  );
}