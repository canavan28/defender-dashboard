// VTOSections.jsx — editable field primitives + per-section body components
// for the VTO (Vision/Traction Organizer) tab.
//
// Color/font values are hardcoded directly in this file (copied from the
// Claude Design handoff) rather than imported from a shared tokens file,
// since no shared tokens file exists yet in this codebase.

import React, { useState } from 'react';

// ---- Base dashboard tokens (same values used across the existing tabs) ----
const IT = {
  font: '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  mono: '"DM Mono", "JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace',
  ink: '#0f172a',
  ink2: '#334155',
  ink3: '#64748b',
  ink4: '#94a3b8',
  red: '#dc2626',
  redSoft: '#fee2e2',
  amber: '#d97706',
  amberSoft: '#fef3c7',
};

// ---- Warm VTO accent palette (layered on top of IT tokens, VTO-only) ----
export const VTO = {
  paper:       '#faf7f2',
  paperEdge:   '#efe8dd',
  cardBorder:  '#ece4d8',
  ink:         IT.ink,
  vision:      '#2f74b5',
  visionSoft:  '#eaf2fb',
  traction:    '#3f9469',
  tractionSoft:'#e9f5ee',
  warm:        '#c66a3a',
  warmSoft:    '#f7ece3',
  gold:        '#bd8a2e',
};

export { IT };

const vtoStyles = {
  input: {
    width: '100%', fontFamily: IT.font, fontSize: 14, color: IT.ink,
    padding: '9px 12px', borderRadius: 9, border: `1px solid ${VTO.cardBorder}`,
    outline: 'none', background: '#fffdfb', lineHeight: 1.5,
  },
  area: {
    width: '100%', fontFamily: IT.font, fontSize: 14, color: IT.ink,
    padding: '11px 13px', borderRadius: 9, border: `1px solid ${VTO.cardBorder}`,
    outline: 'none', background: '#fffdfb', lineHeight: 1.6, resize: 'vertical',
  },
  fieldLabel: {
    fontFamily: IT.mono, fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase',
    color: IT.ink3, fontWeight: 500, marginBottom: 6, display: 'block',
  },
};

const focusOn  = (accent) => (e) => { e.target.style.borderColor = accent; e.target.style.boxShadow = `0 0 0 3px ${accent}22`; };
const focusOff = () => (e) => { e.target.style.borderColor = VTO.cardBorder; e.target.style.boxShadow = 'none'; };

// =================== Icons (18x18 line icons) ===================

const ICONS = {
  values:   <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/>,
  focus:    <g><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/></g>,
  marketing:<g><path d="M3 11v3a1 1 0 0 0 1 1h2l4 4V6L6 10H4a1 1 0 0 0-1 1Z"/><path d="M14 8.5a4 4 0 0 1 0 7"/><path d="M17 5.5a8 8 0 0 1 0 13"/></g>,
  current:  <g><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></g>,
  oneYear:  <g><path d="M4 21V4l8 3 8-3v12l-8 3-8-3Z"/><path d="M4 4l8 3v14"/></g>,
  issues:   <g><path d="M3 5h18"/><path d="M3 12h18"/><path d="M3 19h12"/></g>,
  rocks:    <g><path d="M3 18l5-9 4 5 3-4 6 8H3Z"/><circle cx="8" cy="6.5" r="1.6"/></g>,
  twoYear:  <g><path d="M5 19c4 0 4-7 8-7s4 7 6 7"/><path d="M5 9c4 0 4-4 7-4"/><circle cx="19" cy="5" r="1.6"/></g>,
  threeYear:<g><circle cx="7" cy="14" r="3.2"/><circle cx="17" cy="14" r="3.2"/><path d="M7 10.8V8l4-2 2 1.2"/><path d="M10.2 14h3.6"/></g>,
  fiveYear: <g><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3"/></g>,
  tenYear:  <g><path d="m3 21 4-4"/><path d="M9 15 18.5 5.5a2.1 2.1 0 0 0-3-3L6 12l1.5 1.5L9 15Z"/><path d="M14 6l4 4"/><path d="m17 3 .8 1.6L19.5 5l-1.4 1L18 7.8 16.7 6.6 15 7l.9-1.6L15 4l1.6.2L17 3Z" fill="currentColor" stroke="none"/></g>,
};

export function VTOIcon({ name, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name]}
    </svg>
  );
}

// =================== Editable primitives ===================

export function EditText({ value, onChange, editing, placeholder, accent = VTO.vision, mono = false, strong = false, big = false, center = false }) {
  if (!editing) {
    const empty = !value;
    return <span style={{ fontFamily: mono ? IT.mono : IT.font, fontSize: big ? 19 : 14, fontWeight: strong ? 600 : 400, color: empty ? IT.ink4 : IT.ink, display: center ? 'block' : 'inline', textAlign: center ? 'center' : undefined }}>{empty ? '—' : value}</span>;
  }
  return (
    <input value={value || ''} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)} onFocus={focusOn(accent)} onBlur={focusOff()}
      style={{ ...vtoStyles.input, fontFamily: mono ? IT.mono : IT.font, fontSize: big ? 19 : 14, fontWeight: strong ? 600 : 400, textAlign: center ? 'center' : 'left' }}/>
  );
}

export function EditArea({ value, onChange, editing, placeholder, accent = VTO.vision, minHeight = 80, center = false }) {
  if (!editing) {
    const empty = !value;
    return <div style={{ fontSize: 14, lineHeight: 1.62, color: empty ? IT.ink4 : IT.ink2, whiteSpace: 'pre-wrap', textAlign: center ? 'center' : undefined }}>{empty ? '—' : value}</div>;
  }
  return (
    <textarea value={value || ''} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)} onFocus={focusOn(accent)} onBlur={focusOff()}
      style={{ ...vtoStyles.area, minHeight, textAlign: center ? 'center' : 'left' }}/>
  );
}

export function EditList({ items, onChange, editing, ordered = false, placeholder = 'Add an item…', accent = VTO.vision, dense = false, reorderable = false }) {
  const [draft, setDraft] = useState('');
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  const items_ = items || [];
  const add = () => { const v = draft.trim(); if (!v) return; onChange([...items_, v]); setDraft(''); };
  const update = (i, v) => onChange(items_.map((it, idx) => idx === i ? v : it));
  const remove = (i) => onChange(items_.filter((_, idx) => idx !== i));

  const handleDrop = (dropIndex) => {
    if (dragIndex === null || dragIndex === dropIndex) { setDragIndex(null); setOverIndex(null); return; }
    const next = items_.slice();
    const [moved] = next.splice(dragIndex, 1);
    next.splice(dropIndex, 0, moved);
    onChange(next);
    setDragIndex(null);
    setOverIndex(null);
  };

  if (!editing) {
    if (items_.length === 0) return <div style={{ fontSize: 14, color: IT.ink4 }}>—</div>;
    return (
      <ol style={{ margin: 0, paddingLeft: ordered ? 22 : 0, listStyle: ordered ? 'decimal' : 'none', display: 'flex', flexDirection: 'column', gap: dense ? 6 : 9 }}>
        {items_.map((it, i) => (
          <li key={i} style={{ fontSize: 14, color: IT.ink2, lineHeight: 1.55, display: 'flex', gap: 10, ...(ordered ? { paddingLeft: 4 } : {}) }}>
            {!ordered && <span style={{ width: 6, height: 6, borderRadius: 999, background: accent, marginTop: 7, flexShrink: 0 }}></span>}
            <span>{it}</span>
          </li>
        ))}
      </ol>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {items_.map((it, i) => (
        <div key={i}
          draggable={reorderable}
          onDragStart={reorderable ? () => setDragIndex(i) : undefined}
          onDragOver={reorderable ? (e) => { e.preventDefault(); setOverIndex(i); } : undefined}
          onDragLeave={reorderable ? () => setOverIndex(prev => prev === i ? null : prev) : undefined}
          onDrop={reorderable ? (e) => { e.preventDefault(); handleDrop(i); } : undefined}
          onDragEnd={reorderable ? () => { setDragIndex(null); setOverIndex(null); } : undefined}
          style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: dragIndex === i ? 0.4 : 1, borderTop: overIndex === i && dragIndex !== null && dragIndex !== i ? `2px solid ${accent}` : '2px solid transparent' }}>
          {reorderable && (
            <span title="Drag to reorder" style={{ cursor: 'grab', flexShrink: 0, color: IT.ink4, display: 'flex', alignItems: 'center' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><circle cx="8" cy="6" r="1.4"/><circle cx="16" cy="6" r="1.4"/><circle cx="8" cy="12" r="1.4"/><circle cx="16" cy="12" r="1.4"/><circle cx="8" cy="18" r="1.4"/><circle cx="16" cy="18" r="1.4"/></svg>
            </span>
          )}
          <span style={{ fontFamily: IT.mono, width: 20, textAlign: 'right', fontSize: 12, color: IT.ink4, flexShrink: 0 }}>{ordered ? `${i + 1}.` : '•'}</span>
          <input value={it} onChange={(e) => update(i, e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
            onFocus={focusOn(accent)} onBlur={focusOff()} style={{ ...vtoStyles.input, padding: '7px 11px' }}/>
          <button onClick={() => remove(i)} title="Remove" className="vto-iconbtn vto-iconbtn-del">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      ))}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {reorderable && <span style={{ width: 13, flexShrink: 0 }}></span>}
        <span style={{ width: 20, flexShrink: 0 }}></span>
        <input value={draft} placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          onFocus={focusOn(accent)} onBlur={focusOff()}
          style={{ ...vtoStyles.input, padding: '7px 11px', borderStyle: 'dashed', color: IT.ink2 }}/>
        <button onClick={add} title="Add" className="vto-iconbtn" style={{ border: `1px solid ${accent}`, background: accent, color: '#fff' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </div>
    </div>
  );
}

// =================== The repeated time-horizon "snapshot" block ===================
// Shared shape for Current Situation, 2-Year Journey, 3-Year Picture, 1-Year Plan.

function RefHint({ value }) {
  if (!value) return null;
  return (
    <div style={{ fontSize: 11.5, color: VTO.gold, marginTop: 4, fontStyle: 'italic' }}>
      Last year: {value}
    </div>
  );
}

export function SnapshotBlock({
  horizon, title, accent, accentSoft, snap, editing, update, prevSnap,
  money1Label = 'Gross Profit', money2Label = 'Net Profit',
  listKey = 'looksLike', listLabel = 'What does it look like?', listOrdered = false, dateLabel = 'Future Date',
}) {
  const Money = ({ label, k, placeholder }) => (
    <div style={{ flex: 1 }}>
      <span style={vtoStyles.fieldLabel}>{label}</span>
      <EditText value={snap[k]} editing={editing} onChange={(v) => update(k, v)} accent={accent} mono strong placeholder={placeholder} />
      {editing && !snap[k] && <RefHint value={prevSnap?.[k]} />}
    </div>
  );
  return (
    <div style={{ borderRadius: 11, overflow: 'hidden', border: `1px solid ${VTO.cardBorder}`, borderLeft: `3px solid ${accent}`, background: '#fff' }}>
      <div style={{ padding: '13px 17px', borderBottom: `1px solid ${VTO.cardBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: accentSoft }}>
        <div>
          <div style={{ fontFamily: IT.mono, fontSize: 10.5, letterSpacing: '0.07em', textTransform: 'uppercase', color: accent, fontWeight: 600 }}>{horizon}</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: IT.ink, marginTop: 2 }}>{title}</div>
        </div>
        <div style={{ minWidth: 160 }}>
          <span style={{ ...vtoStyles.fieldLabel, textAlign: 'right' }}>{dateLabel}</span>
          <EditText value={snap.date} editing={editing} onChange={(v) => update('date', v)} accent={accent} mono placeholder="e.g. Apr 30, 2028" />
          {editing && !snap.date && <RefHint value={prevSnap?.date} />}
        </div>
      </div>
      <div style={{ padding: 17 }}>
        <div style={{ display: 'flex', gap: 16, marginBottom: 15 }}>
          <Money label={money1Label} k="money1" placeholder="$0.0M" />
          <Money label={money2Label} k="money2" placeholder="$0k" />
        </div>
        <div style={{ marginBottom: 15 }}>
          <span style={vtoStyles.fieldLabel}>Measurables</span>
          <EditArea value={snap.measurables} editing={editing} onChange={(v) => update('measurables', v)} accent={accent} minHeight={52} placeholder="Key numbers at this horizon…" />
          {editing && !snap.measurables && <RefHint value={prevSnap?.measurables} />}
        </div>
        <div>
          <span style={vtoStyles.fieldLabel}>{listLabel}</span>
          <EditList items={snap[listKey]} editing={editing} ordered={listOrdered} onChange={(v) => update(listKey, v)} accent={accent}
            placeholder={listOrdered ? 'Add a goal…' : 'Add a detail…'} />
        </div>
      </div>
    </div>
  );
}

// =================== Individual section bodies ===================
// Each takes ({ doc, editing, up }). up(path, value) PATCHes one field via useVTO.

export function CoreValuesBody({ doc, editing, up }) {
  const v = doc.vision; const accent = VTO.vision;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {v.coreValues.map((cv, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, position: 'relative', padding: editing ? '0 28px' : '2px 0' }}>
          {editing && (
            <button onClick={() => up(['vision', 'coreValues'], v.coreValues.filter((_, idx) => idx !== i))} title="Remove value" className="vto-iconbtn vto-iconbtn-del" style={{ position: 'absolute', top: 0, right: 0 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          )}
          <span style={{ flexShrink: 0, width: 24, height: 24, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', background: VTO.visionSoft, color: accent, fontFamily: IT.mono, fontSize: 11, fontWeight: 600 }}>{i + 1}</span>
          <div style={{ width: '100%', textAlign: 'center' }}>
            <EditText value={cv.title} editing={editing} strong center accent={accent} onChange={(val) => up(['vision', 'coreValues', i, 'title'], val)} placeholder="Value name" />
          </div>
          <div style={{ width: '100%', textAlign: 'center' }}>
            <EditArea value={cv.desc} editing={editing} center accent={accent} minHeight={46} onChange={(val) => up(['vision', 'coreValues', i, 'desc'], val)} placeholder="What this value means in practice…" />
          </div>
        </div>
      ))}
      {editing && (
        <button className="it-btn sm" style={{ alignSelf: 'center' }} onClick={() => up(['vision', 'coreValues'], [...v.coreValues, { title: '', desc: '' }])}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14M5 12h14"/></svg>
          Add core value
        </button>
      )}
    </div>
  );
}

export function CoreFocusBody({ doc, editing, up }) {
  const cf = doc.vision.coreFocus; const accent = VTO.vision;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div>
        <span style={vtoStyles.fieldLabel}>Purpose / Cause / Passion</span>
        <EditArea value={cf.purpose} editing={editing} accent={accent} minHeight={78} onChange={(val) => up(['vision', 'coreFocus', 'purpose'], val)} placeholder="Why we exist…" />
      </div>
      <div>
        <span style={vtoStyles.fieldLabel}>Our Niche</span>
        <EditArea value={cf.niche} editing={editing} accent={accent} minHeight={78} onChange={(val) => up(['vision', 'coreFocus', 'niche'], val)} placeholder="What we do, focused…" />
      </div>
    </div>
  );
}

export function MarketingBody({ doc, editing, up }) {
  const m = doc.vision.marketing; const accent = VTO.vision;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <span style={vtoStyles.fieldLabel}>Target Market / "The List"</span>
        <EditArea value={m.targetMarket} editing={editing} accent={accent} minHeight={52} onChange={(val) => up(['vision', 'marketing', 'targetMarket'], val)} placeholder="The ideal client profile…" />
      </div>
      <div>
        <span style={vtoStyles.fieldLabel}>3 Uniques</span>
        <EditList items={m.uniques} editing={editing} ordered accent={accent} onChange={(val) => up(['vision', 'marketing', 'uniques'], val)} placeholder="Add a unique…" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <span style={vtoStyles.fieldLabel}>Proven Process</span>
          <EditArea value={m.provenProcess} editing={editing} accent={accent} minHeight={64} onChange={(val) => up(['vision', 'marketing', 'provenProcess'], val)} placeholder="Our repeatable client process…" />
        </div>
        <div>
          <span style={vtoStyles.fieldLabel}>Guarantee</span>
          <EditArea value={m.guarantee} editing={editing} accent={accent} minHeight={64} onChange={(val) => up(['vision', 'marketing', 'guarantee'], val)} placeholder="The promise we stand behind…" />
        </div>
      </div>
    </div>
  );
}

export const TargetBody = (key) => function TargetBodyInner({ doc, editing, up }) {
  return <EditArea value={doc.vision[key]} editing={editing} accent={VTO.vision} minHeight={60} onChange={(val) => up(['vision', key], val)} placeholder="…" />;
};

export function CurrentBody({ doc, editing, up }) {
  return <SnapshotBlock horizon="Today · Baseline" title="Where we are now" accent={VTO.vision} accentSoft={VTO.visionSoft}
    snap={doc.vision.current} editing={editing} update={(k, val) => up(['vision', 'current', k], val)} dateLabel="As Of"
    prevSnap={doc.prevSnapshots?.current} />;
}
export function TwoYearBody({ doc, editing, up }) {
  return <SnapshotBlock horizon="2-Year · Milestone" title="The journey there" accent={VTO.vision} accentSoft={VTO.visionSoft}
    snap={doc.vision.twoYear} editing={editing} update={(k, val) => up(['vision', 'twoYear', k], val)}
    prevSnap={doc.prevSnapshots?.twoYear} />;
}
export function ThreeYearBody({ doc, editing, up }) {
  return <SnapshotBlock horizon="3-Year · Horizon" title="Where we'll be" accent={VTO.vision} accentSoft={VTO.visionSoft}
    snap={doc.vision.threeYear} editing={editing} update={(k, val) => up(['vision', 'threeYear', k], val)}
    prevSnap={doc.prevSnapshots?.threeYear} />;
}
export function OneYearBody({ doc, editing, up }) {
  return <SnapshotBlock horizon="1-Year · This Year" title="This year's plan" accent={VTO.traction} accentSoft={VTO.tractionSoft}
    snap={doc.traction.oneYear} editing={editing} update={(k, val) => up(['traction', 'oneYear', k], val)}
    listKey="goals" listLabel="Goals for the Year" listOrdered
    prevSnap={doc.prevSnapshots?.oneYear} />;
}

export function IssuesBody({ doc, editing, up }) {
  const t = doc.traction;
  return (
    <>
      <EditList items={t.issues} editing={editing} accent={VTO.traction} dense reorderable onChange={(val) => up(['traction', 'issues'], val)} placeholder="Add an issue — capture freely, prioritize later…" />
      {!editing && t.issues.length > 0 && (
        <div style={{ fontFamily: IT.mono, fontSize: 11.5, color: IT.ink4, marginTop: 14 }}>{t.issues.length} issues captured · Identify · Discuss · Solve</div>
      )}
    </>
  );
}

export function RocksBody({ doc, editing, up }) {
  const accent = VTO.traction;
  const rocks = doc.traction.rocks.items || [];
  const r = doc.traction.rocks;
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  const updRocks = (k, val) => up(['traction', 'rocks', k], val);
  const setRock = (i, key, val) => up(['traction', 'rocks', 'items'], rocks.map((rk, idx) => idx === i ? { ...rk, [key]: val } : rk));
  const addRock = () => up(['traction', 'rocks', 'items'], [...rocks, { desc: '', owner: '' }]);
  const removeRock = (i) => up(['traction', 'rocks', 'items'], rocks.filter((_, idx) => idx !== i));
  const handleDrop = (dropIndex) => {
    if (dragIndex === null || dragIndex === dropIndex) { setDragIndex(null); setOverIndex(null); return; }
    const next = rocks.slice();
    const [moved] = next.splice(dragIndex, 1);
    next.splice(dropIndex, 0, moved);
    up(['traction', 'rocks', 'items'], next);
    setDragIndex(null);
    setOverIndex(null);
  };

  return (
    <div style={{ borderRadius: 11, overflow: 'hidden', border: `1px solid ${VTO.cardBorder}`, borderLeft: `3px solid ${accent}`, background: '#fff' }}>
      <div style={{ padding: '13px 17px', borderBottom: `1px solid ${VTO.cardBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: VTO.tractionSoft }}>
        <div>
          <div style={{ fontFamily: IT.mono, fontSize: 10.5, letterSpacing: '0.07em', textTransform: 'uppercase', color: accent, fontWeight: 600 }}>Quarter · Priorities</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: IT.ink, marginTop: 2 }}>This quarter's rocks</div>
        </div>
        <div style={{ minWidth: 150 }}>
          <span style={{ ...vtoStyles.fieldLabel, textAlign: 'right' }}>Future Date</span>
          <EditText value={r.date} editing={editing} onChange={(v) => updRocks('date', v)} accent={accent} mono placeholder="e.g. Q3 2025" />
        </div>
      </div>
      <div style={{ padding: 17 }}>
        <div style={{ display: 'flex', gap: 16, marginBottom: 15 }}>
          <div style={{ flex: 1 }}>
            <span style={vtoStyles.fieldLabel}>Revenue</span>
            <EditText value={r.money1} editing={editing} onChange={(v) => updRocks('money1', v)} accent={accent} mono strong placeholder="$0.0M" />
          </div>
          <div style={{ flex: 1 }}>
            <span style={vtoStyles.fieldLabel}>Profit</span>
            <EditText value={r.money2} editing={editing} onChange={(v) => updRocks('money2', v)} accent={accent} mono strong placeholder="$0k" />
          </div>
        </div>
        <div style={{ marginBottom: 17 }}>
          <span style={vtoStyles.fieldLabel}>Measurables</span>
          <EditArea value={r.measurables} editing={editing} onChange={(v) => updRocks('measurables', v)} accent={accent} minHeight={46} placeholder="How we'll know we're on track…" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ ...vtoStyles.fieldLabel, marginBottom: 0 }}>Rocks &amp; Owners</span>
          <span style={{ fontFamily: IT.mono, fontSize: 10.5, color: IT.ink4 }}>{rocks.length} rocks</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          {rocks.map((rk, i) => (
            <div key={i}
              draggable={editing}
              onDragStart={editing ? () => setDragIndex(i) : undefined}
              onDragOver={editing ? (e) => { e.preventDefault(); setOverIndex(i); } : undefined}
              onDragLeave={editing ? () => setOverIndex(prev => prev === i ? null : prev) : undefined}
              onDrop={editing ? (e) => { e.preventDefault(); handleDrop(i); } : undefined}
              onDragEnd={editing ? () => { setDragIndex(null); setOverIndex(null); } : undefined}
              style={{ display: 'flex', gap: 8, alignItems: editing ? 'flex-start' : 'center', opacity: dragIndex === i ? 0.4 : 1, borderTop: overIndex === i && dragIndex !== null && dragIndex !== i ? `2px solid ${accent}` : '2px solid transparent' }}>
              {editing && (
                <span title="Drag to reorder" style={{ cursor: 'grab', flexShrink: 0, color: IT.ink4, display: 'flex', alignItems: 'center', marginTop: 7 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><circle cx="8" cy="6" r="1.4"/><circle cx="16" cy="6" r="1.4"/><circle cx="8" cy="12" r="1.4"/><circle cx="16" cy="12" r="1.4"/><circle cx="8" cy="18" r="1.4"/><circle cx="16" cy="18" r="1.4"/></svg>
                </span>
              )}
              <span style={{ fontFamily: IT.mono, flexShrink: 0, width: 24, height: 24, borderRadius: 7, marginTop: editing ? 7 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: VTO.tractionSoft, color: accent, fontSize: 11, fontWeight: 600 }}>{i + 1}</span>
              {editing ? (
                <>
                  <div style={{ flex: 1 }}>
                    <input value={rk.desc} placeholder="Rock description…" onChange={(e) => setRock(i, 'desc', e.target.value)} onFocus={focusOn(accent)} onBlur={focusOff()} style={{ ...vtoStyles.input, padding: '7px 11px' }}/>
                  </div>
                  <div style={{ width: 170, position: 'relative' }}>
                    <input value={rk.owner} placeholder="Owner" onChange={(e) => setRock(i, 'owner', e.target.value)} onFocus={focusOn(accent)} onBlur={focusOff()} style={{ ...vtoStyles.input, padding: '7px 11px 7px 30px' }}/>
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
          {editing && (
            <button className="it-btn sm" style={{ alignSelf: 'flex-start', marginLeft: 32 }} onClick={addRock}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14M5 12h14"/></svg>
              Add rock
            </button>
          )}
        </div>
      </div>
    </div>
  );
}