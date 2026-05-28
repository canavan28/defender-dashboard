import { useState } from 'react';

const SEV = {
  critical: { label: 'Critical', fg: '#991b1b', bg: '#fee2e2', stripe: '#dc2626' },
  high:     { label: 'High',     fg: '#9a3412', bg: '#ffedd5', stripe: '#ea580c' },
  medium:   { label: 'Medium',   fg: '#854d0e', bg: '#fef3c7', stripe: '#d97706' },
  low:      { label: 'Low',      fg: '#334155', bg: '#e2e8f0', stripe: '#64748b' }
};

const FLAG = {
  'customer-health':  { label: 'Customer health',  icon: '♥' },
  'cross-customer':   { label: 'Cross-customer',   icon: '◎' },
  'escalation':       { label: 'Escalation',        icon: '↗' },
  'tech-performance': { label: 'Tech performance', icon: '▲' },
  'documentation':    { label: 'Documentation',    icon: '□' },
  'reopen':           { label: 'Reopened',          icon: '↻' }
};

function SeverityPill({ sev }) {
  const s = SEV[sev] || SEV.low;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 11.5, fontWeight: 600, padding: '2px 8px',
      borderRadius: 999, background: s.bg, color: s.fg,
      fontFamily: 'DM Mono, monospace'
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: s.stripe }} />
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

function DetailPanel({ flag }) {
  return (
    <div style={{
      background: '#fbfbfe',
      borderTop: '1px solid var(--border)',
      padding: '18px 22px 22px'
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 28 }}>
        <div>
          <div className="it-eyebrow" style={{ marginBottom: 6 }}>AI analysis</div>
          <div style={{ fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.55, marginBottom: 16 }}>
            {flag.summary}
          </div>
          <div className="it-eyebrow" style={{ marginBottom: 8 }}>Why it was flagged</div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(flag.reasons || []).map((r, i) => (
              <li key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: 13, color: 'var(--ink2)' }}>
                <span style={{ width: 4, height: 4, borderRadius: 999, background: 'var(--ai)', marginTop: 8, flexShrink: 0 }} />
                {r}
              </li>
            ))}
          </ul>
          {flag.notesForExec && (
            <>
              <div className="it-eyebrow" style={{ marginTop: 18, marginBottom: 6 }}>Notes for exec</div>
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
            <div style={{ color: 'var(--ink)' }}>{flag.openedDays != null ? `${flag.openedDays}d` : '—'}</div>
            <div className="it-mono" style={{ color: 'var(--ink4)' }}>Flagged</div>
            <div style={{ color: 'var(--ink)' }}>{flag.dateFlagged ? new Date(flag.dateFlagged).toLocaleDateString() : '—'}</div>
          </div>
          <div style={{ marginTop: 20 }}>
            <a href={flag.ticketUrl} target="_blank" rel="noreferrer"
              className="it-btn ai-soft"
              style={{ textDecoration: 'none', justifyContent: 'center', display: 'flex' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M10 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/>
                <path d="M14 4h6v6"/><path d="M10 14L20 4"/>
              </svg>
              Open in AutoTask
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ActionItems({ aiReview }) {
  const { flags, setAction } = aiReview;
  const [expandedId, setExpandedId] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all' | 'escalated' | 'assigned'

  const escalated = flags.filter(f => f.action === 'escalated');
  const assigned   = flags.filter(f => f.action === 'assigned');

  const visible = filter === 'escalated' ? escalated
    : filter === 'assigned' ? assigned
    : [...escalated, ...assigned];

  // Sort by severity
  const sevRank = { critical: 0, high: 1, medium: 2, low: 3 };
  visible.sort((a, b) => sevRank[a.sev] - sevRank[b.sev]);

  const handleClearAction = async (flagId) => {
    await setAction(flagId, 'unactioned');
    if (expandedId === flagId) setExpandedId(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Header card */}
      <div className="it-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'var(--ai-soft)', border: '1px solid #d6daff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--ai-deep)', flexShrink: 0
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 11l3 3L22 4"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ai-deep)' }}>Action Items</div>
            <div className="it-mono" style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 2 }}>
              Flags marked for escalation or follow-up. Resolve or clear to remove.
            </div>
          </div>
          {/* Summary counts */}
          <div style={{ display: 'flex', gap: 20 }}>
            <div style={{ textAlign: 'center' }}>
              <div className="it-mono" style={{ fontSize: 20, fontWeight: 500, color: 'var(--red)' }}>
                {escalated.length}
              </div>
              <div className="it-mono" style={{ fontSize: 11, color: 'var(--ink3)' }}>Escalated</div>
            </div>
            <div style={{ width: 1, background: 'var(--border)' }} />
            <div style={{ textAlign: 'center' }}>
              <div className="it-mono" style={{ fontSize: 20, fontWeight: 500, color: 'var(--blue)' }}>
                {assigned.length}
              </div>
              <div className="it-mono" style={{ fontSize: 11, color: 'var(--ink3)' }}>Assigned</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 6 }}>
        {[
          { id: 'all',       label: `All (${escalated.length + assigned.length})` },
          { id: 'escalated', label: `Escalated (${escalated.length})` },
          { id: 'assigned',  label: `Assigned (${assigned.length})` }
        ].map(f => (
          <button
            key={f.id}
            className={`it-pill${filter === f.id ? ' active' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {visible.length === 0 && (
        <div className="it-card" style={{ padding: 60, textAlign: 'center' }}>
          <div style={{ color: 'var(--ai)', marginBottom: 12 }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 11l3 3L22 4"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
          </div>
          <div className="it-mono" style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 6 }}>
            NO ACTION ITEMS
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink3)' }}>
            Flags marked as Escalate or Assign follow-up will appear here.
          </div>
        </div>
      )}

      {/* Flag list */}
      {visible.length > 0 && (
        <div className="it-card" style={{ padding: 0, overflow: 'visible' }}>
          {/* List header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '110px 88px 1fr 180px 130px 120px 110px',
            gap: 12, padding: '10px 16px 10px 18px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--slate-soft)'
          }}>
            {['Severity', 'Ticket', 'Title / Summary', 'Company', 'Flag type', 'Status', ''].map(h => (
              <div key={h} className="it-mono" style={{ fontSize: 11, color: 'var(--ink4)' }}>{h}</div>
            ))}
          </div>

          {visible.map(f => {
            const s = SEV[f.sev] || SEV.low;
            const isExpanded = expandedId === f.id;
            const isEscalated = f.action === 'escalated';

            return (
              <div key={f.id} className={`it-row${isExpanded ? ' expanded' : ''}`}>
                <div className="sev-stripe" style={{ background: s.stripe }} />
                <div
                  onClick={() => setExpandedId(isExpanded ? null : f.id)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '110px 88px 1fr 180px 130px 120px 110px',
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
                      display: 'inline-flex', alignItems: 'center', gap: 4
                    }}>
                    {f.id}
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" style={{ opacity: 0.6 }}>
                      <path d="M7 17L17 7M9 7h8v8"/>
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
                  <div>
                    <span style={{
                      fontSize: 11.5, fontFamily: 'DM Mono, monospace', fontWeight: 500,
                      padding: '2px 10px', borderRadius: 999,
                      background: isEscalated ? '#fee2e2' : '#dbeafe',
                      color: isEscalated ? '#991b1b' : '#1e3a8a'
                    }}>
                      {isEscalated ? 'Escalated' : 'Assigned'}
                    </span>
                  </div>
                  <div
                    style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}
                    onClick={e => e.stopPropagation()}>
                    <button
                      className="it-btn sm"
                      style={{ borderColor: 'var(--border)', color: 'var(--ink3)' }}
                      onClick={() => handleClearAction(f.id)}>
                      Clear
                    </button>
                  </div>
                </div>
                {isExpanded && <DetailPanel flag={f} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
