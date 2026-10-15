import { useState } from 'react';
import { MetricCard } from '../components/MetricCard';
import { QuarterSelector } from '../components/QuarterSelector';

const ISSUE_COLORS = [
  '#2563eb', '#e09a3a', '#16a34a', '#dc2626',
  '#9b72f7', '#f76f4f', '#4fd4c4', '#f7c94f'
];

const NON_BILLABLE_COLOR = '#cfdcfb';
const TECH_GRID = '14px 120px 1fr 64px 64px 52px';
const WORK_TYPE_GRID = '1fr 180px 60px 88px 60px';

// "+12% vs Q3 2025 (840h)" — neutral wording; more hours isn't good or bad by itself
function compareText(current, prior, label) {
  if (prior == null) return null;
  if (prior === 0) return current > 0 ? `No hours in ${label}` : null;
  const pct = Math.round(((current - prior) / prior) * 100);
  return `${pct > 0 ? '+' : ''}${pct}% vs ${label} (${prior}h)`;
}

function DeltaCell({ current, prior }) {
  if (prior == null) {
    return <span style={{ color: 'var(--ink4)' }}>—</span>;
  }
  if (prior === 0) {
    return <span style={{ color: 'var(--ink3)' }}>{current > 0 ? 'new' : '—'}</span>;
  }
  const pct = Math.round(((current - prior) / prior) * 100);
  const arrow = pct > 0 ? '▲' : pct < 0 ? '▼' : '';
  return (
    <span title={`${prior}h same quarter last year`} style={{ color: 'var(--ink2)' }}>
      {arrow}{Math.abs(pct)}%
    </span>
  );
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function Notice({ children }) {
  return (
    <div style={{
      padding: '10px 14px', fontSize: 12.5, lineHeight: 1.5,
      color: 'var(--ink)', background: '#fdf6e7',
      border: '1px solid #f0d9a8', borderLeft: '3px solid var(--amber)',
      borderRadius: 6
    }}>
      {children}
    </div>
  );
}

// ── Per-engineer drill-down ───────────────────────────────────────────────────
// Shows ALL of the engineer's time, including internal time (admin, meetings,
// training) that isn't counted in the hours/billable % on the main row.
function TechBreakdown({ tech, priorYear, internalCountedInTotals }) {
  const types = tech.workTypes || [];
  const maxWT = types[0]?.hours || 1;
  const allHours = tech.allHours || 0;
  const allUnbillable = Math.round(types.reduce((s, wt) => s + wt.nonBillable, 0) * 10) / 10;
  const unbillablePct = allHours > 0 ? Math.round((allUnbillable / allHours) * 100) : 0;

  const stat = (value, label, color) => (
    <span>
      <span className="it-mono" style={{ color: color || 'var(--ink)' }}>{value}</span>{' '}
      <span style={{ color: 'var(--ink3)' }}>{label}</span>
    </span>
  );

  return (
    <div style={{
      margin: '6px 0 10px 28px', padding: '14px 16px',
      background: '#fbfcfe', border: '1px solid var(--border)', borderRadius: 6
    }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, marginBottom: 8, fontSize: 12.5 }}>
        {stat(`${allHours}h`, 'logged in total')}
        {stat(`${tech.ticketHours}h`, 'ticket work')}
        {stat(`${tech.projectHours}h`, 'project work')}
        {stat(`${tech.internalHours}h`, 'internal time', 'var(--ink2)')}
        {stat(
          `${allUnbillable}h`,
          `marked unbillable (${unbillablePct}%)`,
          allUnbillable > 0 ? 'var(--amber)' : undefined
        )}
        {priorYear?.available && tech.priorHours != null && stat(`${tech.priorHours}h`, `in ${priorYear.label}`)}
      </div>
      {!internalCountedInTotals && tech.internalHours > 0 && (
        <div style={{ fontSize: 11.5, color: 'var(--ink3)', marginBottom: 12 }}>
          Internal time is shown here but isn't counted in the hours or billable % on the main row.
        </div>
      )}

      <div style={{
        display: 'grid', gridTemplateColumns: WORK_TYPE_GRID, gap: 12,
        padding: '6px 4px', fontSize: 11, fontFamily: 'DM Mono, monospace',
        color: 'var(--ink4)', borderBottom: '1px solid var(--border)'
      }}>
        <div>Work type</div>
        <div>Billable / unbillable</div>
        <div style={{ textAlign: 'right' }}>Hours</div>
        <div style={{ textAlign: 'right' }}>Unbillable</div>
        <div style={{ textAlign: 'right' }}>% of time</div>
      </div>

      {types.map(wt => (
        <div key={wt.label} style={{
          display: 'grid', gridTemplateColumns: WORK_TYPE_GRID, gap: 12,
          padding: '7px 4px', alignItems: 'center',
          borderBottom: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: 12.5, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
            {wt.label}
            {wt.internal && (
              <span style={{
                fontSize: 10.5, color: 'var(--ink3)', border: '1px solid var(--border-strong)',
                borderRadius: 3, padding: '0 5px', lineHeight: '16px'
              }}>
                internal
              </span>
            )}
          </div>
          <div style={{
            height: 8, background: 'var(--slate-soft)', borderRadius: 3,
            overflow: 'hidden', display: 'flex'
          }}>
            <div style={{ width: `${(wt.billable / maxWT) * 100}%`, background: 'var(--blue)' }} />
            <div style={{ width: `${(wt.nonBillable / maxWT) * 100}%`, background: NON_BILLABLE_COLOR }} />
          </div>
          <div className="it-mono" style={{ fontSize: 12, color: 'var(--ink)', textAlign: 'right' }}>
            {wt.hours}<span style={{ color: 'var(--ink4)' }}>h</span>
          </div>
          <div className="it-mono" style={{
            fontSize: 12, textAlign: 'right',
            color: wt.nonBillable > 0 ? 'var(--amber)' : 'var(--ink4)'
          }}>
            {wt.nonBillable > 0 ? `${wt.nonBillable}h` : '—'}
          </div>
          <div className="it-mono" style={{ fontSize: 11.5, color: 'var(--ink3)', textAlign: 'right' }}>
            {allHours > 0 ? Math.round((wt.hours / allHours) * 100) : 0}%
          </div>
        </div>
      ))}

      {types.length === 0 && (
        <p style={{ fontSize: 12.5, color: 'var(--ink3)', padding: '10px 4px', margin: 0 }}>
          No time logged in this period.
        </p>
      )}
    </div>
  );
}

export function TimeAnalytics({ metrics, selectedQuarterKey, onSelectQuarter }) {
  // FIX: hooks must run before any early return. They used to sit after
  // "if (!metrics) return null", which React can crash on ("rendered more
  // hooks than during the previous render") when metrics goes from empty to loaded.
  const [expanded, setExpanded] = useState(new Set());
  const [expandedCompanies, setExpandedCompanies] = useState(new Set());
  const [expandedTechs, setExpandedTechs] = useState(new Set());
  const [hoursView, setHoursView] = useState('issue'); // 'issue' | 'company'

  if (!metrics) return null;
  const { timeAnalytics, quarterlyTrend, selectedQLabel } = metrics;
  const {
    totalHours, totalBillableHours, totalNonBillableHours, totalProjectHours,
    totalInternalHours, internalCountedInTotals,
    overallBillablePct, notesCoverage, hoursByTechList,
    hoursByIssueList, hoursByCompanyList, entryCount,
    priorYear, selectedQCoverage, coverageStart, projectTimeError
  } = timeAnalytics;

  const toggleSet = (setter) => (key) => {
    setter(prev => {
      const s = new Set(prev);
      s.has(key) ? s.delete(key) : s.add(key);
      return s;
    });
  };
  const toggle = toggleSet(setExpanded);
  const toggleCompany = toggleSet(setExpandedCompanies);
  const toggleTech = toggleSet(setExpandedTechs);

  const priorAvailable = !!priorYear?.available;
  const maxTechHours = Math.max(
    1,
    ...hoursByTechList.map(t => t.hours),
    ...hoursByTechList.map(t => (priorAvailable ? t.priorHours || 0 : 0))
  );
  const maxIssueHours = hoursByIssueList[0]?.hours || 1;
  const maxCompanyHours = (hoursByCompanyList || [])[0]?.hours || 1;
  const targetBillablePct = 80;

  const periodLabel = selectedQLabel || 'All available data';
  const totalCompare = priorAvailable
    ? compareText(totalHours, priorYear.totalHours, priorYear.label)
    : null;
  const billableCompare = priorAvailable && priorYear.totalBillableHours > 0
    ? `${Math.round(((totalBillableHours - priorYear.totalBillableHours) / priorYear.totalBillableHours) * 100)}% vs last year`
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <MetricCard eyebrow="Total hours"
          value={<>{totalHours}<span style={{ fontSize: 16, color: 'var(--ink3)', marginLeft: 2 }}>h</span></>}
          foot={totalCompare || `${periodLabel} · ${totalProjectHours}h project work`} />
        <MetricCard eyebrow="Billable hours"
          value={<>{totalBillableHours}<span style={{ fontSize: 16, color: 'var(--ink3)', marginLeft: 2 }}>h</span></>}
          foot={billableCompare
            ? `${overallBillablePct}% of total · ${billableCompare.startsWith('-') ? '' : '+'}${billableCompare}`
            : `${overallBillablePct}% of total`}
          footTone={overallBillablePct >= targetBillablePct ? 'pos' : 'warn'} />
        <MetricCard eyebrow="Non-billable hours"
          value={<>{totalNonBillableHours}<span style={{ fontSize: 16, color: 'var(--ink3)', marginLeft: 2 }}>h</span></>}
          foot={priorAvailable
            ? `${100 - overallBillablePct}% of total · ${priorYear.totalNonBillableHours}h last year`
            : `${100 - overallBillablePct}% of total`} />
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

      {/* Data warnings */}
      {selectedQCoverage === 'none' && (
        <Notice>
          No time entries are available for {periodLabel}. Time data starts {formatDate(coverageStart)}.
        </Notice>
      )}
      {selectedQCoverage === 'partial' && (
        <Notice>
          Time data starts {formatDate(coverageStart)}, partway through {periodLabel}. Hours for this quarter are incomplete.
        </Notice>
      )}
      {projectTimeError && (
        <Notice>
          Project time didn't load on the last sync, so totals may be missing project hours. Run a full refresh, or check the Railway logs for "project time fetch FAILED".
        </Notice>
      )}

      {/* Hours by tech */}
      <div className="it-card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, gap: 16 }}>
          <div>
            <div className="it-section-title">Hours logged per technician</div>
            <div className="it-section-sub">
              {periodLabel}
              {priorAvailable
                ? ` compared with ${priorYear.label}`
                : priorYear
                  ? ` · No comparison: ${priorYear.label} is older than the time data we keep`
                  : ''}
              {' · Click an engineer to see where their time went'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexShrink: 0 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink3)' }}>
              <span style={{ width: 12, height: 10, background: 'var(--blue)', borderRadius: 2 }} />
              Billable
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink3)' }}>
              <span style={{ width: 12, height: 10, background: NON_BILLABLE_COLOR, borderRadius: 2 }} />
              Non-billable
            </span>
            {priorAvailable && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink3)' }}>
                <span style={{ width: 2, height: 12, background: 'var(--ink)' }} />
                Last year
              </span>
            )}
          </div>
        </div>

        {/* Column headers */}
        <div style={{
          display: 'grid', gridTemplateColumns: TECH_GRID, gap: 14,
          padding: '0 0 6px', fontSize: 11, fontFamily: 'DM Mono, monospace',
          color: 'var(--ink4)', borderBottom: '1px solid var(--border)', marginBottom: 6
        }}>
          <div />
          <div />
          <div />
          <div style={{ textAlign: 'right' }}>Hours</div>
          <div style={{ textAlign: 'right' }}>vs LY</div>
          <div style={{ textAlign: 'right' }}>Bill %</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {hoursByTechList.map(tech => {
            const billGood = tech.billablePct >= targetBillablePct;
            const isOpen = expandedTechs.has(tech.name);
            const priorLeft = priorAvailable && tech.priorHours > 0
              ? Math.min(99.4, (tech.priorHours / maxTechHours) * 100)
              : null;

            return (
              <div key={tech.name}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleTech(tech.name)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleTech(tech.name); } }}
                  style={{
                    display: 'grid', gridTemplateColumns: TECH_GRID,
                    gap: 14, alignItems: 'center', padding: '6px 0',
                    cursor: 'pointer', borderRadius: 4
                  }}>
                  <div style={{
                    color: 'var(--ink3)', fontSize: 10,
                    transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.15s'
                  }}>▶</div>
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
                      background: NON_BILLABLE_COLOR
                    }} />
                    {priorLeft != null && (
                      <div
                        title={`${tech.priorHours}h in ${priorYear.label}`}
                        style={{
                          position: 'absolute', top: 0, bottom: 0,
                          left: `${priorLeft}%`, width: 2,
                          background: 'var(--ink)'
                        }}
                      />
                    )}
                  </div>
                  <div className="it-mono" style={{ fontSize: 13, color: 'var(--ink)', textAlign: 'right' }}>
                    {tech.hours}<span style={{ color: 'var(--ink4)' }}>h</span>
                  </div>
                  <div className="it-mono" style={{ fontSize: 12, textAlign: 'right' }}>
                    <DeltaCell current={tech.hours} prior={tech.priorHours} />
                  </div>
                  <div className="it-mono" style={{
                    fontSize: 12, textAlign: 'right',
                    color: billGood ? 'var(--green)' : 'var(--amber)'
                  }}>
                    {tech.billablePct}%
                  </div>
                </div>

                {isOpen && (
                  <TechBreakdown
                    tech={tech}
                    priorYear={priorYear}
                    internalCountedInTotals={internalCountedInTotals}
                  />
                )}
              </div>
            );
          })}
        </div>

        {hoursByTechList.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--ink3)', padding: '16px 4px' }}>
            No time entry data for this period
          </p>
        )}

        <div className="it-mono" style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 14 }}>
          Target billable rate: {targetBillablePct}% · team avg: {overallBillablePct}%
          {priorAvailable && ` · team total ${priorYear.label}: ${priorYear.totalHours}h`}
        </div>
        {!internalCountedInTotals && totalInternalHours > 0 && (
          <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 6 }}>
            {totalInternalHours}h of internal time (admin, meetings, training, research, sales/quoting) isn't counted above. Click an engineer to see theirs.
          </div>
        )}
      </div>

      {/* Hours by issue type / company — toggleable */}
      <div className="it-card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div className="it-section-title">
              {hoursView === 'issue' ? 'Hours by issue type' : 'Hours by company'}
            </div>
            <div className="it-section-sub">
              {periodLabel} · Click a row to expand
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              className={`it-pill${hoursView === 'issue' ? ' active' : ''}`}
              onClick={() => setHoursView('issue')}
              style={{ fontSize: 11, padding: '3px 10px' }}
            >
              Issue
            </button>
            <button
              className={`it-pill${hoursView === 'company' ? ' active' : ''}`}
              onClick={() => setHoursView('company')}
              style={{ fontSize: 11, padding: '3px 10px' }}
            >
              Company
            </button>
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
          <div>{hoursView === 'issue' ? 'ISSUE' : 'COMPANY'}</div>
          <div>SHARE</div>
          <div style={{ textAlign: 'right' }}>HOURS</div>
          <div style={{ textAlign: 'right' }}>%</div>
        </div>

        {/* Issue view */}
        {hoursView === 'issue' && hoursByIssueList.map((issue, idx) => {
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

        {/* Company view */}
        {hoursView === 'company' && (hoursByCompanyList || []).map((company, idx) => {
          const isOpen = expandedCompanies.has(company.name);
          const hasSubs = company.issueTypes.length > 0;
          const color = ISSUE_COLORS[idx % ISSUE_COLORS.length];
          const pct = totalHours > 0 ? ((company.hours / totalHours) * 100).toFixed(1) : 0;

          return (
            <div key={company.name}>
              <div
                onClick={() => hasSubs && toggleCompany(company.name)}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink)', overflow: 'hidden' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {company.name}
                  </span>
                </div>
                <div className="it-bar-track" style={{ height: 6, maxWidth: 280 }}>
                  <div className="it-bar-fill" style={{
                    width: `${(company.hours / maxCompanyHours) * 100}%`,
                    background: color
                  }} />
                </div>
                <div className="it-mono" style={{ fontSize: 12.5, color: 'var(--ink)', textAlign: 'right' }}>
                  {company.hours}<span style={{ color: 'var(--ink4)' }}>h</span>
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
                  {company.issueTypes.map(sub => (
                    <div key={sub.label} style={{
                      display: 'grid', gridTemplateColumns: '1fr 200px 70px 56px',
                      gap: 12, padding: '5px 4px', alignItems: 'center'
                    }}>
                      <div style={{ fontSize: 12.5, color: 'var(--ink2)' }}>{sub.label}</div>
                      <div className="it-bar-track" style={{ height: 4 }}>
                        <div className="it-bar-fill" style={{
                          width: `${company.hours > 0 ? (sub.hours / company.hours) * 100 : 0}%`,
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

        {hoursView === 'issue' && hoursByIssueList.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--ink3)', padding: '16px 4px' }}>
            No time entry data for this period
          </p>
        )}
        {hoursView === 'company' && (hoursByCompanyList || []).length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--ink3)', padding: '16px 4px' }}>
            No time entry data for this period
          </p>
        )}
      </div>
    </div>
  );
}