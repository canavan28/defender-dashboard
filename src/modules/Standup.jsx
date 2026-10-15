// Engineering standup — a single scrollable screen meant to run
// unattended on a TV/wall display, refreshed hourly (see useStandup.js)
// plus a manual refresh button. All data comes from GET /api/standup/data,
// which computes everything live on each request (no disk cache of its
// own — see standup.js for why).

import { useState } from 'react';

// Keep the daily standup short: each long section shows only its first few
// rows, with a button to expand (the full list is what the longer Wednesday
// engineer meeting needs). Lists arrive from the backend already sorted
// worst-first, so "first N" means "worst N".
const DRAGGING_CAP = 10;
const AI_CAP = 5;

const SEV_COLORS = {
  critical: { fg: 'var(--red)', bg: 'var(--red-soft)' },
  high: { fg: 'var(--red)', bg: 'var(--red-soft)' },
  medium: { fg: '#92600a', bg: '#fef3c7' }, // amber, no --amber-soft token exists yet
  low: { fg: 'var(--ink3)', bg: '#f1f5f9' }
};

// Task-based progress ("% Complete - Tasks" in AutoTask), e.g. "3 of 40
// tasks (8%)". null means the project has no tasks or the task fetch
// failed — show a dash rather than a misleading 0%.
function formatProgress(tp) {
  if (!tp) return '— no task data';
  return `${tp.done} of ${tp.total} tasks (${tp.percent}%)`;
}

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

function ShowMoreButton({ showAll, total, cap, onToggle }) {
  if (total <= cap) return null;
  return (
    <button
      onClick={onToggle}
      className="it-mono"
      style={{
        marginTop: 10, padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
        border: '1px solid var(--border-strong)', background: 'white',
        color: 'var(--ink3)', fontSize: 12
      }}
    >
      {showAll ? `Show top ${cap} only` : `Show all ${total}`}
    </button>
  );
}

function TicketRow({ t, rightContent, showStatus }) {
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
          {showStatus && <> &middot; {t.statusLabel}</>}
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
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? tickets : tickets.slice(0, DRAGGING_CAP);
  return (
    <div className="it-card" style={{ padding: 20, marginBottom: 20 }}>
      <SectionHeader eyebrow="Longest since last update first" title="Dragging Tickets" count={tickets.length} />
      {tickets.length === 0 && <EmptyRow>No dragging tickets right now.</EmptyRow>}
      {visible.map(t => (
        <TicketRow
          key={t.id}
          t={t}
          showStatus
          rightContent={
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end' }}>
              {t.reasons.map((r, i) => (
                <span key={i} className="it-mono" style={{ fontSize: 10.5, color: 'var(--ink4)' }}>{r}</span>
              ))}
            </div>
          }
        />
      ))}
      <ShowMoreButton
        showAll={showAll}
        total={tickets.length}
        cap={DRAGGING_CAP}
        onToggle={() => setShowAll(v => !v)}
      />
    </div>
  );
}

function AIEscalationsSection({ flags, otherCount }) {
  // The backend already limits this to high + critical flagged in the last
  // 7 days, drops flags with no ticket number, and groups repeated alerts
  // (similarCount = how many other flags the shown one stands in for).
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? flags : flags.slice(0, AI_CAP);
  return (
    <div className="it-card" style={{ padding: 20, marginBottom: 20 }}>
      <SectionHeader eyebrow="High & critical, last 7 days" title="AI Review Escalations" count={flags.length} />
      {flags.length === 0 && <EmptyRow>No high or critical AI escalations in the last 7 days.</EmptyRow>}
      {visible.map(f => {
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
              {f.similarCount > 0 && (
                <span className="it-mono" style={{ fontSize: 10.5, color: 'var(--ink4)' }}>
                  +{f.similarCount} similar
                </span>
              )}
            </div>
            <p style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 3 }}>{f.summary}</p>
            <p style={{ fontSize: 11.5, color: 'var(--ink4)', marginTop: 2 }}>
              {f.company} &middot; {f.tech || 'Unassigned'}
            </p>
          </div>
        );
      })}
      <ShowMoreButton
        showAll={showAll}
        total={flags.length}
        cap={AI_CAP}
        onToggle={() => setShowAll(v => !v)}
      />
      {otherCount > 0 && (
        <p className="it-mono" style={{ fontSize: 11.5, color: 'var(--ink4)', marginTop: 10 }}>
          {otherCount} lower-severity flag{otherCount === 1 ? '' : 's'} not shown &mdash; see the AI Review tab.
        </p>
      )}
    </div>
  );
}

// Due dates are date-only values stored at UTC midnight, so they must be
// formatted in UTC — in Eastern time they'd display as the previous day.
// The year is added only when it isn't the current year.
function formatDue(iso) {
  if (!iso) return 'no due date';
  const d = new Date(iso);
  const sameYear = d.getUTCFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('en-US', {
    timeZone: 'UTC', month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' })
  });
}

function TaskRow({ t, flagOverdue }) {
  const overdue = flagOverdue && t.daysOverdue > 0;
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      gap: 16, padding: '6px 0', borderBottom: '1px solid var(--border)'
    }}>
      <span style={{
        fontSize: 12.5, color: t.done ? 'var(--ink4)' : 'var(--ink)',
        textDecoration: t.done ? 'line-through' : 'none'
      }}>
        {t.title}
      </span>
      <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
        {!t.done && (
          <span className="it-mono" style={{ fontSize: 11.5, color: 'var(--ink4)' }}>{t.statusLabel}</span>
        )}
        <span className="it-mono" style={{ fontSize: 11.5, color: 'var(--ink3)' }}>{t.assignedTech}</span>
        <span className="it-mono" style={{ fontSize: 11.5, color: 'var(--ink4)' }}>
          {t.done ? 'done' : (t.endDateTime ? `due ${formatDue(t.endDateTime)}` : 'no due date')}
        </span>
        {overdue && (
          <span className="it-mono" style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--red)' }}>
            {t.daysOverdue}d overdue
          </span>
        )}
      </div>
    </div>
  );
}

// One project row that expands to show its tasks when clicked. Used by both
// the Engineering and Onboarding sections. Open tasks are listed first
// (soonest due first, as sorted by the backend); completed tasks stay
// hidden behind a "Show N completed" link so a big project stays readable.
// flagOverdue controls whether past-due open tasks get a red "Nd overdue".
function ProjectRow({ title, badges, subtitle, rightContent, tasks, flagOverdue }) {
  const [open, setOpen] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const openTasks = tasks.filter(t => !t.done);
  const doneTasks = tasks.filter(t => t.done);
  const toggle = () => setOpen(v => !v);

  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
        }}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          gap: 16, padding: '10px 0', cursor: 'pointer'
        }}
      >
        <div style={{ display: 'flex', gap: 8, minWidth: 0, flex: 1 }}>
          <span aria-hidden="true" style={{ fontSize: 11, color: 'var(--ink4)', width: 12, paddingTop: 3 }}>
            {open ? '\u25BE' : '\u25B8'}
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{title}</span>
              {badges}
            </div>
            <p style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 2 }}>{subtitle}</p>
          </div>
        </div>
        <div style={{ flexShrink: 0, textAlign: 'right' }}>{rightContent}</div>
      </div>

      {open && (
        <div style={{ padding: '0 0 12px 20px' }}>
          {tasks.length === 0 && <EmptyRow>No tasks found for this project.</EmptyRow>}
          {tasks.length > 0 && openTasks.length === 0 && <EmptyRow>All tasks complete.</EmptyRow>}
          {openTasks.map(t => <TaskRow key={t.taskNumber} t={t} flagOverdue={flagOverdue} />)}
          {doneTasks.length > 0 && (
            <button
              onClick={() => setShowDone(v => !v)}
              className="it-mono"
              style={{
                marginTop: 8, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                border: '1px solid var(--border-strong)', background: 'white',
                color: 'var(--ink3)', fontSize: 11.5
              }}
            >
              {showDone ? 'Hide completed' : `Show ${doneTasks.length} completed`}
            </button>
          )}
          {showDone && doneTasks.map(t => <TaskRow key={t.taskNumber} t={t} flagOverdue={false} />)}
        </div>
      )}
    </div>
  );
}

function EngineeringProjectsSection({ projects }) {
  return (
    <div className="it-card" style={{ padding: 20, marginBottom: 20 }}>
      <SectionHeader eyebrow="Open · click a project for its tasks" title="Engineering Projects" count={projects.length} />
      {projects.length === 0 && <EmptyRow>No open engineering projects.</EmptyRow>}
      {projects.map(p => (
        <ProjectRow
          key={p.id}
          title={p.projectName}
          badges={p.isOverdue && (
            <span className="it-mono" style={{
              fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 999,
              background: 'var(--red-soft)', color: 'var(--red)', textTransform: 'uppercase'
            }}>
              Overdue
            </span>
          )}
          subtitle={`${p.companyName} \u00B7 ${p.statusLabel} \u00B7 Lead: ${p.projectLead || 'Unassigned'}`}
          rightContent={
            <span className="it-mono" style={{ fontSize: 12, color: 'var(--ink4)' }}>
              {formatProgress(p.taskProgress)}
            </span>
          }
          tasks={p.tasks || []}
          // Not flagged: some engineering projects have every task dated to
          // the project's creation day, which would make them all look
          // weeks overdue. Due dates are still shown on each task.
          flagOverdue={false}
        />
      ))}
    </div>
  );
}

function OnboardingOverdueSection({ projects }) {
  const totalOverdue = projects.reduce((s, p) => s + (p.overdueCount || 0), 0);
  return (
    <div className="it-card" style={{ padding: 20, marginBottom: 20 }}>
      <SectionHeader eyebrow="Onboarding · click a project for its tasks" title="Overdue Onboarding Tasks" count={totalOverdue} />
      {projects.length === 0 && <EmptyRow>No overdue onboarding tasks.</EmptyRow>}
      {projects.map(p => (
        <ProjectRow
          key={p.projectId}
          title={p.projectName}
          badges={
            <span className="it-mono" style={{
              fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 999,
              background: 'var(--red-soft)', color: 'var(--red)', textTransform: 'uppercase'
            }}>
              {p.overdueCount} overdue
            </span>
          }
          subtitle={p.companyName}
          rightContent={
            <span className="it-mono" style={{ fontSize: 12, color: 'var(--ink4)' }}>
              {formatProgress(p.taskProgress)}
            </span>
          }
          tasks={p.tasks || []}
          flagOverdue
        />
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
      <EngineeringProjectsSection projects={data.engineeringProjects} />
      <OnboardingOverdueSection projects={data.onboardingOverdue} />
      <DraggingSection tickets={data.draggingTickets} />
      <AIEscalationsSection flags={data.aiEscalations} otherCount={data.aiEscalationsOtherCount || 0} />
    </div>
  );
}