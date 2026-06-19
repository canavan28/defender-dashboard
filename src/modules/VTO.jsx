// VTO.jsx — owner-only Vision/Traction Organizer tab.
// Two views: history (landing) and the form (read-only or editable,
// autosaving per field while in draft, locked once finalized).

import React, { useEffect, useState } from 'react';
import { useVTO } from '../hooks/useVTO';
import {
  IT, VTO, VTOIcon,
  CoreValuesBody, CoreFocusBody, MarketingBody, TargetBody,
  CurrentBody, TwoYearBody, ThreeYearBody, OneYearBody, IssuesBody, RocksBody,
} from './VTOSections';

// ---- Section registry (drives BOTH the jump-nav and the form order) ----
const VTO_SECTIONS = [
  { id: 'core-values', n: 1,  title: 'Core Values',        zone: 'vision',   icon: 'values',    hint: 'The handful of behaviors that define who we are. Rarely change year to year.',   Body: CoreValuesBody },
  { id: 'core-focus',  n: 2,  title: 'Core Focus',         zone: 'vision',   icon: 'focus',     hint: 'Our purpose and the niche we commit to — the filter for every decision.',         Body: CoreFocusBody },
  { id: 'marketing',   n: 3,  title: 'Marketing Strategy', zone: 'vision',   icon: 'marketing', hint: 'Who we serve and why they choose us.',                                            Body: MarketingBody },
  { id: 'current',     n: 4,  title: 'Current Situation',  zone: 'vision',   icon: 'current',   hint: 'Where we are today — the honest baseline we re-assess each year.',                 Body: CurrentBody },
  { id: 'one-year',    n: 5,  title: '1-Year Plan',        zone: 'traction', icon: 'oneYear',   hint: "This year's destination and the goals that get us there.",                        Body: OneYearBody },
  { id: 'issues',      n: 6,  title: 'Issues List',        zone: 'traction', icon: 'issues',    hint: "Everything in the way — capture freely now, prioritize and solve later.",         Body: IssuesBody },
  { id: 'rocks',       n: 7,  title: 'Rocks',              zone: 'traction', icon: 'rocks',     hint: 'The 3–7 priorities for the quarter, each with a single owner.',                   Body: RocksBody },
  { id: 'two-year',    n: 8,  title: '2-Year Journey',     zone: 'vision',   icon: 'twoYear',   hint: 'A nearer-term milestone between today and the 3-Year Picture.',                   Body: TwoYearBody },
  { id: 'three-year',  n: 9,  title: '3-Year Picture',     zone: 'vision',   icon: 'threeYear', hint: 'A vivid snapshot of the business three years out.',                               Body: ThreeYearBody },
  { id: 'five-year',   n: 10, title: '5-Year Target',      zone: 'vision',   icon: 'fiveYear',  hint: 'Where we want to be in five years.',                                              Body: TargetBody('fiveYear') },
  { id: 'ten-year',    n: 11, title: '10-Year Target',     zone: 'vision',   icon: 'tenYear',   hint: 'The long-term BHAG that pulls everything forward.',                               Body: TargetBody('tenYear') },
];

const zoneAccent = (zone) => zone === 'traction' ? VTO.traction : VTO.vision;
const zoneSoft   = (zone) => zone === 'traction' ? VTO.tractionSoft : VTO.visionSoft;

function VTOSection({ sec, children }) {
  const accent = zoneAccent(sec.zone);
  const soft = zoneSoft(sec.zone);
  return (
    <div data-vto-section={sec.id} className="vto-card" style={{ scrollMarginTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13, padding: '16px 20px 14px', borderBottom: `1px solid ${VTO.cardBorder}`, background: `linear-gradient(180deg, ${soft}, #fffdfb)` }}>
        <span style={{ flexShrink: 0, width: 38, height: 38, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', border: `1px solid ${accent}33`, color: accent }}>
          <VTOIcon name={sec.icon} size={19} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ fontFamily: IT.mono, fontSize: 11, fontWeight: 600, color: accent }}>{String(sec.n).padStart(2, '0')}</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: IT.ink, letterSpacing: '-0.01em' }}>{sec.title}</span>
            <span style={{ fontSize: 10, fontFamily: IT.mono, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: accent, background: '#fff', border: `1px solid ${accent}33`, padding: '2px 7px', borderRadius: 999 }}>
              {sec.zone}
            </span>
          </div>
          <div style={{ fontSize: 12.5, color: IT.ink3, marginTop: 3, lineHeight: 1.45 }}>{sec.hint}</div>
        </div>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

function VTOHistory({ history, loading, latestLabel, onOpen, onCreate }) {
  return (
    <div style={{ maxWidth: 940, margin: '0 auto', paddingBottom: 8 }}>
      <div style={{ borderRadius: 16, padding: '26px 28px', marginBottom: 20, position: 'relative', overflow: 'hidden',
        background: `linear-gradient(135deg, ${VTO.warmSoft} 0%, #fffdfb 60%)`, border: `1px solid ${VTO.paperEdge}` }}>
        <div style={{ position: 'absolute', right: -30, top: -30, width: 150, height: 150, borderRadius: '50%', background: `${VTO.warm}14` }}></div>
        <div style={{ position: 'relative' }}>
          <div style={{ fontFamily: IT.mono, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: VTO.warm, fontWeight: 600 }}>Owners' Workspace</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: IT.ink, marginTop: 6, letterSpacing: '-0.02em' }}>Vision / Traction Organizer</div>
          <div style={{ fontSize: 14, color: IT.ink2, marginTop: 6, maxWidth: 560, lineHeight: 1.55 }}>
            Where we're headed and how we'll get there — together. Browse a past year, or start this year's plan and fill it in side by side during the retreat.
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontFamily: IT.mono, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: IT.ink3 }}>Past plans</div>
        <button className="vto-cta" onClick={onCreate}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M12 5v14M5 12h14"/></svg>
          Create New VTO
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: IT.ink3, fontSize: 13.5 }}>Loading VTOs…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <button onClick={onCreate} className="vto-newcard">
            <span style={{ width: 42, height: 42, borderRadius: 12, background: VTO.warmSoft, color: VTO.warm, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14M5 12h14"/></svg>
            </span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: IT.ink }}>Start this year's VTO</div>
              <div style={{ fontSize: 12.5, color: IT.ink3, marginTop: 2 }}>
                {latestLabel ? `Pre-filled from ${latestLabel} where things rarely change` : 'Starts from a blank plan'}
              </div>
            </div>
          </button>

          {history.map((vto) => (
            <button key={vto.id} onClick={() => onOpen(vto.id)} className="vto-yearcard">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontFamily: IT.mono, fontSize: 26, fontWeight: 500, color: IT.ink, letterSpacing: '-0.01em' }}>{vto.year}</div>
                {vto.status === 'final'
                  ? <span style={{ fontSize: 11, fontFamily: IT.mono, color: '#2c6a4c', background: VTO.tractionSoft, padding: '3px 10px', borderRadius: 999 }}>Final</span>
                  : <span style={{ fontSize: 11, fontFamily: IT.mono, color: IT.amber, background: IT.amberSoft, padding: '3px 10px', borderRadius: 999 }}>Draft</span>}
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: IT.ink, marginTop: 10 }}>{vto.label}</div>
              <div style={{ fontSize: 12, color: IT.ink3, marginTop: 3 }}>
                {vto.coreValuesCount} core values · {vto.rocksCount} rocks · {vto.issuesCount} issues
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTop: `1px solid ${VTO.cardBorder}` }}>
                <span style={{ fontFamily: IT.mono, fontSize: 11.5, color: IT.ink4 }}>{vto.savedDate ? `Saved ${vto.savedDate}` : 'In progress'}</span>
                <span style={{ fontSize: 12.5, color: VTO.vision, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Open
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M9 6l6 6-6 6"/></svg>
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function VTOForm({ vto, editing, setEditing, up, onBack, onFinalize, onUnlock, isNew, saving, authorName }) {
  const scrollTo = (id) => {
    const root = document.querySelector('[data-vto-scroll]');
    const el = document.querySelector(`[data-vto-section="${id}"]`);
    if (root && el) root.scrollTo({ top: el.offsetTop - 12, behavior: 'smooth' });
  };

  const isFinal = vto.status === 'final';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <style>{`
        @media print {
          body > * { display: none !important; }
          [data-vto-printable] { display: block !important; }
          [data-vto-printable] .vto-no-print { display: none !important; }
          [data-vto-printable] [data-vto-scroll] { overflow: visible !important; max-height: none !important; }
          [data-vto-printable] .vto-panel { border: none !important; padding: 0 !important; }
          [data-vto-printable] .vto-card { break-inside: avoid; box-shadow: none !important; }
        }
      `}</style>
      <div className="vto-no-print" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '0 4px 14px', borderBottom: `1px solid ${VTO.cardBorder}`, marginBottom: 14 }}>
        <button className="it-btn ghost" onClick={onBack}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M15 18l-6-6 6-6"/></svg>
          History
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 17, fontWeight: 700, color: IT.ink }}>{vto.label}</span>
            {isFinal
              ? <span style={{ fontSize: 11.5, fontFamily: IT.mono, color: '#2c6a4c', background: VTO.tractionSoft, padding: '2px 9px', borderRadius: 999 }}>Final</span>
              : <span style={{ fontSize: 11.5, fontFamily: IT.mono, color: IT.amber, background: IT.amberSoft, padding: '2px 9px', borderRadius: 999 }}>Draft</span>}
            {editing && <span style={{ fontSize: 11.5, fontFamily: IT.mono, color: VTO.warm, background: VTO.warmSoft, padding: '2px 9px', borderRadius: 999 }}>Editing</span>}
            {saving && <span style={{ fontSize: 11.5, fontFamily: IT.mono, color: IT.ink3 }}>Saving…</span>}
          </div>
          <div style={{ fontFamily: IT.mono, fontSize: 11.5, color: IT.ink3, marginTop: 3 }}>
            {isNew ? 'New · pre-filled where evergreen' : (vto.savedDate ? `Saved ${vto.savedDate} · ${vto.authoredBy}` : 'In progress · autosaving')}
          </div>
        </div>
        {!editing && (
          <button className="it-btn ghost" onClick={() => window.print()} title="Save as PDF via browser print dialog">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/></svg>
            Save as PDF
          </button>
        )}
        {isFinal ? (
          <button className="it-btn" onClick={onUnlock}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/></svg>
            Unlock to edit
          </button>
        ) : editing ? (
          <button className="vto-cta" onClick={() => onFinalize(authorName)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12l5 5L20 7"/></svg>
            Finalize VTO
          </button>
        ) : (
          <button className="vto-cta" onClick={() => setEditing(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            Edit
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20, flex: 1, minHeight: 0 }}>
        <div style={{ overflow: 'auto' }}>
          <div style={{ position: 'sticky', top: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ fontFamily: IT.mono, fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: IT.ink4, fontWeight: 600, padding: '4px 10px 6px' }}>Working order</div>
            {VTO_SECTIONS.map(s => {
              const accent = zoneAccent(s.zone);
              return (
                <button key={s.id} onClick={() => scrollTo(s.id)} className="vto-navlink">
                  <span style={{ fontFamily: IT.mono, width: 18, textAlign: 'right', fontSize: 11, color: IT.ink4, flexShrink: 0 }}>{s.n}</span>
                  <span style={{ width: 7, height: 7, borderRadius: 999, background: accent, flexShrink: 0 }}></span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
                </button>
              );
            })}
            <div style={{ display: 'flex', gap: 12, padding: '12px 10px 0', borderTop: `1px solid ${VTO.cardBorder}`, marginTop: 8 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: IT.ink3 }}><span style={{ width: 7, height: 7, borderRadius: 999, background: VTO.vision }}></span>Vision</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: IT.ink3 }}><span style={{ width: 7, height: 7, borderRadius: 999, background: VTO.traction }}></span>Traction</span>
            </div>
          </div>
        </div>

        <div data-vto-scroll style={{ overflow: 'auto', paddingRight: 6, paddingBottom: 44 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {VTO_SECTIONS.map(sec => {
              const Body = sec.Body;
              const sectionEditing = editing && !isFinal;
              return (
                <VTOSection key={sec.id} sec={sec}>
                  <Body doc={vto} editing={sectionEditing} up={up} />
                </VTOSection>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function VTOTab({ getToken, currentUserName }) {
  const {
    history, doc, loading, saving, error,
    loadHistory, openVto, createNew, up, finalize, unlock,
  } = useVTO(getToken);

  const [view, setView] = useState('list');
  const [editing, setEditing] = useState(false);
  const [isNew, setIsNew] = useState(false);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const openYear = async (id) => {
    await openVto(id);
    setIsNew(false);
    setEditing(false);
    setView('form');
  };

  const createYear = async () => {
    const nextYear = new Date().getFullYear();
    try {
      await createNew(nextYear);
      setIsNew(true);
      setEditing(true);
      setView('form');
    } catch {
      // error surfaced via the hook's `error` state; stay on history view
    }
  };

  const back = async () => {
    setView('list');
    setEditing(false);
    await loadHistory();
  };

  const handleFinalize = async (authorName) => {
    await finalize(authorName);
    setEditing(false);
  };

  const latestLabel = history[0]?.label;

  return (
    <div data-vto-printable style={{ height: '100%', minHeight: 0 }}>
      <style>{`
        .vto-panel { height: 100%; min-height: 0; display: flex; flex-direction: column;
          background: ${VTO.paper}; border: 1px solid ${VTO.paperEdge}; border-radius: 16px; padding: 22px; }
        .vto-card { background: #fffdfb; border: 1px solid ${VTO.cardBorder}; border-radius: 14px; overflow: hidden;
          box-shadow: 0 1px 2px rgba(90,70,45,.04), 0 6px 16px rgba(90,70,45,.025); }
        .vto-navlink { text-align: left; appearance: none; border: 0; background: none; cursor: pointer;
          font-family: ${IT.font}; font-size: 13px; color: ${IT.ink2}; display: flex; align-items: center; gap: 9px;
          padding: 6px 10px; border-radius: 8px; transition: background .12s, color .12s; width: 100%; }
        .vto-navlink:hover { background: #fff; color: ${IT.ink}; box-shadow: 0 1px 2px rgba(90,70,45,.05); }
        .vto-cta { appearance: none; cursor: pointer; font-family: ${IT.font}; display: inline-flex; align-items: center; gap: 8px;
          padding: 9px 16px; border-radius: 9px; font-size: 13.5px; font-weight: 600; color: #fff;
          background: ${VTO.warm}; border: 1px solid ${VTO.warm}; transition: background .12s, transform .05s; box-shadow: 0 1px 2px rgba(140,70,30,.18); }
        .vto-cta:hover { background: #b25c30; border-color: #b25c30; }
        .vto-cta:active { transform: translateY(.5px); }
        .vto-newcard { appearance: none; cursor: pointer; text-align: left; display: flex; align-items: center; gap: 14px;
          padding: 20px; border-radius: 14px; background: #fffdfb; border: 1.5px dashed ${VTO.warm}66;
          transition: background .12s, border-color .12s; font-family: ${IT.font}; }
        .vto-newcard:hover { background: ${VTO.warmSoft}; border-color: ${VTO.warm}; }
        .vto-yearcard { appearance: none; cursor: pointer; text-align: left; display: block; width: 100%;
          padding: 20px; border-radius: 14px; background: #fffdfb; border: 1px solid ${VTO.cardBorder};
          transition: box-shadow .14s, transform .06s, border-color .12s; font-family: ${IT.font}; }
        .vto-yearcard:hover { box-shadow: 0 6px 20px rgba(90,70,45,.10); border-color: ${VTO.vision}55; transform: translateY(-1px); }
        .vto-iconbtn { flex-shrink: 0; width: 28px; height: 28px; border-radius: 7px; cursor: pointer;
          border: 1px solid ${VTO.cardBorder}; background: #fff; color: ${IT.ink4};
          display: flex; align-items: center; justify-content: center; transition: background .12s, color .12s, border-color .12s; }
        .vto-iconbtn-del:hover { background: ${IT.redSoft}; color: ${IT.red}; border-color: #f0c8c8; }
      `}</style>
      <div className="vto-panel">
        {error && (
          <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 9, background: IT.redSoft, color: IT.red, fontSize: 13 }}>
            {error}
          </div>
        )}
        {view === 'list'
          ? <div style={{ overflow: 'auto', flex: 1, minHeight: 0, padding: '2px' }}>
              <VTOHistory history={history} loading={loading} latestLabel={latestLabel} onOpen={openYear} onCreate={createYear} />
            </div>
          : (doc && (
              <VTOForm
                vto={doc}
                editing={editing}
                setEditing={setEditing}
                up={up}
                onBack={back}
                onFinalize={handleFinalize}
                onUnlock={unlock}
                isNew={isNew}
                saving={saving}
                authorName={currentUserName}
              />
            ))
        }
      </div>
    </div>
  );
}
