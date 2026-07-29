import { useEffect, useState } from 'react';
import { MetricCard } from '../components/MetricCard';

const SOURCE = 'datto_rmm'; // first source — architecture supports more later via the same routes

// Minimal CSV parser handling quoted fields with embedded commas, matching
// the RMM export format (and standard CSV in general). No new npm
// dependency needed for a format this simple.
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

// Datto RMM export specific: prefer the pre-existing PSA Company Name link
// (confirmed to exact-match AutoTask company names), fall back to the raw
// site Name if that's blank — which will usually end up unmatched and need
// manual reconciliation, but at least preserves something recognizable.
function extractRmmRows(parsedCsv) {
  return parsedCsv
    .map((row) => ({
      name: (row['PSA Company Name'] || row['Name'] || '').trim(),
      devices: parseInt(row['Devices'], 10) || 0,
    }))
    .filter((r) => r.name);
}

export function LicenseAudit({ licenseAudit }) {
  const {
    contracted, companies, consumed, loading, uploading, error,
    loadContracted, loadCompanies, loadConsumed,
    uploadConsumed, mapConsumed, ignoreConsumed
  } = licenseAudit;

  const [uploadSummary, setUploadSummary] = useState(null);
  const [mappingChoice, setMappingChoice] = useState({}); // { [rawName]: companyId }

  useEffect(() => {
    loadContracted();
    loadCompanies();
    loadConsumed(SOURCE);
  }, []);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseCSV(text);
    const rows = extractRmmRows(parsed);
    const result = await uploadConsumed(SOURCE, rows);
    setUploadSummary(result);
    e.target.value = ''; // allow re-uploading the same file if needed
  };

  const sourceData = consumed[SOURCE] || { byCompany: {}, unmatched: [], uploadedAt: null };

  const handleMap = async (rawName) => {
    const companyId = mappingChoice[rawName];
    if (!companyId) return;
    await mapConsumed(SOURCE, rawName, companyId);
  };

  const clients = contracted?.clients ? Object.values(contracted.clients) : [];
  const comparisonRows = clients.map((c) => {
    const consumedEntry = sourceData.byCompany[String(c.companyId)];
    const consumedDevices = consumedEntry ? consumedEntry.devices : null;
    const discrepancy = consumedDevices != null ? consumedDevices - c.totalContractedDevices : null;
    return { ...c, consumedDevices, discrepancy };
  }).sort((a, b) => {
    // Overages first (largest positive discrepancy), then no-data rows last
    if (a.discrepancy == null && b.discrepancy == null) return 0;
    if (a.discrepancy == null) return 1;
    if (b.discrepancy == null) return -1;
    return b.discrepancy - a.discrepancy;
  });

  const overageCount = comparisonRows.filter((r) => r.discrepancy != null && r.discrepancy !== 0).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="it-section-title">License Audit</div>
          <div className="it-section-sub">Contracted vs. consumed devices — starting with Datto RMM</div>
        </div>
        <label className="it-mono" style={{
          padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-strong)',
          background: uploading ? 'var(--slate-soft)' : 'white', cursor: uploading ? 'default' : 'pointer', fontSize: 12.5
        }}>
          {uploading ? 'Uploading…' : 'Upload Datto RMM CSV'}
          <input type="file" accept=".csv" onChange={handleFile} disabled={uploading} style={{ display: 'none' }} />
        </label>
      </div>

      {error && (
        <div style={{ background: 'var(--red-soft)', border: '1px solid #fecaca', borderRadius: 10, padding: 16 }}>
          <p className="it-mono" style={{ fontSize: 12, color: 'var(--red)' }}>{error}</p>
        </div>
      )}

      {uploadSummary && (
        <div style={{ background: 'var(--green-soft)', border: '1px solid #bbf7d0', borderRadius: 10, padding: 16 }}>
          <p style={{ fontSize: 13, color: 'var(--green)' }}>
            Upload complete — {uploadSummary.matchedCount} sites matched, {uploadSummary.unmatchedCount} need reconciliation below.
          </p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <MetricCard eyebrow="Clients with a discrepancy"
          value={overageCount}
          foot={overageCount > 0 ? 'Consumed ≠ contracted' : 'All matched clients aligned'}
          footTone={overageCount > 0 ? 'neg' : 'pos'} />
        <MetricCard eyebrow="Sites needing reconciliation"
          value={sourceData.unmatched.length}
          foot="No automatic name match" />
        <MetricCard eyebrow="Last upload"
          value={sourceData.uploadedAt ? new Date(sourceData.uploadedAt).toLocaleDateString() : '—'}
          foot={sourceData.uploadedAt ? new Date(sourceData.uploadedAt).toLocaleTimeString() : 'No upload yet'} />
      </div>

      {sourceData.unmatched.length > 0 && (
        <div className="it-card" style={{ padding: 20 }}>
          <div className="it-section-title" style={{ marginBottom: 12 }}>Needs reconciliation</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sourceData.unmatched.map((u) => (
              <div key={u.rawName} style={{
                display: 'grid', gridTemplateColumns: '1fr 80px 1fr auto auto',
                gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)'
              }}>
                <span style={{ fontSize: 13 }}>{u.rawName}</span>
                <span className="it-mono" style={{ fontSize: 12, color: 'var(--ink3)' }}>{u.devices} devices</span>
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
                  onClick={() => ignoreConsumed(SOURCE, u.rawName)}
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

      <div className="it-card" style={{ padding: 20 }}>
        <div className="it-section-title" style={{ marginBottom: 12 }}>Contracted vs. consumed devices</div>
        {loading && <p className="it-mono" style={{ fontSize: 12, color: 'var(--ink4)' }}>Loading…</p>}
        {!loading && comparisonRows.length === 0 && (
          <p className="it-mono" style={{ fontSize: 12, color: 'var(--ink4)' }}>No contracted data yet.</p>
        )}
        {comparisonRows.length > 0 && (
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 100px 100px 100px',
            gap: 10, padding: '0 12px 6px', borderBottom: '1px solid var(--border)', marginBottom: 4
          }}>
            <span className="it-mono" style={{ fontSize: 11, color: 'var(--ink4)' }}>CLIENT</span>
            <span className="it-mono" style={{ fontSize: 11, color: 'var(--ink4)', textAlign: 'right' }}>CONTRACTED</span>
            <span className="it-mono" style={{ fontSize: 11, color: 'var(--ink4)', textAlign: 'right' }}>CONSUMED</span>
            <span className="it-mono" style={{ fontSize: 11, color: 'var(--ink4)', textAlign: 'right' }}>DIFF</span>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {comparisonRows.map((row) => (
            <div key={row.companyId} style={{
              display: 'grid', gridTemplateColumns: '2fr 100px 100px 100px',
              gap: 10, alignItems: 'center', padding: '8px 12px',
              background: row.discrepancy ? 'var(--red-soft)' : 'transparent', borderRadius: 6
            }}>
              <span style={{ fontSize: 13 }}>{row.companyName}</span>
              <span className="it-mono" style={{ fontSize: 12, textAlign: 'right' }}>{row.totalContractedDevices}</span>
              <span className="it-mono" style={{ fontSize: 12, textAlign: 'right', color: 'var(--ink3)' }}>
                {row.consumedDevices != null ? row.consumedDevices : '—'}
              </span>
              <span className="it-mono" style={{
                fontSize: 12, textAlign: 'right', fontWeight: 600,
                color: row.discrepancy > 0 ? 'var(--red)' : row.discrepancy < 0 ? 'var(--amber)' : 'var(--ink4)'
              }}>
                {row.discrepancy != null ? (row.discrepancy > 0 ? `+${row.discrepancy}` : row.discrepancy) : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
