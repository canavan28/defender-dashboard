// Engineering standup — a single scrollable screen meant to run
// unattended on a TV/wall display, refreshed hourly (see useStandup.js)
// plus a manual refresh button. All data comes from GET /api/standup/data,
// which computes everything live on each request (no disk cache of its
// own — see standup.js for why).

const SEV_COLORS = {
  critical: { fg: 'var(--red)', bg: 'var(--red-soft)' },
  high: { fg: 'var(--red)', bg: 'var(--red-soft)' },
  medium: { fg: '#92600a', bg: '#fef3c7' }, // amber, no --amber-soft token exists yet
  low: { fg: 'var(--ink3)', bg: '#f1f5f9' }
};

function SectionHeader({ eyebrow, title, count }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <p className="it-eyebrow">{eyebrow}</p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <h2 className="it-section-title">{title}</h2>
        <span className="it-mono" style={{ fontSize: 12, color: 'var(--ink4)' }}>
          {count}
        </span>
      </div>
    </div>
  );
}

function EmptyRow({ children }) {
  return (
    <p className="it-mono" style={{ fontSize: 12.5, color: 'var(--ink4)', padding: '8px 0' }}>
      {children}
    </p>
  );
}

function TicketRow({ t, rightContent }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      gap: 16, padding: '10px 0', borderBottom: '1px solid var(--border)'
    }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span className="it-mono" style={{ fontSize: 11.5, color: 'var(--ink4)' }}>{t.ticketNumber}</span>
          <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{t.title}</span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 2 }}>
          {t.companyName} &middot; {t.assignedTech}
        </p>
      </div>
      <div style={{ flexShrink: 0, textAlign: 'right' }}>{rightContent}</div>
    </div>
  );
}

function ScheduledSection({ tickets }) {
  return (
    <div className="it-card" style={{ padding: 20, marginBottom: 20 }}>
      <SectionHeader eyebrow="Today" title="Scheduled Tickets" count={tickets.length} />
      {tickets.length === 0 && <EmptyRow>Nothing scheduled today.</EmptyRow>}
      {tickets.map(t => (
        <TicketRow
          key={t.id}
          t={t}
          rightContent={
            <span className="it-mono" style={{
              fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999,
              background: 'var(--border)', color: 'var(--ink3)'
            }}>
              {t.statusLabel}
            </span>
          }
        />
      ))}
    </div>
  );
}

function DraggingSection({ tickets }) {
  return (
    <div className="it-card" style={{ padding: 20, marginBottom: 20 }}>
      <SectionHeader eyebrow="Needs attention" title="Dragging Tickets" count={tickets.length} />
      {tickets.length === 0 && <EmptyRow>No dragging tickets right now.</EmptyRow>}
      {tickets.map(t => (
        <TicketRow
          key={t.id}
          t={t}
          rightContent={
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end' }}>
              {t.reasons.map((r, i) => (
                <span key={i} className="it-mono" style={{ fontSize: 10.5, color: 'var(--ink4)' }}>{r}</span>
              ))}
            </div>
          }
        />
      ))}
    </div>
  );
}

function AIEscalationsSection({ flags }) {
  return (
    <div className="it-card" style={{ padding: 20, marginBottom: 20 }}>
      <SectionHeader eyebrow="Last 7 days" title="AI Review Escalations" count={flags.length} />
      {flags.length === 0 && <EmptyRow>No new AI escalations in the last 7 days.</EmptyRow>}
      {flags.filter(f => f.id).map(f => {
        const colors = SEV_COLORS[f.sev] || SEV_COLORS.low;
        return (
          <div key={f.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <span className="it-mono" style={{
                fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 999,
                background: colors.bg, color: colors.fg, textTransform: 'uppercase'
              }}>
                {f.sev}
              </span>
              <span className="it-mono" style={{ fontSize: 11.5, color: 'var(--ink4)' }}>{f.id}</span>
              <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{f.title}</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 3 }}>{f.summary}</p>
            <p style={{ fontSize: 11.5, color: 'var(--ink4)', marginTop: 2 }}>
              {f.company} &middot; {f.tech || 'Unassigned'}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function EngineeringProjectsSection({ projects }) {
  return (
    <div className="it-card" style={{ padding: 20, marginBottom: 20 }}>
      <SectionHeader eyebrow="Open" title="Engineering Projects" count={projects.length} />
      {projects.length === 0 && <EmptyRow>No open engineering projects.</EmptyRow>}
      {projects.map(p => (
        <div key={p.id} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          gap: 16, padding: '10px 0', borderBottom: '1px solid var(--border)'
        }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{p.projectName}</span>
              {p.isOverdue && (
                <span className="it-mono" style={{
                  fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 999,
                  background: 'var(--red-soft)', color: 'var(--red)', textTransform: 'uppercase'
                }}>
                  Overdue
                </span>
              )}
            </div>
            <p style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 2 }}>
              {p.companyName} &middot; {p.statusLabel} &middot; Lead: {p.projectLead || 'Unassigned'}
            </p>
          </div>
          <div style={{ flexShrink: 0, textAlign: 'right' }}>
            <span className="it-mono" style={{ fontSize: 12, color: 'var(--ink4)' }}>
              {p.percentComplete}% complete
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function OnboardingOverdueSection({ projects }) {
  const totalTasks = projects.reduce((s, p) => s + p.tasks.length, 0);
  return (
    <div className="it-card" style={{ padding: 20, marginBottom: 20 }}>
      <SectionHeader eyebrow="Onboarding" title="Overdue Onboarding Tasks" count={totalTasks} />
      {projects.length === 0 && <EmptyRow>No overdue onboarding tasks.</EmptyRow>}
      {projects.map(p => (
        <div key={p.projectId} style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
            {p.projectName} <span style={{ fontWeight: 400, color: 'var(--ink3)' }}>&middot; {p.companyName} &middot; {p.percentComplete}% complete</span>
          </p>
          {p.tasks.map(t => (
            <div key={t.taskNumber} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              gap: 16, padding: '6px 0 6px 12px', borderBottom: '1px solid var(--border)'
            }}>
              <span style={{ fontSize: 12.5, color: 'var(--ink)' }}>{t.title}</span>
              <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
                <span className="it-mono" style={{ fontSize: 11.5, color: 'var(--ink3)' }}>{t.assignedTech}</span>
                <span className="it-mono" style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--red)' }}>
                  {t.daysOverdue}d overdue
                </span>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function Standup({ standup }) {
  const { data, loading, error, refreshing, refresh } = standup;

  if (loading && !data) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: 256, gap: 12
      }}>
        <p className="it-mono" style={{ fontSize: 13, color: 'var(--ink3)' }}>
          Loading standup...
        </p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div style={{
        background: 'var(--red-soft)', border: '1px solid #fecaca',
        borderRadius: 10, padding: 20, marginBottom: 16
      }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--red)', marginBottom: 4 }}>
          Couldn't load standup data
        </p>
        <p className="it-mono" style={{ fontSize: 12, color: 'var(--ink3)' }}>{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const generatedLabel = new Date(data.generatedAt).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit'
  });

  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 20
      }}>
        <p className="it-mono" style={{ fontSize: 12, color: 'var(--ink4)' }}>
          Last updated {generatedLabel} &middot; auto-refreshes hourly
        </p>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="it-btn"
          style={{ fontSize: 12, opacity: refreshing ? 0.6 : 1, cursor: refreshing ? 'default' : 'pointer' }}
        >
          {refreshing ? 'Refreshing…' : 'Refresh now'}
        </button>
      </div>

      {error && (
        <div style={{
          background: 'var(--red-soft)', border: '1px solid #fecaca',
          borderRadius: 10, padding: 14, marginBottom: 16
        }}>
          <p className="it-mono" style={{ fontSize: 12, color: 'var(--red)' }}>
            Last refresh failed: {error} — showing previous data.
          </p>
        </div>
      )}

      <ScheduledSection tickets={data.scheduledTickets} />
      <DraggingSection tickets={data.draggingTickets} />
      <AIEscalationsSection flags={data.aiEscalations} />
      <EngineeringProjectsSection projects={data.engineeringProjects} />
      <OnboardingOverdueSection projects={data.onboardingOverdue} />
    </div>
  );
}