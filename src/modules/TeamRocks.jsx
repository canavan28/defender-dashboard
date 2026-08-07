import { useEffect, useState } from 'react';
import { useTeamRocks } from '../hooks/useTeamRocks';
import { IT, VTO, VTOIcon, EditList, CoreValuesBody, CoreFocusBody } from './VTOSections';

// Fixed for this quarter — revisit and update by hand next quarter if the
// three-pillar focus changes. Not stored as data on purpose (see project
// discussion): this is a rarely-changing banner, not a per-meeting field.
const MEETING_FOCUS = ['Security', 'Efficiency', 'Project Sales'];

const IDS_BLURB = `We use IDS — Identify, Discuss, Solve. First, get every issue out on the table, big or small, without worrying about order or who's "at fault." Then work through them together, starting with whatever's actually blocking progress. Anything that needs real action becomes a Rock below — owned by one person, with a clear finish line, not just "in progress."`;

// Local field style, matching VTOSections' internal (unexported) vtoStyles.input.
const fieldStyle = {
  width: '100%', fontFamily: IT.font, fontSize: 14, color: IT.ink,
  padding: '7px 11px', borderRadius: 9, border: `1px solid ${VTO.cardBorder}`,
  outline: 'none', background: '#fffdfb', lineHeight: 1.5,
};

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
      style={{
        fontFamily: IT.mono, fontSize: 10.5, fontWeight: 600, padding: '2px 9px', borderRadius: 999,
        background: isFinal ? VTO.tractionSoft : VTO.warmSoft,
        color: isFinal ? VTO.traction : VTO.warm,
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
      <span style={{ fontFamily: IT.mono, fontSize: 13, fontWeight: 600, color: IT.ink, minWidth: 70, textAlign: 'center' }}>
        {quarter}
      </span>
      <button className="it-btn sm" onClick={() => onChange(shiftQuarter(quarter, 1))} aria-label="Next quarter">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M9 6l6 6-6 6"/></svg>
      </button>
    </div>
  );
}

function SectionHeader({ icon, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: IT.ink3 }}>
      <VTOIcon name={icon} size={16} />
      <span style={{ fontFamily: IT.mono, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 500 }}>{label}</span>
    </div>
  );
}

function MeetingFocusBanner() {
  return (
    <div style={{
      textAlign: 'center', padding: '26px 0', margin: '4px 0 28px',
      borderTop: `1px solid ${VTO.cardBorder}`, borderBottom: `1px solid ${VTO.cardBorder}`,
    }}>
      <div style={{ fontFamily: IT.mono, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: VTO.warm, marginBottom: 10, fontWeight: 600 }}>
        This Quarter's Focus
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: IT.ink, letterSpacing: '0.01em' }}>
        {MEETING_FOCUS.map((f, i) => (
          <span key={f}>
            {i > 0 && <span style={{ color: VTO.warm, margin: '0 14px' }}>·</span>}
            {f}
          </span>
        ))}
      </div>
    </div>
  );
}

function PrevQuarterReference({ prevQuarter }) {
  const [open, setOpen] = useState(false);
  if (!prevQuarter) return null;

  return (
    <div style={{ borderRadius: 11, overflow: 'hidden', border: `1px solid ${VTO.cardBorder}`, marginBottom: 20, background: '#fff' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '11px 16px', background: '#fafbfc', border: 0, cursor: 'pointer', fontFamily: IT.font
        }}
      >
        <span style={{ fontFamily: IT.mono, fontSize: 12, color: IT.ink3 }}>
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
            <p style={{ fontFamily: IT.mono, fontSize: 11, color: IT.ink4, marginBottom: 8, textTransform: 'uppercase' }}>Rocks</p>
            {(prevQuarter.rocks || []).length === 0 && <p style={{ fontSize: 13, color: IT.ink4 }}>—</p>}
            {(prevQuarter.rocks || []).map((rk, i) => (
              <p key={i} style={{ fontSize: 13, color: IT.ink2, marginBottom: 6 }}>
                {rk.desc || '—'} <span style={{ fontFamily: IT.mono, fontSize: 11, color: IT.ink4 }}>({rk.owner || 'Unassigned'})</span>
              </p>
            ))}
          </div>
          <div>
            <p style={{ fontFamily: IT.mono, fontSize: 11, color: IT.ink4, marginBottom: 8, textTransform: 'uppercase' }}>Issues</p>
            {(prevQuarter.issues || []).length === 0 && <p style={{ fontSize: 13, color: IT.ink4 }}>—</p>}
            {(prevQuarter.issues || []).map((iss, i) => (
              <p key={i} style={{ fontSize: 13, color: IT.ink2, marginBottom: 6 }}>{iss}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RocksSection({ doc, editing, up }) {
  const accent = VTO.traction;
  const rocks = doc.rocks || [];
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  const setRock = (i, key, val) => up(['rocks'], rocks.map((rk, idx) => idx === i ? { ...rk, [key]: val } : rk));
  const addRock = () => up(['rocks'], [...rocks, { desc: '', owner: '' }]);
  const removeRock = (i) => up(['rocks'], rocks.filter((_, idx) => idx !== i));
  const handleDrop = (dropIndex) => {
    if (dragIndex === null || dragIndex === dropIndex) { setDragIndex(null); setOverIndex(null); return; }
    const next = rocks.slice();
    const [moved] = next.splice(dragIndex, 1);
    next.splice(dropIndex, 0, moved);
    up(['rocks'], next);
    setDragIndex(null);
    setOverIndex(null);
  };

  return (
    <div style={{ borderRadius: 11, overflow: 'hidden', border: `1px solid ${VTO.cardBorder}`, borderLeft: `3px solid ${accent}`, background: '#fff' }}>
      <div style={{ padding: '13px 17px', borderBottom: `1px solid ${VTO.cardBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: VTO.tractionSoft }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <VTOIcon name="rocks" size={16} />
          <div>
            <div style={{ fontFamily: IT.mono, fontSize: 10.5, letterSpacing: '0.07em', textTransform: 'uppercase', color: accent, fontWeight: 600 }}>This Quarter</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: IT.ink, marginTop: 2 }}>Rocks</div>
          </div>
        </div>
        <span style={{ fontFamily: IT.mono, fontSize: 10.5, color: IT.ink4 }}>{rocks.length} rock{rocks.length === 1 ? '' : 's'}</span>
      </div>
      <div style={{ padding: 17 }}>
        {rocks.length === 0 && <p style={{ fontSize: 13, color: IT.ink4, marginBottom: editing ? 12 : 0 }}>No rocks set yet.</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rocks.map((rk, i) => (
            <div key={i}
              draggable={editing}
              onDragStart={editing ? () => setDragIndex(i) : undefined}
              onDragOver={editing ? (e) => { e.preventDefault(); setOverIndex(i); } : undefined}
              onDragLeave={editing ? () => setOverIndex(prev => prev === i ? null : prev) : undefined}
              onDrop={editing ? (e) => { e.preventDefault(); handleDrop(i); } : undefined}
              onDragEnd={editing ? () => { setDragIndex(null); setOverIndex(null); } : undefined}
              style={{ display: 'flex', gap: 8, alignItems: editing ? 'flex-start' : 'center', opacity: dragIndex === i ? 0.4 : 1, borderTop: overIndex === i && dragIndex !== null && dragIndex !== i ? `2px solid ${accent}` : '2px solid transparent' }}
            >
              {editing && (
                <span title="Drag to reorder" style={{ cursor: 'grab', flexShrink: 0, color: IT.ink4, display: 'flex', alignItems: 'center', marginTop: 7 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><circle cx="8" cy="6" r="1.4"/><circle cx="16" cy="6" r="1.4"/><circle cx="8" cy="12" r="1.4"/><circle cx="16" cy="12" r="1.4"/><circle cx="8" cy="18" r="1.4"/><circle cx="16" cy="18" r="1.4"/></svg>
                </span>
              )}
              <span style={{ fontFamily: IT.mono, flexShrink: 0, width: 24, height: 24, borderRadius: 7, marginTop: editing ? 7 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: VTO.tractionSoft, color: accent, fontSize: 11, fontWeight: 600 }}>{i + 1}</span>
              {editing ? (
                <>
                  <div style={{ flex: 1 }}>
                    <input value={rk.desc} placeholder="Rock description…" onChange={(e) => setRock(i, 'desc', e.target.value)} style={fieldStyle} />
                  </div>
                  <div style={{ width: 170, position: 'relative' }}>
                    <input value={rk.owner} placeholder="Owner" onChange={(e) => setRock(i, 'owner', e.target.value)} style={{ ...fieldStyle, paddingLeft: 30 }} />
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={IT.ink4} strokeWidth="2" style={{ position: 'absolute', left: 10, top: 10 }}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>
                  </div>
                  <button onClick={() => removeRock(i)} title="Remove rock" className="vto-iconbtn vto-iconbtn-del" style={{ marginTop: 1 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </>
              ) : (
                <>
                  <span style={{ flex: 1, fontSize: 14, color: IT.ink2, lineHeight: 1.5 }}>{rk.desc || '—'}</span>
                  <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#2c6a4c', fontFamily: IT.mono, padding: '3px 11px 3px 8px', borderRadius: 999, background: VTO.tractionSoft }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>
                    {rk.owner || 'Unassigned'}
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
        {editing && (
          <button className="it-btn sm" style={{ marginTop: 12, marginLeft: 32 }} onClick={addRock}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14M5 12h14"/></svg>
            Add rock
          </button>
        )}
      </div>
    </div>
  );
}

function StartMeetingCard({ quarter, onStart, loading }) {
  return (
    <div style={{ border: `1px dashed ${VTO.cardBorder}`, borderRadius: 11, padding: 40, textAlign: 'center', background: '#fff' }}>
      <p style={{ fontSize: 14, color: IT.ink3, marginBottom: 16 }}>No meeting started for {quarter} yet.</p>
      <button className="it-btn sm" onClick={onStart} disabled={loading} style={{ background: VTO.warm, color: 'white', borderColor: VTO.warm }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14M5 12h14"/></svg>
        Start this quarter's meeting
      </button>
    </div>
  );
}

export function TeamRocksTab({ getToken }) {
  const tr = useTeamRocks(getToken);
  const [quarter, setQuarter] = useState(currentQuarter());

  useEffect(() => { tr.loadQuarter(quarter); }, [quarter]);

  const doc = tr.doc;
  const editing = doc ? doc.status !== 'final' : false;

  const visionRef = doc?.visionRef || null;
  // Fake "doc" wrappers so we can reuse VTO's actual CoreValuesBody/CoreFocusBody
  // components verbatim, in read-only mode — this section is reference-only,
  // editing core values/focus always happens in the real VTO tab.
  const visionDoc = {
    vision: {
      coreValues: visionRef?.coreValues || [],
      coreFocus: visionRef?.coreFocus || { purpose: '', niche: '' },
    },
  };
  const noopUp = () => {};

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: IT.ink, margin: 0 }}>Team Rocks</h2>
          <p style={{ fontFamily: IT.mono, fontSize: 12, color: IT.ink3, marginTop: 3 }}>
            One shared screen for the quarterly Rock-setting meeting — issues and rocks here are independent of the VTO.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {doc && (
            <>
              {tr.saving && <span style={{ fontFamily: IT.mono, fontSize: 11, color: IT.ink4 }}>Saving…</span>}
              <StatusBadge status={doc.status} />
              {editing ? (
                <button className="it-btn sm" onClick={() => tr.finalize()} style={{ background: VTO.traction, color: 'white', borderColor: VTO.traction }}>
                  Finalize meeting
                </button>
              ) : (
                <button className="it-btn sm" onClick={() => tr.unlock()}>Unlock to edit</button>
              )}
            </>
          )}
          <QuarterPicker quarter={quarter} onChange={setQuarter} />
        </div>
      </div>

      {tr.error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <p style={{ fontFamily: IT.mono, fontSize: 12, color: IT.red }}>{tr.error}</p>
        </div>
      )}

      {tr.notStarted && !doc && (
        <StartMeetingCard quarter={quarter} loading={tr.loading} onStart={() => tr.startMeeting(quarter)} />
      )}

      {doc && (
        <>
          {visionRef ? (
            <>
              <div style={{ marginBottom: 28 }}>
                <SectionHeader icon="values" label={`Core Values — from FY${visionRef.sourceYear} VTO`} />
                <CoreValuesBody doc={visionDoc} editing={false} up={noopUp} />
              </div>
              <div style={{ marginBottom: 8 }}>
                <SectionHeader icon="focus" label={`Core Focus — from FY${visionRef.sourceYear} VTO`} />
                <CoreFocusBody doc={visionDoc} editing={false} up={noopUp} />
              </div>
            </>
          ) : (
            <p style={{ fontSize: 13, color: IT.ink4, marginBottom: 20 }}>No VTO on file yet — Core Values/Focus reference will appear here once one exists.</p>
          )}

          <MeetingFocusBanner />

          <p style={{ fontSize: 13.5, color: IT.ink2, lineHeight: 1.65, marginBottom: 20, maxWidth: 760 }}>
            {IDS_BLURB}
          </p>

          <div style={{ marginBottom: 20 }}>
            <SectionHeader icon="issues" label="Issues" />
            <EditList
              items={doc.issues}
              editing={editing}
              accent={VTO.traction}
              dense
              reorderable
              onChange={(val) => tr.up(['issues'], val)}
              placeholder="Add an issue — capture freely, prioritize later…"
            />
            {!editing && (doc.issues || []).length > 0 && (
              <div style={{ fontFamily: IT.mono, fontSize: 11.5, color: IT.ink4, marginTop: 10 }}>
                {doc.issues.length} issues captured · Identify · Discuss · Solve
              </div>
            )}
          </div>

          <div style={{ marginBottom: 20 }}>
            <RocksSection doc={doc} editing={editing} up={tr.up} />
          </div>

          <PrevQuarterReference prevQuarter={doc.prevQuarter} />
        </>
      )}
    </div>
  );
}
