import { useEffect, useState } from 'react';
import { useTeamRocks } from '../hooks/useTeamRocks';

// Warm/traction palette — same hex values used in VTOSections.jsx for
// VTO-adjacent work (this tab is the non-owner counterpart to VTO's Rocks
// section, so it reuses the same accents rather than inventing a third
// palette).
const TRACTION = '#3f9469';
const TRACTION_SOFT = '#e9f5ee';
const WARM = '#c66a3a';
const WARM_SOFT = '#f7ece3';

function currentQuarter() {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3) + 1;
  return `${now.getFullYear()}-Q${q}`;
}

function shiftQuarter(quarter, delta) {
  const [yearStr, qStr] = quarter.split('-Q');
  let year = parseInt(yearStr, 10);
  let q = parseInt(qStr, 10) + delta;
  while (q > 4) { q -= 4; year += 1; }
  while (q < 1) { q += 4; year -= 1; }
  return `${year}-Q${q}`;
}

function StatusBadge({ status }) {
  const isFinal = status === 'final';
  return (
    <span
      className="it-mono"
      style={{
        fontSize: 10.5, fontWeight: 600, padding: '2px 9px', borderRadius: 999,
        background: isFinal ? TRACTION_SOFT : WARM_SOFT,
        color: isFinal ? TRACTION : WARM,
      }}
    >
      {isFinal ? 'Final' : 'Draft'}
    </span>
  );
}

function QuarterPicker({ quarter, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button className="it-btn sm" onClick={() => onChange(shiftQuarter(quarter, -1))} aria-label="Previous quarter">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M15 6l-6 6 6 6"/></svg>
      </button>
      <span className="it-mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', minWidth: 70, textAlign: 'center' }}>
        {quarter}
      </span>
      <button className="it-btn sm" onClick={() => onChange(shiftQuarter(quarter, 1))} aria-label="Next quarter">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M9 6l6 6-6 6"/></svg>
      </button>
    </div>
  );
}

// ---- Rollup view ----

function RollupView({ tr, quarter, setQuarter, onOpen, onStartNew }) {
  const [showNew, setShowNew] = useState(false);
  const [pickedManager, setPickedManager] = useState('');
  const [newManagerName, setNewManagerName] = useState('');

  useEffect(() => { tr.loadRollup(quarter); tr.loadManagers(); }, [quarter]);

  const handleStart = async () => {
    const manager = pickedManager === '__new__' ? newManagerName.trim() : pickedManager;
    if (!manager) return;
    const record = await tr.createNew(manager, quarter);
    setShowNew(false);
    setPickedManager('');
    setNewManagerName('');
    onOpen(record.id);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--ink)', margin: 0 }}>Team Rocks</h2>
          <p className="it-mono" style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 3 }}>
            Rock-setting meetings — run the meeting, decide the rocks. Progress tracking lives elsewhere.
          </p>
        </div>
        <QuarterPicker quarter={quarter} onChange={setQuarter} />
      </div>

      {tr.error && (
        <div style={{ background: 'var(--red-soft)', border: '1px solid #fecaca', borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <p className="it-mono" style={{ fontSize: 12, color: 'var(--red)' }}>{tr.error}</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, marginBottom: 20 }}>
        {tr.rollup.map((r) => (
          <button
            key={r.id}
            onClick={() => onOpen(r.id)}
            className="it-card"
            style={{ padding: 16, textAlign: 'left', cursor: 'pointer', border: '1px solid var(--border)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{r.manager}</span>
              <StatusBadge status={r.status} />
            </div>
            <div style={{ display: 'flex', gap: 14 }}>
              <span className="it-mono" style={{ fontSize: 12, color: 'var(--ink3)' }}>
                {r.rocksCount} rock{r.rocksCount === 1 ? '' : 's'}
              </span>
              <span className="it-mono" style={{ fontSize: 12, color: 'var(--ink3)' }}>
                {r.issuesCount} issue{r.issuesCount === 1 ? '' : 's'}
              </span>
            </div>
          </button>
        ))}

        {tr.rollup.length === 0 && !tr.loading && (
          <div className="it-card" style={{ padding: 20, gridColumn: '1 / -1', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--ink3)' }}>No meetings started for {quarter} yet.</p>
          </div>
        )}
      </div>

      {!showNew ? (
        <button className="it-btn sm" onClick={() => setShowNew(true)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14M5 12h14"/></svg>
          New meeting
        </button>
      ) : (
        <div className="it-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 10, maxWidth: 480 }}>
          <select
            value={pickedManager}
            onChange={(e) => setPickedManager(e.target.value)}
            style={{ flex: 1, padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 13, fontFamily: 'inherit' }}
          >
            <option value="">Select a manager…</option>
            {tr.managers.map((m) => <option key={m} value={m}>{m}</option>)}
            <option value="__new__">+ New manager…</option>
          </select>
          {pickedManager === '__new__' && (
            <input
              value={newManagerName}
              onChange={(e) => setNewManagerName(e.target.value)}
              placeholder="Manager name"
              style={{ flex: 1, padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 13, fontFamily: 'inherit' }}
            />
          )}
          <button className="it-btn sm" onClick={handleStart} disabled={!pickedManager}>Start</button>
          <button className="it-btn sm" onClick={() => setShowNew(false)}>Cancel</button>
        </div>
      )}
    </div>
  );
}

// ---- Board (meeting) view ----

function PrevQuarterReference({ prevQuarter }) {
  const [open, setOpen] = useState(false);
  if (!prevQuarter) return null;

  return (
    <div className="it-card" style={{ padding: 0, marginBottom: 18, overflow: 'hidden', border: '1px solid var(--border)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '11px 16px', background: '#fafbfc', border: 0, cursor: 'pointer', fontFamily: 'inherit'
        }}
      >
        <span className="it-mono" style={{ fontSize: 12, color: 'var(--ink3)' }}>
          Reference: {prevQuarter.quarter} rocks &amp; issues (read-only)
        </span>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      {open && (
        <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <p className="it-mono" style={{ fontSize: 11, color: 'var(--ink4)', marginBottom: 8, textTransform: 'uppercase' }}>Rocks</p>
            {(prevQuarter.rocks || []).length === 0 && <p style={{ fontSize: 13, color: 'var(--ink4)' }}>—</p>}
            {(prevQuarter.rocks || []).map((rk, i) => (
              <p key={i} style={{ fontSize: 13, color: 'var(--ink2)', marginBottom: 6 }}>
                {rk.desc || '—'} <span className="it-mono" style={{ fontSize: 11, color: 'var(--ink4)' }}>({rk.owner || 'Unassigned'})</span>
              </p>
            ))}
          </div>
          <div>
            <p className="it-mono" style={{ fontSize: 11, color: 'var(--ink4)', marginBottom: 8, textTransform: 'uppercase' }}>Issues</p>
            {(prevQuarter.issues || []).length === 0 && <p style={{ fontSize: 13, color: 'var(--ink4)' }}>—</p>}
            {(prevQuarter.issues || []).map((iss, i) => (
              <p key={i} style={{ fontSize: 13, color: 'var(--ink2)', marginBottom: 6 }}>{iss}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function IssuesSection({ doc, editing, up, onConvert }) {
  const issues = doc.issues || [];

  const setIssue = (i, val) => {
    const next = issues.slice();
    next[i] = val;
    up(['issues'], next);
  };
  const removeIssue = (i) => up(['issues'], issues.filter((_, idx) => idx !== i));
  const addIssue = () => up(['issues'], [...issues, '']);

  return (
    <div className="it-card" style={{ padding: 18, marginBottom: 16, borderTop: `3px solid ${WARM}` }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', margin: '0 0 12px' }}>Issues (IDS)</h3>
      {issues.length === 0 && <p style={{ fontSize: 13, color: 'var(--ink4)' }}>No issues listed yet.</p>}
      {issues.map((iss, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          {editing ? (
            <input
              value={iss}
              onChange={(e) => setIssue(i, e.target.value)}
              placeholder="Issue…"
              style={{ flex: 1, padding: '7px 11px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 13, fontFamily: 'inherit' }}
            />
          ) : (
            <span style={{ flex: 1, fontSize: 13.5, color: 'var(--ink2)' }}>{iss || '—'}</span>
          )}
          {editing && (
            <>
              <button
                className="it-btn sm"
                title="Convert to rock"
                onClick={() => onConvert(i)}
                style={{ color: TRACTION, borderColor: TRACTION }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                Rock
              </button>
              <button className="it-btn sm" title="Remove issue" onClick={() => removeIssue(i)}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </>
          )}
        </div>
      ))}
      {editing && (
        <button className="it-btn sm" onClick={addIssue} style={{ marginTop: 4 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14M5 12h14"/></svg>
          Add issue
        </button>
      )}
    </div>
  );
}

function RocksSection({ doc, editing, up }) {
  const rocks = doc.rocks || [];

  const setRock = (i, key, val) => {
    const next = rocks.map((rk, idx) => idx === i ? { ...rk, [key]: val } : rk);
    up(['rocks'], next);
  };
  const removeRock = (i) => up(['rocks'], rocks.filter((_, idx) => idx !== i));
  const addRock = () => up(['rocks'], [...rocks, { desc: '', owner: '' }]);

  return (
    <div className="it-card" style={{ padding: 18, borderTop: `3px solid ${TRACTION}` }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', margin: '0 0 12px' }}>Rocks</h3>
      {rocks.length === 0 && <p style={{ fontSize: 13, color: 'var(--ink4)' }}>No rocks set yet.</p>}
      {rocks.map((rk, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span className="it-mono" style={{
            flexShrink: 0, width: 22, height: 22, borderRadius: 6, display: 'flex',
            alignItems: 'center', justifyContent: 'center', background: TRACTION_SOFT,
            color: TRACTION, fontSize: 11, fontWeight: 600
          }}>{i + 1}</span>
          {editing ? (
            <>
              <input
                value={rk.desc}
                onChange={(e) => setRock(i, 'desc', e.target.value)}
                placeholder="Rock description…"
                style={{ flex: 1, padding: '7px 11px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 13, fontFamily: 'inherit' }}
              />
              <input
                value={rk.owner}
                onChange={(e) => setRock(i, 'owner', e.target.value)}
                placeholder="Owner"
                style={{ width: 150, padding: '7px 11px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 13, fontFamily: 'inherit' }}
              />
              <button className="it-btn sm" title="Remove rock" onClick={() => removeRock(i)}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </>
          ) : (
            <>
              <span style={{ flex: 1, fontSize: 13.5, color: 'var(--ink2)' }}>{rk.desc || '—'}</span>
              <span className="it-mono" style={{ fontSize: 11.5, color: TRACTION, background: TRACTION_SOFT, padding: '3px 10px', borderRadius: 999 }}>
                {rk.owner || 'Unassigned'}
              </span>
            </>
          )}
        </div>
      ))}
      {editing && (
        <button className="it-btn sm" onClick={addRock} style={{ marginTop: 4 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14M5 12h14"/></svg>
          Add rock
        </button>
      )}
    </div>
  );
}

function BoardView({ tr, id, onBack }) {
  useEffect(() => { tr.openRecord(id); }, [id]);

  const doc = tr.doc;
  if (!doc || doc.id !== id) {
    return <p className="it-mono" style={{ fontSize: 13, color: 'var(--ink3)' }}>Loading…</p>;
  }

  const editing = doc.status !== 'final';

  const handleConvert = (issueIndex) => {
    const issueText = (doc.issues || [])[issueIndex];
    if (issueText == null) return;
    const nextRocks = [...(doc.rocks || []), { desc: issueText, owner: '' }];
    const nextIssues = (doc.issues || []).filter((_, idx) => idx !== issueIndex);
    tr.up(['rocks'], nextRocks);
    tr.up(['issues'], nextIssues);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <button
            onClick={onBack}
            className="it-mono"
            style={{ background: 'none', border: 0, cursor: 'pointer', fontSize: 12, color: 'var(--ink3)', padding: 0, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M15 6l-6 6 6 6"/></svg>
            All meetings
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--ink)', margin: 0 }}>{doc.manager}</h2>
            <span className="it-mono" style={{ fontSize: 12, color: 'var(--ink3)' }}>{doc.quarter}</span>
            <StatusBadge status={doc.status} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {tr.saving && <span className="it-mono" style={{ fontSize: 11, color: 'var(--ink4)' }}>Saving…</span>}
          {editing ? (
            <button className="it-btn sm" onClick={() => tr.finalize()} style={{ background: TRACTION, color: 'white', borderColor: TRACTION }}>
              Finalize meeting
            </button>
          ) : (
            <button className="it-btn sm" onClick={() => tr.unlock()}>
              Unlock to edit
            </button>
          )}
        </div>
      </div>

      {tr.error && (
        <div style={{ background: 'var(--red-soft)', border: '1px solid #fecaca', borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <p className="it-mono" style={{ fontSize: 12, color: 'var(--red)' }}>{tr.error}</p>
        </div>
      )}

      <PrevQuarterReference prevQuarter={doc.prevQuarter} />
      <IssuesSection doc={doc} editing={editing} up={tr.up} onConvert={handleConvert} />
      <RocksSection doc={doc} editing={editing} up={tr.up} />
    </div>
  );
}

// ---- Tab root ----

export function TeamRocksTab({ getToken }) {
  const tr = useTeamRocks(getToken);
  const [view, setView] = useState('rollup');
  const [quarter, setQuarter] = useState(currentQuarter());
  const [openId, setOpenId] = useState(null);

  const openBoard = (id) => { setOpenId(id); setView('board'); };
  const backToRollup = () => { setView('rollup'); tr.closeDoc(); tr.loadRollup(quarter); };

  if (view === 'board' && openId) {
    return <BoardView tr={tr} id={openId} onBack={backToRollup} />;
  }

  return <RollupView tr={tr} quarter={quarter} setQuarter={setQuarter} onOpen={openBoard} onStartNew={() => {}} />;
}
