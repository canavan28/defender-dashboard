import { useEffect, useState } from 'react';
import { MetricCard } from '../components/MetricCard';
import { CS_SCORE_THRESHOLD } from '../hooks/useCustomerSuccess';

const EVENT_TYPE_OPTIONS = [
  { value: 'google_review',     label: 'Google review',      defaultDelta: 2 },
  { value: 'positive_tbr',      label: 'Positive TBR',       defaultDelta: 2 },
  { value: 'negative_tbr',      label: 'Negative TBR',       defaultDelta: -2 },
  { value: 'manual_adjustment', label: 'Manual adjustment',  defaultDelta: 0 }
];

const SYSTEM_EVENT_LABELS = {
  sla_breach: 'SLA breach',
  autotask_review: 'AutoTask survey'
};

function scoreColor(score) {
  return score < CS_SCORE_THRESHOLD ? 'var(--red)' : 'var(--green)';
}

function formatEventLabel(evt) {
  if (evt.type === 'sla_breach') return SYSTEM_EVENT_LABELS.sla_breach;
  if (evt.type === 'autotask_review') {
    const rating = evt.source?.rating;
    return `AutoTask survey${rating != null ? ` (${rating}★)` : ''}`;
  }
  const opt = EVENT_TYPE_OPTIONS.find(o => o.value === evt.type);
  return opt ? opt.label : evt.type;
}

export function CustomerSuccess({ cs }) {
  const {
    scores, client, loading, saving, syncing, syncErrors, error,
    loadScores, openClient, closeClient, addEvent, deleteEvent, runSync
  } = cs;

  const [selectedId, setSelectedId] = useState(null);
  const [companyNameDraft, setCompanyNameDraft] = useState('');
  const [formType, setFormType] = useState(EVENT_TYPE_OPTIONS[0].value);
  const [formDelta, setFormDelta] = useState(EVENT_TYPE_OPTIONS[0].defaultDelta);
  const [formNote, setFormNote] = useState('');
  const [formErr, setFormErr] = useState(null);

  useEffect(() => { loadScores(); }, []);

  useEffect(() => {
    if (client) setCompanyNameDraft(client.companyName || '');
  }, [client?.companyId]);

  const sortedScores = [...scores].sort((a, b) => a.score - b.score);
  const belowThreshold = scores.filter(c => c.score < CS_SCORE_THRESHOLD).length;
  const avgScore = scores.length
    ? (scores.reduce((s, c) => s + c.score, 0) / scores.length).toFixed(1)
    : '—';

  const handleSelect = (companyId) => {
    setSelectedId(companyId);
    openClient(companyId);
  };

  const handleTypeChange = (value) => {
    setFormType(value);
    const opt = EVENT_TYPE_OPTIONS.find(o => o.value === value);
    setFormDelta(opt ? opt.defaultDelta : 0);
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    setFormErr(null);
    if (!formNote.trim()) {
      setFormErr('A note is required for manual entries.');
      return;
    }
    const deltaNum = Number(formDelta);
    if (Number.isNaN(deltaNum)) {
      setFormErr('Delta must be a number.');
      return;
    }
    try {
      await addEvent(selectedId, {
        type: formType,
        delta: deltaNum,
        note: formNote.trim(),
        companyName: companyNameDraft.trim() || undefined
      });
      setFormNote('');
    } catch (err) {
      setFormErr(err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="it-section-title">Customer Success</div>
          <div className="it-section-sub">Scores start at 10 · below {CS_SCORE_THRESHOLD} is flagged</div>
        </div>
        <button
          onClick={runSync}
          disabled={syncing}
          className="it-mono"
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: '1px solid var(--border-strong)',
            background: syncing ? 'var(--slate-soft)' : 'white',
            color: 'var(--ink)',
            fontSize: 12.5,
            cursor: syncing ? 'default' : 'pointer'
          }}
        >
          {syncing ? 'Syncing…' : 'Sync now'}
        </button>
      </div>

      {syncErrors.length > 0 && (
        <div style={{
          background: 'var(--red-soft)', border: '1px solid #fecaca',
          borderRadius: 10, padding: 16
        }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--red)', marginBottom: 4 }}>
            Sync completed with errors
          </p>
          {syncErrors.map((e, i) => (
            <p key={i} className="it-mono" style={{ fontSize: 12, color: 'var(--ink3)' }}>
              {e.step}: {e.message}
            </p>
          ))}
        </div>
      )}

      {error && (
        <div style={{
          background: 'var(--red-soft)', border: '1px solid #fecaca',
          borderRadius: 10, padding: 16
        }}>
          <p className="it-mono" style={{ fontSize: 12, color: 'var(--red)' }}>{error}</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <MetricCard eyebrow="Clients below threshold"
          value={belowThreshold}
          foot={belowThreshold > 0 ? 'Needs attention' : 'All clear'}
          footTone={belowThreshold > 0 ? 'neg' : 'pos'} />
        <MetricCard eyebrow="Average score"
          value={avgScore}
          foot="Across all tracked clients" />
        <MetricCard eyebrow="Clients tracked"
          value={scores.length}
          foot="With at least one score event" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedId ? '1fr 1fr' : '1fr', gap: 16 }}>
        <div className="it-card" style={{ padding: 20 }}>
          <div className="it-section-title" style={{ marginBottom: 12 }}>Client scores</div>
          {loading && scores.length === 0 && (
            <p className="it-mono" style={{ fontSize: 12, color: 'var(--ink4)' }}>Loading…</p>
          )}
          {!loading && sortedScores.length === 0 && (
            <p className="it-mono" style={{ fontSize: 12, color: 'var(--ink4)' }}>
              No score data yet — run a sync to pull in SLA breaches and AutoTask surveys.
            </p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {sortedScores.map(c => (
              <button
                key={c.companyId}
                onClick={() => handleSelect(c.companyId)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 12px', borderRadius: 8,
                  border: '1px solid transparent',
                  background: selectedId === c.companyId ? 'var(--blue-soft, #eaf2fb)' : 'transparent',
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit'
                }}
              >
                <span style={{ fontSize: 13.5, color: 'var(--ink)' }}>
                  {c.companyName || `Company #${c.companyId}`}
                </span>
                <span className="it-mono" style={{ fontSize: 13, fontWeight: 600, color: scoreColor(c.score) }}>
                  {c.score}
                </span>
              </button>
            ))}
          </div>
        </div>

        {selectedId && (
          <div className="it-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div className="it-section-title">
                  {client?.companyName || `Company #${selectedId}`}
                </div>
                <div className="it-section-sub">
                  Score: <span style={{ color: client ? scoreColor(client.score) : 'var(--ink3)', fontWeight: 600 }}>
                    {client?.score ?? '—'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => { setSelectedId(null); closeClient(); }}
                className="it-mono"
                style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--ink4)', fontSize: 12 }}
              >
                Close
              </button>
            </div>

            {loading && !client && (
              <p className="it-mono" style={{ fontSize: 12, color: 'var(--ink4)' }}>Loading…</p>
            )}

            {client && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label className="it-eyebrow" style={{ display: 'block', marginBottom: 4 }}>
                    Company name
                  </label>
                  <input
                    value={companyNameDraft}
                    onChange={e => setCompanyNameDraft(e.target.value)}
                    placeholder="Set a display name for this client"
                    style={{
                      width: '100%', padding: '7px 10px', borderRadius: 6,
                      border: '1px solid var(--border-strong)', fontSize: 13, fontFamily: 'inherit'
                    }}
                  />
                </div>

                <div style={{ marginBottom: 16, maxHeight: 260, overflowY: 'auto' }}>
                  {client.events.length === 0 && (
                    <p className="it-mono" style={{ fontSize: 12, color: 'var(--ink4)' }}>
                      No events yet for this client.
                    </p>
                  )}
                  {[...client.events].reverse().map(evt => (
                    <div key={evt.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                      padding: '8px 0', borderBottom: '1px solid var(--border)'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: 'var(--ink)' }}>
                          {formatEventLabel(evt)}
                          <span className="it-mono" style={{ marginLeft: 8, fontSize: 12, color: evt.delta < 0 ? 'var(--red)' : 'var(--green)' }}>
                            {evt.delta > 0 ? '+' : ''}{evt.delta}
                          </span>
                        </div>
                        {evt.note && (
                          <div className="it-mono" style={{ fontSize: 11.5, color: 'var(--ink4)', marginTop: 2 }}>
                            {evt.note}
                          </div>
                        )}
                        <div className="it-mono" style={{ fontSize: 10.5, color: 'var(--ink4)', marginTop: 2 }}>
                          {new Date(evt.date).toLocaleDateString()}
                          {evt.enteredBy ? ' · manual entry' : ' · system'}
                        </div>
                      </div>
                      {evt.enteredBy !== null && (
                        <button
                          onClick={() => deleteEvent(selectedId, evt.id)}
                          disabled={saving}
                          className="it-mono"
                          style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--red)', fontSize: 11, marginLeft: 8 }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddEvent} style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                  <div className="it-eyebrow" style={{ marginBottom: 8 }}>Add manual entry</div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <select
                      value={formType}
                      onChange={e => handleTypeChange(e.target.value)}
                      style={{ flex: 2, padding: '7px 8px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 13, fontFamily: 'inherit' }}
                    >
                      {EVENT_TYPE_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="1"
                      value={formDelta}
                      onChange={e => setFormDelta(e.target.value)}
                      style={{ flex: 1, padding: '7px 8px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 13, fontFamily: 'inherit' }}
                    />
                  </div>
                  <textarea
                    value={formNote}
                    onChange={e => setFormNote(e.target.value)}
                    placeholder="Note (required) — what happened?"
                    rows={2}
                    style={{ width: '100%', padding: '7px 8px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 13, fontFamily: 'inherit', marginBottom: 8, resize: 'vertical' }}
                  />
                  {formErr && (
                    <p className="it-mono" style={{ fontSize: 11.5, color: 'var(--red)', marginBottom: 8 }}>{formErr}</p>
                  )}
                  <button
                    type="submit"
                    disabled={saving}
                    className="it-mono"
                    style={{
                      padding: '7px 14px', borderRadius: 6, border: '1px solid var(--border-strong)',
                      background: saving ? 'var(--slate-soft)' : 'white', cursor: saving ? 'default' : 'pointer', fontSize: 12.5
                    }}
                  >
                    {saving ? 'Saving…' : 'Add entry'}
                  </button>
                </form>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
