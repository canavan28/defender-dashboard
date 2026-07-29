import { useEffect, useMemo, useState } from 'react';
import { MetricCard } from '../components/MetricCard';

// Minimal CSV parser handling quoted fields with embedded commas. No new
// npm dependency needed for a format this simple.
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (r[i] || '').trim(); });
    return obj;
  });
}

// Per-source config: column layout, what it compares against, and how to
// extract { name, devices, ...extra } rows from that vendor's CSV.
const SOURCES = {
  datto_rmm: {
    label: 'Datto RMM',
    shortLabel: 'RMM',
    deviceLabel: 'Devices',
    contractedField: 'totalContractedDevices',
    contractedLabel: 'Contracted devices',
    extractRows: (parsed) => parsed
      .filter((row) => row['Type'] === 'Managed')
      .map((row) => ({
        name: (row['PSA Company Name'] || row['Name'] || '').trim(),
        devices: parseInt(row['Devices'], 10) || 0,
      }))
      .filter((r) => r.name),
  },
  sentinelone: {
    label: 'SentinelOne',
    shortLabel: 'S1',
    deviceLabel: 'Active Agents',
    contractedField: 'totalContractedDevices',
    contractedLabel: 'Contracted devices',
    extractRows: (parsed) => parsed
      .filter((row) => row['Type'] === 'Paid' && row['Status'] === 'Active')
      .map((row) => ({
        name: (row['Site Name'] || '').trim(),
        devices: parseInt(row['Active Agents'], 10) || 0,
        vigilance: (row['Add-ons'] || '').includes('Vigilance'),
      }))
      .filter((r) => r.name),
  },
  saas_protect: {
    label: 'SaaS Protect',
    shortLabel: 'SaaS Protect',
    deviceLabel: 'Current Usage',
    contractedField: 'totalContractedUsers',
    contractedLabel: 'Contracted users',
    extractRows: (parsed) => parsed
      .map((row) => ({
        name: (row['Client Name'] || '').trim(),
        devices: parseInt(row['Current Usage'], 10) || 0,
        archivedSeats: parseInt(row['Archived Seats'], 10) || 0,
      }))
      .filter((r) => r.name),
  },
};

const SOURCE_KEYS = Object.keys(SOURCES);

function DiscrepancyCell({ consumedValue, contractedValue }) {
  if (consumedValue == null) {
    return <span className="it-mono" style={{ fontSize: 12, color: 'var(--ink4)' }}>—</span>;
  }
  const diff = consumedValue - contractedValue;
  const color = diff > 0 ? 'var(--red)' : diff < 0 ? 'var(--amber)' : 'var(--ink3)';
  return (
    <span className="it-mono" style={{ fontSize: 12, color, fontWeight: diff !== 0 ? 600 : 400 }}>
      {consumedValue}{diff !== 0 && ` (${diff > 0 ? '+' : ''}${diff})`}
    </span>
  );
}

export function LicenseAudit({ licenseAudit }) {
  const {
    contracted, companies, consumed, loading, uploading, error,
    loadContracted, loadCompanies, loadConsumed,
    uploadConsumed, mapConsumed, ignoreConsumed
  } = licenseAudit;

  const [uploadSource, setUploadSource] = useState('datto_rmm');
  const [uploadSummary, setUploadSummary] = useState(null);
  const [mappingChoice, setMappingChoice] = useState({});
  const [showReconcile, setShowReconcile] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);

  useEffect(() => {
    loadContracted();
    loadCompanies();
    SOURCE_KEYS.forEach((key) => loadConsumed(key));
  }, []);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseCSV(text);
    const rows = SOURCES[uploadSource].extractRows(parsed);
    const result = await uploadConsumed(uploadSource, rows);
    setUploadSummary(result);
    setShowReconcile(true);
    e.target.value = '';
  };

  const handleMap = async (rawName) => {
    const companyId = mappingChoice[rawName];
    if (!companyId) return;
    await mapConsumed(uploadSource, rawName, companyId);
  };

  const clients = contracted?.clients ? Object.values(contracted.clients) : [];

  // One row per client, with every source's consumed value + discrepancy
  // pre-computed, plus the Vigilance and Long Term Archive comparisons.
  const tableRows = useMemo(() => {
    return clients.map((c) => {
      const perSource = {};
      SOURCE_KEYS.forEach((key) => {
        const entry = consumed[key]?.byCompany?.[String(c.companyId)];
        const contractedValue = c[SOURCES[key].contractedField];
        perSource[key] = {
          consumedValue: entry ? entry.devices : null,
          contractedValue,
          discrepancy: entry ? entry.devices - contractedValue : null,
        };
      });

      const s1Entry = consumed.sentinelone?.byCompany?.[String(c.companyId)];
      const hasConsumedVigilance = s1Entry ? !!s1Entry.vigilance : null;
      const hasContractedVigilance = c.addons?.vigilance?.status !== 'not_present';
      const vigilanceMismatch = hasConsumedVigilance != null && hasConsumedVigilance !== hasContractedVigilance;

      const saasEntry = consumed.saas_protect?.byCompany?.[String(c.companyId)];
      const archivedSeats = saasEntry ? (saasEntry.archivedSeats || 0) : null;
      const contractedArchive = c.addons?.longTermArchive?.units || 0;
      const archiveOverage = archivedSeats != null ? archivedSeats - contractedArchive : null;

      const anyDiscrepancy = SOURCE_KEYS.some((key) => perSource[key].discrepancy)
        || vigilanceMismatch || (archiveOverage != null && archiveOverage > 0);

      return { ...c, perSource, hasConsumedVigilance, hasContractedVigilance, vigilanceMismatch, archivedSeats, contractedArchive, archiveOverage, anyDiscrepancy };
    }).sort((a, b) => (b.anyDiscrepancy ? 1 : 0) - (a.anyDiscrepancy ? 1 : 0));
  }, [clients, consumed]);

  // Overview counts, one per software type, for the top cards.
  const overageCounts = SOURCE_KEYS.reduce((acc, key) => {
    acc[key] = tableRows.filter((r) => r.perSource[key].discrepancy).length;
    return acc;
  }, {});
  const vigilanceMismatchCount = tableRows.filter((r) => r.vigilanceMismatch).length;
  const archiveOverageCount = tableRows.filter((r) => r.archiveOverage > 0).length;

  const sourceData = consumed[uploadSource] || { byCompany: {}, unmatched: [], uploadedAt: null };
  const selected = tableRows.find((r) => r.companyId === selectedCompanyId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div className="it-section-title">License Audit</div>
        <div className="it-section-sub">Contracted vs. consumed, across every tracked software source</div>
      </div>

      {error && (
        <div style={{ background: 'var(--red-soft)', border: '1px solid #fecaca', borderRadius: 10, padding: 16 }}>
          <p className="it-mono" style={{ fontSize: 12, color: 'var(--red)' }}>{error}</p>
        </div>
      )}

      {/* Overview cards — one per software type */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        {SOURCE_KEYS.map((key) => (
          <MetricCard key={key}
            eyebrow={SOURCES[key].shortLabel}
            value={overageCounts[key]}
            foot={overageCounts[key] > 0 ? 'Discrepancies' : 'All aligned'}
            footTone={overageCounts[key] > 0 ? 'neg' : 'pos'} />
        ))}
        <MetricCard eyebrow="Vigilance"
          value={vigilanceMismatchCount}
          foot={vigilanceMismatchCount > 0 ? 'Mismatched' : 'All aligned'}
          footTone={vigilanceMismatchCount > 0 ? 'neg' : 'pos'} />
        <MetricCard eyebrow="Archive"
          value={archiveOverageCount}
          foot={archiveOverageCount > 0 ? 'Likely unbilled' : 'All aligned'}
          footTone={archiveOverageCount > 0 ? 'neg' : 'pos'} />
      </div>

      {/* Upload toolbar — compact, secondary to the overview */}
      <div className="it-card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select
            value={uploadSource}
            onChange={(e) => { setUploadSource(e.target.value); setUploadSummary(null); }}
            style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 12.5, fontFamily: 'inherit' }}
          >
            {SOURCE_KEYS.map((key) => (
              <option key={key} value={key}>{SOURCES[key].label}</option>
            ))}
          </select>
          <label className="it-mono" style={{
            padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-strong)',
            background: uploading ? 'var(--slate-soft)' : 'white', cursor: uploading ? 'default' : 'pointer', fontSize: 12.5
          }}>
            {uploading ? 'Uploading…' : `Upload ${SOURCES[uploadSource].label} CSV`}
            <input type="file" accept=".csv" onChange={handleFile} disabled={uploading} style={{ display: 'none' }} />
          </label>
          {sourceData.unmatched.length > 0 && (
            <button
              onClick={() => setShowReconcile((v) => !v)}
              className="it-mono"
              style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-strong)', background: 'white', fontSize: 12.5, cursor: 'pointer' }}
            >
              {sourceData.unmatched.length} need reconciliation {showReconcile ? '▲' : '▼'}
            </button>
          )}
        </div>
        {sourceData.uploadedAt && (
          <span className="it-mono" style={{ fontSize: 11, color: 'var(--ink4)' }}>
            Last upload: {new Date(sourceData.uploadedAt).toLocaleString()}
          </span>
        )}
      </div>

      {uploadSummary && (
        <div style={{ background: 'var(--green-soft)', border: '1px solid #bbf7d0', borderRadius: 10, padding: 16 }}>
          <p style={{ fontSize: 13, color: 'var(--green)' }}>
            Upload complete — {uploadSummary.matchedCount} sites matched, {uploadSummary.unmatchedCount} need reconciliation.
          </p>
        </div>
      )}

      {showReconcile && sourceData.unmatched.length > 0 && (
        <div className="it-card" style={{ padding: 20 }}>
          <div className="it-section-title" style={{ marginBottom: 12 }}>Needs reconciliation — {SOURCES[uploadSource].label}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sourceData.unmatched.map((u) => (
              <div key={u.rawName} style={{
                display: 'grid', gridTemplateColumns: '1fr 100px 1fr auto auto',
                gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)'
              }}>
                <span style={{ fontSize: 13 }}>{u.rawName}</span>
                <span className="it-mono" style={{ fontSize: 12, color: 'var(--ink3)' }}>{u.devices}</span>
                <select
                  value={mappingChoice[u.rawName] || ''}
                  onChange={(e) => setMappingChoice((prev) => ({ ...prev, [u.rawName]: e.target.value }))}
                  style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 12.5, fontFamily: 'inherit' }}
                >
                  <option value="">Select client…</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.companyName}</option>
                  ))}
                </select>
                <button
                  onClick={() => handleMap(u.rawName)}
                  disabled={!mappingChoice[u.rawName]}
                  className="it-mono"
                  style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border-strong)', background: 'white', fontSize: 12, cursor: 'pointer' }}
                >
                  Map
                </button>
                <button
                  onClick={() => ignoreConsumed(uploadSource, u.rawName)}
                  className="it-mono"
                  style={{ padding: '6px 12px', borderRadius: 6, border: 0, background: 'none', color: 'var(--ink4)', fontSize: 12, cursor: 'pointer' }}
                >
                  Not a client
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unified spreadsheet — every client, every source, one table */}
      <div className="it-card" style={{ padding: 20, overflowX: 'auto' }}>
        <div className="it-section-title" style={{ marginBottom: 12 }}>All clients</div>
        {loading && <p className="it-mono" style={{ fontSize: 12, color: 'var(--ink4)' }}>Loading…</p>}
        {!loading && tableRows.length === 0 && (
          <p className="it-mono" style={{ fontSize: 12, color: 'var(--ink4)' }}>No contracted data yet.</p>
        )}
        {tableRows.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '0 12px 8px', fontSize: 11, color: 'var(--ink4)', fontFamily: 'var(--mono)' }}>CLIENT</th>
                <th style={{ textAlign: 'right', padding: '0 12px 8px', fontSize: 11, color: 'var(--ink4)', fontFamily: 'var(--mono)' }}>USERS</th>
                <th style={{ textAlign: 'right', padding: '0 12px 8px', fontSize: 11, color: 'var(--ink4)', fontFamily: 'var(--mono)' }}>DEVICES</th>
                {SOURCE_KEYS.map((key) => (
                  <th key={key} style={{ textAlign: 'right', padding: '0 12px 8px', fontSize: 11, color: 'var(--ink4)', fontFamily: 'var(--mono)' }}>
                    {SOURCES[key].shortLabel.toUpperCase()}
                  </th>
                ))}
                <th style={{ textAlign: 'right', padding: '0 12px 8px', fontSize: 11, color: 'var(--ink4)', fontFamily: 'var(--mono)' }}>VIGILANCE</th>
                <th style={{ textAlign: 'right', padding: '0 12px 8px', fontSize: 11, color: 'var(--ink4)', fontFamily: 'var(--mono)' }}>ARCHIVE</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => (
                <tr
                  key={row.companyId}
                  onClick={() => setSelectedCompanyId(row.companyId)}
                  style={{
                    cursor: 'pointer',
                    background: row.anyDiscrepancy ? 'var(--red-soft)' : 'transparent',
                    borderBottom: '1px solid var(--border)'
                  }}
                >
                  <td style={{ padding: '10px 12px', fontSize: 13 }}>{row.companyName}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }} className="it-mono">{row.totalContractedUsers}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }} className="it-mono">{row.totalContractedDevices}</td>
                  {SOURCE_KEYS.map((key) => (
                    <td key={key} style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <DiscrepancyCell consumedValue={row.perSource[key].consumedValue} contractedValue={row.perSource[key].contractedValue} />
                    </td>
                  ))}
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    {row.hasConsumedVigilance == null ? (
                      <span className="it-mono" style={{ fontSize: 12, color: 'var(--ink4)' }}>—</span>
                    ) : (
                      <span className="it-mono" style={{ fontSize: 12, color: row.vigilanceMismatch ? 'var(--red)' : 'var(--green)', fontWeight: row.vigilanceMismatch ? 600 : 400 }}>
                        {row.vigilanceMismatch ? 'Mismatch' : 'Aligned'}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    {row.archivedSeats == null ? (
                      <span className="it-mono" style={{ fontSize: 12, color: 'var(--ink4)' }}>—</span>
                    ) : (
                      <span className="it-mono" style={{ fontSize: 12, color: row.archiveOverage > 0 ? 'var(--red)' : 'var(--ink3)', fontWeight: row.archiveOverage > 0 ? 600 : 400 }}>
                        {row.archivedSeats}{row.archiveOverage > 0 && ` (+${row.archiveOverage})`}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Slide-out client detail panel */}
      {selected && (
        <>
          <div
            onClick={() => setSelectedCompanyId(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 40 }}
          />
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: 420, maxWidth: '90vw',
            background: 'white', boxShadow: '-4px 0 24px rgba(0,0,0,0.12)', zIndex: 50,
            padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div className="it-section-title">{selected.companyName}</div>
              <button
                onClick={() => setSelectedCompanyId(null)}
                className="it-mono"
                style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--ink4)', fontSize: 13 }}
              >
                Close
              </button>
            </div>

            <div>
              <div className="it-eyebrow" style={{ marginBottom: 8 }}>Contracted</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--ink3)' }}>Full users</span><span className="it-mono">{selected.fullUsers}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--ink3)' }}>Partial users</span><span className="it-mono">{selected.partialUsers}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--ink3)' }}>Extra devices</span><span className="it-mono">{selected.extraDevices}{selected.extraDevicesLapsed && ' (lapsed)'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--ink3)' }}>Servers</span><span className="it-mono">{selected.servers}</span>
                </div>
              </div>
            </div>

            <div>
              <div className="it-eyebrow" style={{ marginBottom: 8 }}>Consumed, by source</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {SOURCE_KEYS.map((key) => {
                  const s = selected.perSource[key];
                  return (
                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'var(--ink3)' }}>{SOURCES[key].label}</span>
                      <span className="it-mono" style={{ color: s.discrepancy ? 'var(--red)' : 'var(--ink)' }}>
                        {s.consumedValue != null ? s.consumedValue : '—'}
                        {s.discrepancy ? ` (${s.discrepancy > 0 ? '+' : ''}${s.discrepancy} vs ${s.contractedValue})` : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="it-eyebrow" style={{ marginBottom: 8 }}>Add-ons</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--ink3)' }}>Vigilance</span>
                  <span className="it-mono" style={{ color: selected.vigilanceMismatch ? 'var(--red)' : 'var(--ink)' }}>
                    {selected.hasContractedVigilance ? `Contracted (${selected.addons.vigilance.units})` : 'Not contracted'}
                    {selected.hasConsumedVigilance != null && ` · ${selected.hasConsumedVigilance ? 'Enabled in S1' : 'Not enabled in S1'}`}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--ink3)' }}>vPenTest</span>
                  <span className="it-mono">{selected.addons?.vPenTest?.units || 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--ink3)' }}>ACP</span>
                  <span className="it-mono">{selected.addons?.acp?.units || 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--ink3)' }}>Long Term Archive</span>
                  <span className="it-mono" style={{ color: selected.archiveOverage > 0 ? 'var(--red)' : 'var(--ink)' }}>
                    {selected.contractedArchive} contracted
                    {selected.archivedSeats != null && ` · ${selected.archivedSeats} archived seats`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
