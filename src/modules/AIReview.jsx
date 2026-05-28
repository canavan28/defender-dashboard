import { useState, useEffect } from 'react';

const SEV = {
    critical: { label: 'Critical', fg: '#991b1b', bg: '#fee2e2', stripe: '#dc2626' },
    high: { label: 'High', fg: '#9a3412', bg: '#ffedd5', stripe: '#ea580c' },
    medium: { label: 'Medium', fg: '#854d0e', bg: '#fef3c7', stripe: '#d97706' },
    low: { label: 'Low', fg: '#334155', bg: '#e2e8f0', stripe: '#64748b' }
};

const FLAG = {
    'customer-health': { label: 'Customer health', icon: '♥' },
    'cross-customer': { label: 'Cross-customer', icon: '◎' },
    'escalation': { label: 'Escalation', icon: '↗' },
    'tech-performance': { label: 'Tech performance', icon: '▲' },
    'documentation': { label: 'Documentation', icon: '□' },
    'reopen': { label: 'Reopened', icon: '↻' }
};

const ACTION = {
    'unactioned': { label: 'Unactioned', fg: 'var(--ink3)', bg: 'transparent' },
    'escalated': { label: 'Escalated', fg: '#991b1b', bg: '#fee2e2' },
    'assigned': { label: 'Assigned', fg: '#1e3a8a', bg: '#dbeafe' },
    'ignored': { label: 'Ignored', fg: 'var(--ink3)', bg: 'var(--slate-soft)' },
    'resolved': { label: 'Resolved', fg: '#14532d', bg: '#dcfce7' }
};

const AI_PHASES = [
    'Fetching tickets',
    'Analyzing content',
    'Cross-referencing',
    'Generating flags'
];

function SeverityPill({ sev }) {
    const s = SEV[sev] || SEV.low;
    return (
        <span className="sev-pill" style={{ background: s.bg, color: s.fg }}>
            <span className="sev-dot" style={{ background: s.stripe }} />
            {s.label}
        </span>
    );
}

function FlagTypePill({ type }) {
    const f = FLAG[type] || { label: type, icon: '•' };
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 12, color: 'var(--ai-deep)',
            background: 'var(--ai-soft)', padding: '2px 8px',
            borderRadius: 4, fontFamily: 'DM Mono, monospace'
        }}>
            <span>{f.icon}</span>{f.label}
        </span>
    );
}

function ReviewBanner({ running, runState, lastRun, reviewStats, onRun, disabled }) {
    const formatDate = (iso) => {
        if (!iso) return 'Never';
        const d = new Date(iso);
        const today = new Date();
        if (d.toDateString() === today.toDateString()) {
            return `today at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    return (
        <div className={`ai-banner${running ? ' running' : ''}`} style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: 'white', border: '1px solid #d6daff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--ai)'
                }}>
                    {running ? (
                        <svg className="it-spin" width="18" height="18" viewBox="0 0 24 24"
                            fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                    ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2">
                            <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
                            <circle cx="12" cy="12" r="3" />
                        </svg>
                    )}
                </div>

                <div style={{ flex: 1 }}>
                    {running ? (
                        <>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ai-deep)' }}>
                                    AI Review running
                                </div>
                                <div className="it-mono" style={{ fontSize: 11.5, color: 'var(--ink3)' }}>
                                    {AI_PHASES[runState.phase]} · {runState.progress}%
                                </div>
                            </div>
                            <div className="it-progress" style={{ marginTop: 10 }} />
                            <div style={{ display: 'flex', gap: 18, marginTop: 8 }}>
                                {AI_PHASES.map((phase, i) => (
                                    <div key={phase} className="it-mono" style={{
                                        fontSize: 11,
                                        color: i < runState.phase ? 'var(--green)'
                                            : i === runState.phase ? 'var(--ai-deep)'
                                                : 'var(--ink4)',
                                        display: 'inline-flex', alignItems: 'center', gap: 5
                                    }}>
                                        <span style={{
                                            width: 6, height: 6, borderRadius: 999,
                                            background: i < runState.phase ? 'var(--green)'
                                                : i === runState.phase ? 'var(--ai-deep)'
                                                    : 'var(--ink4)'
                                        }} />
                                        {phase}
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ai-deep)' }}>
                                    AI Review
                                </div>
                                <div className="it-mono" style={{ fontSize: 11.5, color: 'var(--ink3)' }}>
                                    Last run {formatDate(lastRun)}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 24, marginTop: 8 }}>
                                <div>
                                    <span className="it-mono" style={{ fontSize: 12.5, color: 'var(--ink)' }}>
                                        {(reviewStats.totalReviewed || 0).toLocaleString()}
                                    </span>
                                    <span className="it-mono" style={{ fontSize: 11.5, color: 'var(--ink3)', marginLeft: 5 }}>
                                        tickets reviewed
                                    </span>
                                </div>
                                <div>
                                    <span className="it-mono" style={{ fontSize: 12.5, color: 'var(--ai-deep)', fontWeight: 600 }}>
                                        {reviewStats.totalFlagged || 0}
                                    </span>
                                    <span className="it-mono" style={{ fontSize: 11.5, color: 'var(--ink3)', marginLeft: 5 }}>
                                        tickets flagged
                                    </span>
                                </div>
                                {reviewStats.lastRunReviewed > 0 && (
                                    <div className="it-mono" style={{ fontSize: 11.5, color: 'var(--ink4)' }}>
                                        Last run: {reviewStats.lastRunReviewed} reviewed, {reviewStats.lastRunFlagged} flagged
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {!running && (
                    <button className="it-btn ai" onClick={onRun} disabled={disabled}
                        style={disabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2.4"
                            strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14M13 5l7 7-7 7" />
                        </svg>
                        Run AI Review
                    </button>
                )}
            </div>
        </div>
    );
}

function StatsSummary({ flags }) {
    const sevCounts = { critical: 0, high: 0, medium: 0, low: 0 };
    const flagTypeCounts = {};
    Object.keys(FLAG).forEach(k => { flagTypeCounts[k] = 0; });
    let actioned = 0;

    flags.forEach(f => {
        if (sevCounts[f.sev] !== undefined) sevCounts[f.sev]++;
        if (flagTypeCounts[f.flagType] !== undefined) flagTypeCounts[f.flagType]++;
        if (f.action !== 'unactioned') actioned++;
    });

    const total = flags.length;
    const maxFlagType = Math.max(1, ...Object.values(flagTypeCounts));

    return (
        <div className="it-card" style={{
            padding: 16,
            display: 'grid',
            gridTemplateColumns: '1.5fr 1fr 0.85fr',
            gap: 18
        }}>
            <div>
                <div className="it-eyebrow" style={{ marginBottom: 10 }}>By severity</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {['critical', 'high', 'medium', 'low'].map(sev => {
                        const s = SEV[sev];
                        return (
                            <div key={sev} style={{
                                padding: '10px 12px', borderRadius: 8,
                                background: s.bg, borderLeft: `3px solid ${s.stripe}`
                            }}>
                                <div className="it-mono" style={{
                                    fontSize: 10.5, color: s.fg,
                                    fontWeight: 600, letterSpacing: '0.06em'
                                }}>
                                    {s.label.toUpperCase()}
                                </div>
                                <div className="it-mono" style={{
                                    fontSize: 24, color: 'var(--ink)',
                                    lineHeight: 1.1, marginTop: 2, fontWeight: 500
                                }}>
                                    {sevCounts[sev]}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div>
                <div className="it-eyebrow" style={{ marginBottom: 10 }}>By flag type</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {Object.entries(flagTypeCounts)
                        .filter(([, n]) => n > 0)
                        .sort((a, b) => b[1] - a[1])
                        .map(([k, n]) => (
                            <div key={k} style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 90px 22px',
                                gap: 10, alignItems: 'center'
                            }}>
                                <span style={{ fontSize: 12.5, color: 'var(--ink2)' }}>
                                    {FLAG[k].label}
                                </span>
                                <div className="it-bar-track" style={{ height: 4 }}>
                                    <div className="it-bar-fill" style={{
                                        width: `${(n / maxFlagType) * 100}%`,
                                        background: 'var(--ai)'
                                    }} />
                                </div>
                                <span className="it-mono" style={{
                                    fontSize: 12, color: 'var(--ink)', textAlign: 'right'
                                }}>
                                    {n}
                                </span>
                            </div>
                        ))}
                    {Object.values(flagTypeCounts).every(n => n === 0) && (
                        <div className="it-mono" style={{ fontSize: 12, color: 'var(--ink4)' }}>
                            No flags yet
                        </div>
                    )}
                </div>
            </div>

            <div>
                <div className="it-eyebrow" style={{ marginBottom: 10 }}>Actioned</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <div className="it-mono" style={{ fontSize: 24, fontWeight: 500, color: 'var(--ink)' }}>
                        {actioned}
                    </div>
                    <div className="it-mono" style={{ fontSize: 13, color: 'var(--ink3)' }}>
                        / {total}
                    </div>
                </div>
                <div style={{
                    background: 'var(--slate-soft)', height: 8,
                    borderRadius: 999, marginTop: 8, overflow: 'hidden'
                }}>
                    <div style={{
                        width: `${total > 0 ? (actioned / total) * 100 : 0}%`,
                        height: '100%', background: 'var(--green)',
                        transition: 'width 0.4s'
                    }} />
                </div>
                <div className="it-mono" style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 6 }}>
                    {total - actioned} unactioned remaining
                </div>
            </div>
        </div>
    );
}

function ActionMenu({ value, onChange, onClose }) {
    const items = [
        { v: 'escalated', label: 'Escalate', hint: 'Flag for immediate attention → Action Items', dot: 'var(--red)' },
        { v: 'assigned', label: 'Assign follow-up', hint: 'Note who needs to address → Action Items', dot: 'var(--blue)' },
        { v: 'ignored', label: 'Ignore', hint: 'Acknowledged, no action needed', dot: 'var(--slate)' },
        { v: 'resolved', label: 'Mark resolved', hint: 'Issue was addressed', dot: 'var(--green)' }
    ];
    return (
        <div className="action-menu" onClick={e => e.stopPropagation()}>
            {items.map(item => (
                <div key={item.v} className="action-item"
                    onClick={() => { onChange(item.v); onClose(); }}>
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: item.dot }} />
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13 }}>{item.label}</div>
                        <div className="it-mono" style={{ fontSize: 10.5, color: 'var(--ink4)' }}>
                            {item.hint}
                        </div>
                    </div>
                </div>
            ))}
            {value !== 'unactioned' && (
                <>
                    <div style={{ height: 1, background: 'var(--border)', margin: '4px' }} />
                    <div className="action-item"
                        onClick={() => { onChange('unactioned'); onClose(); }}
                        style={{ color: 'var(--ink3)' }}>
                        <span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--ink4)' }} />
                        Clear action
                    </div>
                </>
            )}
        </div>
    );
}

function FlagRowDetail({ flag }) {
    return (
        <div style={{
            background: '#fbfbfe',
            borderTop: '1px solid var(--border)',
            padding: '18px 22px 22px'
        }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 28 }}>
                <div>
                    <div className="it-eyebrow" style={{ marginBottom: 6 }}>AI analysis</div>
                    <div style={{
                        fontSize: 13.5, color: 'var(--ink)',
                        lineHeight: 1.55, marginBottom: 16
                    }}>
                        {flag.summary}
                    </div>

                    <div className="it-eyebrow" style={{ marginBottom: 8 }}>Why it was flagged</div>
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {(flag.reasons || []).map((r, i) => (
                            <li key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: 13, color: 'var(--ink2)' }}>
                                <span style={{
                                    width: 4, height: 4, borderRadius: 999,
                                    background: 'var(--ai)', marginTop: 8, flexShrink: 0
                                }} />
                                {r}
                            </li>
                        ))}
                    </ul>

                    {flag.notesForExec && (
                        <>
                            <div className="it-eyebrow" style={{ marginTop: 18, marginBottom: 6 }}>
                                Notes for exec
                            </div>
                            <div style={{
                                fontSize: 13, color: 'var(--ink2)', lineHeight: 1.5,
                                background: 'var(--ai-soft)', padding: '10px 14px',
                                borderRadius: 8, borderLeft: '3px solid var(--ai)'
                            }}>
                                {flag.notesForExec}
                            </div>
                        </>
                    )}
                </div>

                <div>
                    <div className="it-eyebrow" style={{ marginBottom: 8 }}>Ticket metadata</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', rowGap: 7, fontSize: 12.5 }}>
                        <div className="it-mono" style={{ color: 'var(--ink4)' }}>Company</div>
                        <div style={{ color: 'var(--ink)' }}>{flag.company}</div>
                        <div className="it-mono" style={{ color: 'var(--ink4)' }}>Tech involved</div>
                        <div style={{ color: 'var(--ink)' }}>{flag.tech || '—'}</div>
                        <div className="it-mono" style={{ color: 'var(--ink4)' }}>Open duration</div>
                        <div style={{ color: 'var(--ink)' }}>
                            {flag.openedDays != null ? `${flag.openedDays}d` : '—'}
                        </div>
                        <div className="it-mono" style={{ color: 'var(--ink4)' }}>Flagged</div>
                        <div style={{ color: 'var(--ink)' }}>
                            {flag.dateFlagged ? new Date(flag.dateFlagged).toLocaleDateString() : '—'}
                        </div>
                    </div>

                    <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <a href={flag.ticketUrl} target="_blank" rel="noreferrer"
                            className="it-btn ai-soft"
                            style={{ textDecoration: 'none', justifyContent: 'center' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="2.2">
                                <path d="M10 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
                                <path d="M14 4h6v6" /><path d="M10 14L20 4" />
                            </svg>
                            Open in AutoTask
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ExclusionPanel({ exclusions, companies, onClose, onAdd, onRemove }) {
    const [q, setQ] = useState('');
    const [reason, setReason] = useState('');
    const [selectedCompany, setSelectedCompany] = useState(null);

    const excludedNames = new Set(exclusions.map(e => e.companyName));
    const matches = companies
        .filter(name => name.toLowerCase().includes(q.toLowerCase()) && !excludedNames.has(name))
        .slice(0, 6);

    return (
        <div className="it-side-panel" style={{ width: 440 }}>
            <div style={{
                position: 'sticky', top: 0, zIndex: 2,
                background: 'white', borderBottom: '1px solid var(--border)',
                padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12
            }}>
                <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>Company exclusions</div>
                    <div className="it-mono" style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 1 }}>
                        {exclusions.length} companies excluded from AI review
                    </div>
                </div>
                <div style={{ flex: 1 }} />
                <button className="it-btn ghost" onClick={onClose}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div style={{ padding: 18 }}>
                <div className="it-eyebrow" style={{ marginBottom: 8 }}>Add to exclusion list</div>
                <div style={{ position: 'relative' }}>
                    <input
                        placeholder="Search companies..."
                        value={q}
                        onChange={e => { setQ(e.target.value); setSelectedCompany(null); }}
                        style={{
                            width: '100%', fontFamily: 'DM Sans, sans-serif', fontSize: 13,
                            padding: '8px 12px', borderRadius: 6,
                            border: '1px solid var(--border-strong)', outline: 'none'
                        }}
                    />
                    {q && matches.length > 0 && (
                        <div style={{
                            marginTop: 6, border: '1px solid var(--border)',
                            borderRadius: 6, overflow: 'hidden'
                        }}>
                            {matches.map(name => (
                                <div key={name}
                                    onClick={() => { setSelectedCompany(name); setQ(name); }}
                                    style={{
                                        padding: '8px 12px', fontSize: 13, color: 'var(--ink)',
                                        cursor: 'pointer', borderBottom: '1px solid var(--border)',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        background: selectedCompany === name ? 'var(--blue-soft)' : 'white'
                                    }}>
                                    <span>{name}</span>
                                    <span className="it-mono" style={{ fontSize: 11, color: 'var(--ai)' }}>
                                        select
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <input
                    placeholder="Reason (optional)"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    style={{
                        width: '100%', fontFamily: 'DM Sans, sans-serif', fontSize: 12.5,
                        padding: '7px 12px', borderRadius: 6, marginTop: 8,
                        border: '1px solid var(--border)', outline: 'none', color: 'var(--ink2)'
                    }}
                />
                <button
                    className="it-btn primary"
                    disabled={!selectedCompany}
                    onClick={() => {
                        if (selectedCompany) {
                            onAdd(null, selectedCompany, reason || 'Excluded by exec');
                            setQ(''); setReason(''); setSelectedCompany(null);
                        }
                    }}
                    style={{ marginTop: 10, width: '100%', justifyContent: 'center' }}>
                    Add to exclusion list
                </button>

                <div className="it-eyebrow" style={{ marginTop: 22, marginBottom: 8 }}>
                    Currently excluded
                </div>
                <div className="it-card" style={{ padding: 0 }}>
                    {exclusions.length === 0 && (
                        <div style={{ padding: '14px 14px', fontSize: 13, color: 'var(--ink3)' }}>
                            No companies excluded yet
                        </div>
                    )}
                    {exclusions.map((e, i) => (
                        <div key={e.companyName || e.companyId} style={{
                            padding: '12px 14px',
                            borderBottom: i === exclusions.length - 1 ? 0 : '1px solid var(--border)',
                            display: 'flex', alignItems: 'center', gap: 10
                        }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>
                                    {e.companyName}
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 1 }}>
                                    {e.reason}
                                </div>
                                <div className="it-mono" style={{ fontSize: 10.5, color: 'var(--ink4)', marginTop: 2 }}>
                                    added {e.addedAt}
                                </div>
                            </div>
                            <button
                                className="it-btn danger-ghost sm"
                                onClick={() => onRemove(e.companyId)}>
                                Remove
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}


function TicketDrilldown({ ticketNumbers, flagMap, companyName }) {
  if (!ticketNumbers || ticketNumbers.length === 0) {
    return (
      <div style={{ padding: '12px 16px', fontSize: 13, color: 'var(--ink3)' }}>
        No ticket data available for this trend.
      </div>
    );
  }

  const SEV_D = {
    critical: { fg: '#991b1b', bg: '#fee2e2', stripe: '#dc2626' },
    high:     { fg: '#9a3412', bg: '#ffedd5', stripe: '#ea580c' },
    medium:   { fg: '#854d0e', bg: '#fef3c7', stripe: '#d97706' },
    low:      { fg: '#334155', bg: '#e2e8f0', stripe: '#64748b' }
  };
  const FLAG_D = {
    'customer-health':  '♥', 'cross-customer': '◎',
    'escalation': '↗', 'tech-performance': '▲',
    'documentation': '□', 'reopen': '↻'
  };

  const flagged = ticketNumbers.filter(n => flagMap[n]);
  const unflagged = ticketNumbers.filter(n => !flagMap[n]);

  return (
    <div style={{ borderTop: '1px solid var(--border)', background: '#f7f8fc' }}>
      {/* Header */}
      <div style={{
        padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12,
        borderBottom: '1px solid var(--border)'
      }}>
        <span className="it-mono" style={{ fontSize: 11, color: 'var(--ink3)' }}>
          {ticketNumbers.length} TICKETS · {flagged.length} FLAGGED · {unflagged.length} CLEAN
        </span>
      </div>

      {/* Flagged tickets — full detail */}
      {flagged.length > 0 && (
        <div>
          <div style={{ padding: '8px 16px 4px' }}>
            <span className="it-mono" style={{ fontSize: 10.5, color: 'var(--ai-deep)', fontWeight: 600 }}>
              FLAGGED TICKETS
            </span>
          </div>
          {flagged.map(n => {
            const f = flagMap[n];
            const s = SEV_D[f.sev] || SEV_D.low;
            return (
              <div key={n} style={{
                display: 'grid',
                gridTemplateColumns: '90px 80px 1fr 120px 32px',
                gap: 10, padding: '10px 16px', alignItems: 'center',
                borderBottom: '1px solid var(--border)',
                background: 'white',
                borderLeft: `3px solid ${s.stripe}`
              }}>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '2px 6px',
                  borderRadius: 999, background: s.bg, color: s.fg,
                  fontFamily: 'DM Mono, monospace', textAlign: 'center'
                }}>
                  {f.sev?.toUpperCase()}
                </span>
                <a href={f.ticketUrl} target="_blank" rel="noreferrer"
                  className="it-mono"
                  style={{
                    fontSize: 12, color: 'var(--blue)', textDecoration: 'none',
                    fontWeight: 500, flexShrink: 0,
                    display: 'inline-flex', alignItems: 'center', gap: 3
                  }}>
                  {f.id}
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" style={{ opacity: 0.6 }}>
                    <path d="M7 17L17 7M9 7h8v8"/>
                  </svg>
                </a>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontSize: 12.5, color: 'var(--ink)', fontWeight: 500,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}>
                    {f.title}
                  </div>
                  <div style={{
                    fontSize: 11.5, color: 'var(--ink3)', marginTop: 1,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}>
                    {f.summary}
                  </div>
                </div>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 11.5, color: 'var(--ai-deep)',
                  background: 'var(--ai-soft)', padding: '2px 7px',
                  borderRadius: 4, fontFamily: 'DM Mono, monospace'
                }}>
                  {FLAG_D[f.flagType] || '•'} {f.flagType?.replace('-', ' ')}
                </span>
                <div className="it-mono" style={{ fontSize: 11, color: 'var(--ink4)', textAlign: 'right' }}>
                  {f.openedDays != null ? `${f.openedDays}d` : '—'}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Unflagged tickets — basic info */}
      {unflagged.length > 0 && (
        <div>
          <div style={{ padding: '8px 16px 4px' }}>
            <span className="it-mono" style={{ fontSize: 10.5, color: 'var(--ink3)', fontWeight: 600 }}>
              REVIEWED — NO FLAGS ({unflagged.length})
            </span>
          </div>
          <div style={{ padding: '8px 16px 12px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {unflagged.map(n => (
              <span key={n} className="it-mono" style={{
                fontSize: 11.5, color: 'var(--ink3)',
                background: 'white', border: '1px solid var(--border)',
                padding: '2px 8px', borderRadius: 4
              }}>
                {n}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TrendCard({ trends, flags }) {
  const [open, setOpen] = useState(false);
  const [expandedItem, setExpandedItem] = useState(null);
  const [drilldownItem, setDrilldownItem] = useState(null); // key of item showing tickets

  if (!trends) return null;

  // Build flag lookup map for drill-down
  const flagMap = {};
  (flags || []).forEach(f => { flagMap[f.id] = f; });

  const toggleDrilldown = (key) => setDrilldownItem(prev => prev === key ? null : key);

  const totalItems =
    (trends.companyTrends?.length || 0) +
    (trends.techPatterns?.length || 0) +
    (trends.sentimentSignals?.length || 0);

  if (totalItems === 0) return null;

  const SEV_TREND = {
    critical: { fg: '#991b1b', bg: '#fee2e2', stripe: '#dc2626' },
    high:     { fg: '#9a3412', bg: '#ffedd5', stripe: '#ea580c' },
    medium:   { fg: '#854d0e', bg: '#fef3c7', stripe: '#d97706' },
    low:      { fg: '#334155', bg: '#e2e8f0', stripe: '#64748b' }
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="it-card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header — always visible */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '16px 20px', cursor: 'pointer',
          borderBottom: open ? '1px solid var(--border)' : 'none'
        }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'var(--ai-soft)', border: '1px solid #d6daff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--ai-deep)', flexShrink: 0
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3v18h18"/>
            <path d="M7 16l4-4 4 4 4-4"/>
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ai-deep)' }}>
            Long-term Trend Analysis
          </div>
          <div className="it-mono" style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 1 }}>
            {trends.ticketsAnalyzed?.toLocaleString()} tickets analyzed · Generated {formatDate(trends.generatedAt)} ·{' '}
            {trends.companyTrends?.length || 0} company trends · {trends.techPatterns?.length || 0} tech patterns · {trends.sentimentSignals?.length || 0} sentiment signals
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, marginRight: 16 }}>
          {(trends.companyTrends?.length > 0) && (
            <div style={{ textAlign: 'center' }}>
              <div className="it-mono" style={{ fontSize: 18, fontWeight: 500, color: 'var(--ink)' }}>
                {trends.companyTrends.length}
              </div>
              <div className="it-mono" style={{ fontSize: 10.5, color: 'var(--ink3)' }}>Companies</div>
            </div>
          )}
          {(trends.techPatterns?.length > 0) && (
            <div style={{ textAlign: 'center' }}>
              <div className="it-mono" style={{ fontSize: 18, fontWeight: 500, color: 'var(--ink)' }}>
                {trends.techPatterns.length}
              </div>
              <div className="it-mono" style={{ fontSize: 10.5, color: 'var(--ink3)' }}>Tech patterns</div>
            </div>
          )}
          {(trends.sentimentSignals?.length > 0) && (
            <div style={{ textAlign: 'center' }}>
              <div className="it-mono" style={{ fontSize: 18, fontWeight: 500, color: 'var(--ink)' }}>
                {trends.sentimentSignals.length}
              </div>
              <div className="it-mono" style={{ fontSize: 10.5, color: 'var(--ink3)' }}>Sentiment signals</div>
            </div>
          )}
        </div>
        <span style={{
          fontSize: 10, color: 'var(--ink3)',
          transform: open ? 'rotate(90deg)' : 'rotate(0)',
          transition: 'transform 0.15s', display: 'inline-block'
        }}>▶</span>
      </div>

      {open && (
        <div style={{ padding: '20px 20px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Company Trends */}
          {trends.companyTrends?.length > 0 && (
            <div>
              <div className="it-eyebrow" style={{ marginBottom: 10 }}>Company Trends</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {trends.companyTrends.map((item, i) => {
                  const s = SEV_TREND[item.severity] || SEV_TREND.low;
                  const key = `company-${i}`;
                  const isExpanded = expandedItem === key;
                  const isDrilldown = drilldownItem === key;
                  return (
                    <div key={key} style={{
                      borderRadius: 8, border: '1px solid var(--border)',
                      borderLeft: `3px solid ${s.stripe}`, overflow: 'hidden'
                    }}>
                      <div
                        onClick={() => setExpandedItem(isExpanded ? null : key)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '12px 16px', cursor: 'pointer',
                          background: isExpanded ? '#fafbfe' : 'white'
                        }}>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '2px 8px',
                          borderRadius: 999, background: s.bg, color: s.fg,
                          fontFamily: 'DM Mono, monospace', flexShrink: 0
                        }}>
                          {item.severity?.toUpperCase()}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                            {item.companyName}
                          </span>
                          <span style={{ fontSize: 13, color: 'var(--ink2)', marginLeft: 10 }}>
                            {item.headline}
                          </span>
                        </div>
                        {item.ticketNumbers?.length > 0 && (
                          <button
                            className="it-btn sm"
                            onClick={e => { e.stopPropagation(); toggleDrilldown(key); }}
                            style={{
                              borderColor: isDrilldown ? 'var(--ai)' : 'var(--border)',
                              color: isDrilldown ? 'var(--ai-deep)' : 'var(--ink3)',
                              background: isDrilldown ? 'var(--ai-soft)' : 'white',
                              flexShrink: 0
                            }}>
                            {item.ticketNumbers.length} tickets
                          </button>
                        )}
                        <span style={{
                          fontSize: 10, color: 'var(--ink3)',
                          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0)',
                          transition: 'transform 0.15s', flexShrink: 0
                        }}>▶</span>
                      </div>
                      {isExpanded && (
                        <div style={{ padding: '0 16px 16px', background: '#fafbfe', borderTop: '1px solid var(--border)' }}>
                          {item.details?.length > 0 && (
                            <ul style={{ margin: '12px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
                              {item.details.map((d, j) => (
                                <li key={j} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--ink2)' }}>
                                  <span style={{ width: 4, height: 4, borderRadius: 999, background: s.stripe, marginTop: 8, flexShrink: 0 }} />
                                  {d}
                                </li>
                              ))}
                            </ul>
                          )}
                          {item.recommendation && (
                            <div style={{
                              marginTop: 12, padding: '10px 14px',
                              background: 'var(--ai-soft)', borderRadius: 8,
                              borderLeft: '3px solid var(--ai)',
                              fontSize: 13, color: 'var(--ink2)'
                            }}>
                              <span style={{ fontWeight: 600, color: 'var(--ai-deep)' }}>Recommendation: </span>
                              {item.recommendation}
                            </div>
                          )}
                        </div>
                      )}
                      {isDrilldown && (
                        <TicketDrilldown
                          ticketNumbers={item.ticketNumbers}
                          flagMap={flagMap}
                          companyName={item.companyName}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tech Patterns */}
          {trends.techPatterns?.length > 0 && (
            <div>
              <div className="it-eyebrow" style={{ marginBottom: 10 }}>Tech Patterns</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {trends.techPatterns.map((item, i) => {
                  const isConcern = item.type === 'concern';
                  const key = `tech-${i}`;
                  const isExpanded = expandedItem === key;
                  const isDrilldown = drilldownItem === key;
                  return (
                    <div key={key} style={{
                      borderRadius: 8, border: '1px solid var(--border)',
                      borderLeft: `3px solid ${isConcern ? 'var(--amber)' : 'var(--green)'}`,
                      overflow: 'hidden'
                    }}>
                      <div
                        onClick={() => setExpandedItem(isExpanded ? null : key)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '12px 16px', cursor: 'pointer',
                          background: isExpanded ? '#fafbfe' : 'white'
                        }}>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '2px 8px',
                          borderRadius: 999,
                          background: isConcern ? 'var(--amber-soft)' : 'var(--green-soft)',
                          color: isConcern ? 'var(--amber)' : 'var(--green)',
                          fontFamily: 'DM Mono, monospace', flexShrink: 0
                        }}>
                          {isConcern ? 'CONCERN' : 'STRENGTH'}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                            {item.techName}
                          </span>
                          <span style={{ fontSize: 13, color: 'var(--ink2)', marginLeft: 10 }}>
                            {item.headline}
                          </span>
                        </div>
                        {item.ticketNumbers?.length > 0 && (
                          <button
                            className="it-btn sm"
                            onClick={e => { e.stopPropagation(); toggleDrilldown(key); }}
                            style={{
                              borderColor: isDrilldown ? 'var(--ai)' : 'var(--border)',
                              color: isDrilldown ? 'var(--ai-deep)' : 'var(--ink3)',
                              background: isDrilldown ? 'var(--ai-soft)' : 'white',
                              flexShrink: 0
                            }}>
                            {item.ticketNumbers.length} tickets
                          </button>
                        )}
                        <span style={{
                          fontSize: 10, color: 'var(--ink3)',
                          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0)',
                          transition: 'transform 0.15s', flexShrink: 0
                        }}>▶</span>
                      </div>
                      {isExpanded && (
                        <div style={{ padding: '0 16px 16px', background: '#fafbfe', borderTop: '1px solid var(--border)' }}>
                          {item.details?.length > 0 && (
                            <ul style={{ margin: '12px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
                              {item.details.map((d, j) => (
                                <li key={j} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--ink2)' }}>
                                  <span style={{ width: 4, height: 4, borderRadius: 999, background: isConcern ? 'var(--amber)' : 'var(--green)', marginTop: 8, flexShrink: 0 }} />
                                  {d}
                                </li>
                              ))}
                            </ul>
                          )}
                          {item.recommendation && (
                            <div style={{
                              marginTop: 12, padding: '10px 14px',
                              background: 'var(--ai-soft)', borderRadius: 8,
                              borderLeft: '3px solid var(--ai)',
                              fontSize: 13, color: 'var(--ink2)'
                            }}>
                              <span style={{ fontWeight: 600, color: 'var(--ai-deep)' }}>Recommendation: </span>
                              {item.recommendation}
                            </div>
                          )}
                        </div>
                      )}
                      {isDrilldown && (
                        <TicketDrilldown
                          ticketNumbers={item.ticketNumbers}
                          flagMap={flagMap}
                          companyName={item.techName}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sentiment Signals */}
          {trends.sentimentSignals?.length > 0 && (
            <div>
              <div className="it-eyebrow" style={{ marginBottom: 10 }}>Sentiment Signals</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {trends.sentimentSignals.map((item, i) => {
                  const s = SEV_TREND[item.severity] || SEV_TREND.low;
                  const key = `sentiment-${i}`;
                  const isExpanded = expandedItem === key;
                  const isDrilldown = drilldownItem === key;
                  return (
                    <div key={key} style={{
                      borderRadius: 8, border: '1px solid var(--border)',
                      borderLeft: `3px solid ${s.stripe}`, overflow: 'hidden'
                    }}>
                      <div
                        onClick={() => setExpandedItem(isExpanded ? null : key)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '12px 16px', cursor: 'pointer',
                          background: isExpanded ? '#fafbfe' : 'white'
                        }}>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '2px 8px',
                          borderRadius: 999, background: s.bg, color: s.fg,
                          fontFamily: 'DM Mono, monospace', flexShrink: 0
                        }}>
                          {item.severity?.toUpperCase()}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                            {item.companyName}
                          </span>
                          <span style={{ fontSize: 13, color: 'var(--ink2)', marginLeft: 10 }}>
                            {item.signal}
                          </span>
                        </div>
                        {item.ticketNumbers?.length > 0 && (
                          <button
                            className="it-btn sm"
                            onClick={e => { e.stopPropagation(); toggleDrilldown(key); }}
                            style={{
                              borderColor: isDrilldown ? 'var(--ai)' : 'var(--border)',
                              color: isDrilldown ? 'var(--ai-deep)' : 'var(--ink3)',
                              background: isDrilldown ? 'var(--ai-soft)' : 'white',
                              flexShrink: 0
                            }}>
                            {item.ticketNumbers.length} tickets
                          </button>
                        )}
                        <span style={{
                          fontSize: 10, color: 'var(--ink3)',
                          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0)',
                          transition: 'transform 0.15s', flexShrink: 0
                        }}>▶</span>
                      </div>
                      {isExpanded && item.supportingData?.length > 0 && (
                        <div style={{ padding: '0 16px 16px', background: '#fafbfe', borderTop: '1px solid var(--border)' }}>
                          <ul style={{ margin: '12px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
                            {item.supportingData.map((d, j) => (
                              <li key={j} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--ink2)' }}>
                                <span style={{ width: 4, height: 4, borderRadius: 999, background: s.stripe, marginTop: 8, flexShrink: 0 }} />
                                {d}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {isDrilldown && (
                        <TicketDrilldown
                          ticketNumbers={item.ticketNumbers}
                          flagMap={flagMap}
                          companyName={item.companyName}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AIReview({ aiReview, initialSevFilter, syncInProgress }) {
    const {
        flags, exclusions, companies,
        lastRun, reviewStats, trends,
        running, runState,
        error, loaded,
        loadStatus, runReview, setAction,
        addExclusion, removeExclusion
    } = aiReview;

    const [filters, setFilters] = useState({
        sev: initialSevFilter || 'all',
        type: 'all',
        company: ''
    });
    const [sort, setSort] = useState('severity');
    const [expandedId, setExpandedId] = useState(null);
    const [openMenu, setOpenMenu] = useState(null);
    const [exclusionOpen, setExclusionOpen] = useState(false);

    useEffect(() => {
        if (!loaded) loadStatus();
    }, [loaded]);

    // Only show unactioned flags — all actioned flags move to Action Items or are hidden
    const sevRank = { critical: 0, high: 1, medium: 2, low: 3 };
    let visible = flags.filter(f => {
        if (f.action !== 'unactioned') return false;
        if (filters.sev !== 'all' && f.sev !== filters.sev) return false;
        if (filters.type !== 'all' && f.flagType !== filters.type) return false;
        if (filters.company && !f.company?.toLowerCase().includes(filters.company.toLowerCase())) return false;
        return true;
    });

    visible = [...visible].sort((a, b) => {
        if (sort === 'severity') {
            if (sevRank[a.sev] !== sevRank[b.sev]) return sevRank[a.sev] - sevRank[b.sev];
            return new Date(b.dateFlagged) - new Date(a.dateFlagged);
        }
        if (sort === 'date') return new Date(b.dateFlagged) - new Date(a.dateFlagged);
        return (a.company || '').localeCompare(b.company || '');
    });

    const setF = (k, v) => setFilters(prev => ({ ...prev, [k]: v }));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'relative' }}>

            {/* Bug 6: Sync conflict warning */}
            {syncInProgress && !running && (
                <div style={{
                    background: 'var(--amber-soft)', border: '1px solid var(--amber)',
                    borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10
                }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    <span style={{ fontSize: 13, color: 'var(--amber)' }}>
                        A data sync is in progress. Wait for it to finish before running AI Review to avoid hitting AutoTask's 3-thread limit.
                    </span>
                </div>
            )}

            {error && (
                <div style={{
                    background: 'var(--red-soft)', border: '1px solid #fecaca',
                    borderRadius: 10, padding: '12px 16px'
                }}>
                    <span style={{ fontSize: 13, color: 'var(--red)' }}>{error}</span>
                </div>
            )}

            {/* Trend analysis — top of page */}
            <TrendCard trends={trends} flags={flags} />

            <ReviewBanner
                running={running} runState={runState}
                lastRun={lastRun} reviewStats={reviewStats}
                onRun={runReview}
                disabled={syncInProgress}
            />

            <StatsSummary flags={flags} />

            {/* Filter bar */}
            <div className="it-card" style={{
                padding: '10px 14px', display: 'flex',
                alignItems: 'center', gap: 12, flexWrap: 'wrap'
            }}>
                <div className="it-mono" style={{ fontSize: 11.5, color: 'var(--ink3)', marginRight: 4 }}>
                    SEVERITY:
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                    <button className={`it-pill${filters.sev === 'all' ? ' active' : ''}`}
                        onClick={() => setF('sev', 'all')}>All</button>
                    {['critical', 'high', 'medium', 'low'].map(sev => {
                        const s = SEV[sev];
                        const active = filters.sev === sev;
                        return (
                            <button key={sev}
                                onClick={() => setF('sev', active ? 'all' : sev)}
                                className="it-pill"
                                style={active ? { background: s.bg, color: s.fg, borderColor: s.stripe } : {}}>
                                <span style={{
                                    width: 6, height: 6, borderRadius: 999,
                                    background: s.stripe, display: 'inline-block'
                                }} />
                                {s.label}
                            </button>
                        );
                    })}
                </div>

                <div style={{ width: 1, height: 22, background: 'var(--border)', margin: '0 4px' }} />

                <div className="it-mono" style={{ fontSize: 11.5, color: 'var(--ink3)' }}>TYPE:</div>
                <select
                    value={filters.type}
                    onChange={e => setF('type', e.target.value)}
                    style={{
                        fontFamily: 'DM Mono, monospace', fontSize: 12,
                        padding: '4px 22px 4px 9px',
                        background: 'white', border: '1px solid var(--border-strong)',
                        borderRadius: 999, color: 'var(--ink2)',
                        appearance: 'none', cursor: 'pointer'
                    }}>
                    <option value="all">All types</option>
                    {Object.entries(FLAG).map(([k, f]) => (
                        <option key={k} value={k}>{f.label}</option>
                    ))}
                </select>

                <div className="it-mono" style={{ fontSize: 11.5, color: 'var(--ink3)' }}>COMPANY:</div>
                <input
                    placeholder="filter..."
                    value={filters.company}
                    onChange={e => setF('company', e.target.value)}
                    style={{
                        fontFamily: 'DM Mono, monospace', fontSize: 12, padding: '4px 9px',
                        background: 'white', border: '1px solid var(--border-strong)',
                        borderRadius: 999, color: 'var(--ink)', width: 140, outline: 'none'
                    }}
                />

                <div style={{ flex: 1 }} />

                <div className="it-mono" style={{ fontSize: 11.5, color: 'var(--ink3)' }}>SORT:</div>
                <button className="it-pill"
                    onClick={() => setSort(s => s === 'severity' ? 'date' : s === 'date' ? 'company' : 'severity')}>
                    {sort === 'severity' ? 'By severity' : sort === 'date' ? 'By date' : 'By company'}
                    <svg width="9" height="9" viewBox="0 0 12 12" fill="none"
                        stroke="currentColor" strokeWidth="1.5">
                        <path d="M3 5l3-3 3 3M3 7l3 3 3-3" />
                    </svg>
                </button>

                <button className="it-btn" onClick={() => setExclusionOpen(true)}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M12 2v3m0 14v3M4.22 4.22l2.12 2.12m11.32 11.32 2.12 2.12M2 12h3m14 0h3M4.22 19.78l2.12-2.12m11.32-11.32 2.12-2.12" />
                    </svg>
                    Exclusions
                </button>
            </div>

            {/* Flag list */}
            {!loaded ? (
                <div className="it-card" style={{ padding: 40, textAlign: 'center' }}>
                    <div className="it-mono" style={{ fontSize: 12, color: 'var(--ink3)' }}>Loading...</div>
                </div>
            ) : flags.length === 0 ? (
                <div className="it-card" style={{ padding: 60, textAlign: 'center' }}>
                    <div style={{ color: 'var(--ai)', marginBottom: 12 }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="1.5">
                            <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
                            <circle cx="12" cy="12" r="3" />
                        </svg>
                    </div>
                    <div className="it-mono" style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 6 }}>
                        NO FLAGS YET
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--ink3)' }}>
                        Run the AI Review to analyze tickets and surface issues.
                    </div>
                </div>
            ) : (
                <div className="it-card" style={{ padding: 0, overflow: 'visible' }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '110px 88px 1fr 200px 130px 110px 100px',
                        gap: 12, padding: '10px 16px 10px 18px',
                        borderBottom: '1px solid var(--border)',
                        background: 'var(--slate-soft)'
                    }}>
                        {['Severity', 'Ticket', 'Title / Summary', 'Company', 'Flag type', 'Action', ''].map(h => (
                            <div key={h} className="it-mono" style={{ fontSize: 11, color: 'var(--ink4)' }}>
                                {h}
                            </div>
                        ))}
                    </div>

                    {visible.map(f => {
                        const s = SEV[f.sev] || SEV.low;
                        const isExpanded = expandedId === f.id;
                        return (
                            <div key={f.id} className={`it-row${isExpanded ? ' expanded' : ''}`}>
                                <div className="sev-stripe" style={{ background: s.stripe }} />
                                <div
                                    onClick={() => setExpandedId(isExpanded ? null : f.id)}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '110px 88px 1fr 200px 130px 110px 100px',
                                        gap: 12, padding: '13px 16px 13px 18px',
                                        alignItems: 'center', cursor: 'pointer'
                                    }}>
                                    <div><SeverityPill sev={f.sev} /></div>
                                    <a
                                        href={f.ticketUrl} target="_blank" rel="noreferrer"
                                        className="it-mono"
                                        onClick={e => e.stopPropagation()}
                                        style={{
                                            fontSize: 12.5, color: 'var(--blue)',
                                            textDecoration: 'none', fontWeight: 500,
                                            display: 'inline-flex', alignItems: 'center', gap: 4,
                                            flexShrink: 0
                                        }}>
                                        {f.id}
                                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none"
                                            stroke="currentColor" strokeWidth="2" style={{ opacity: 0.6 }}>
                                            <path d="M7 17L17 7M9 7h8v8" />
                                        </svg>
                                    </a>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{
                                            fontSize: 13, color: 'var(--ink)', fontWeight: 500,
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                        }}>
                                            {f.title}
                                        </div>
                                        <div style={{
                                            fontSize: 12, color: 'var(--ink3)', marginTop: 2,
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                        }}>
                                            {f.summary}
                                        </div>
                                    </div>
                                    <div style={{
                                        fontSize: 12.5, color: 'var(--ink2)', minWidth: 0,
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                    }}>
                                        {f.company}
                                    </div>
                                    <div><FlagTypePill type={f.flagType} /></div>
                                    <div />
                                    <div style={{
                                        position: 'relative', display: 'flex',
                                        justifyContent: 'flex-end', gap: 6
                                    }} onClick={e => e.stopPropagation()}>
                                        <button
                                            className="it-btn sm"
                                            onClick={() => setOpenMenu(openMenu === f.id ? null : f.id)}
                                            style={{ borderColor: 'var(--border)' }}>
                                            Action
                                            <svg width="9" height="9" viewBox="0 0 12 12" fill="none"
                                                stroke="currentColor" strokeWidth="1.7">
                                                <path d="M3 4.5l3 3 3-3" />
                                            </svg>
                                        </button>
                                        {openMenu === f.id && (
                                            <ActionMenu
                                                value={f.action}
                                                onChange={v => setAction(f.id, v)}
                                                onClose={() => setOpenMenu(null)}
                                            />
                                        )}
                                    </div>
                                </div>
                                {isExpanded && <FlagRowDetail flag={f} />}
                            </div>
                        );
                    })}

                    {visible.length === 0 && (
                        <div style={{ padding: 50, textAlign: 'center', color: 'var(--ink3)' }}>
                            <div className="it-mono" style={{ fontSize: 12, marginBottom: 6 }}>
                                NO MATCHING FLAGS
                            </div>
                            <div style={{ fontSize: 13 }}>
                                Try clearing filters or check the Action Items tab.
                            </div>
                        </div>
                    )}
                </div>
            )}

            {exclusionOpen && (
                <ExclusionPanel
                    exclusions={exclusions}
                    companies={companies}
                    onClose={() => setExclusionOpen(false)}
                    onAdd={addExclusion}
                    onRemove={removeExclusion}
                />
            )}
        </div>
    );
}
