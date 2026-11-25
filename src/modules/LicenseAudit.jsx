import { useEffect, useMemo, useState } from 'react';

// Minimal CSV parser handling quoted fields with embedded commas. No new
// npm dependency needed for a format this simple. Returns raw row arrays —
// parseCSV() below maps row 0 as headers (the normal case); some exports
// (SaaS Alerts) need the header row found dynamically instead, since it's
// buried under junk title rows from a copy-paste export.
function parseCSVRows(text) {
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
  return rows;
}

function parseCSV(text) {
  const rows = parseCSVRows(text);
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (r[i] || '').trim(); });
    return obj;
  });
}

// For messy copy-pasted exports where the real header row isn't row 0 —
// finds the first row whose first cell matches headerMarker, then maps
// every row after it using that row as headers.
function parseCSVDynamicHeader(text, headerMarker) {
  const rows = parseCSVRows(text);
  const headerIdx = rows.findIndex((r) => (r[0] || '').trim() === headerMarker);
  if (headerIdx === -1) return [];
  const headers = rows[headerIdx].map((h) => h.trim());
  return rows.slice(headerIdx + 1).map((r) => {
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
  knowbe4: {
    label: 'KnowBe4',
    shortLabel: 'KB4',
    deviceLabel: 'Users',
    contractedField: 'totalContractedUsers',
    contractedLabel: 'Contracted users',
    extractRows: (parsed) => parsed
      .filter((row) => row['Billing Type'] === 'Paid') // excludes InfoTank's own "Diamond" internal tier row
      .map((row) => ({
        name: (row['Organization'] || '').trim(),
        devices: parseInt(row['Users'], 10) || 0,
      }))
      .filter((r) => r.name),
  },
  // SaaS Alerts is NOT compared against the base user/device count — its
  // client-facing name is Account Compromise Protection (already a tracked
  // add-on, service 98), so this compares Billable Users against
  // addons.acp.units instead. Handled as its own dedicated section below,
  // not a main spreadsheet column — see MAIN_TABLE_KEYS.
  saas_alerts: {
    label: 'SaaS Alerts',
    shortLabel: 'SaaS Alerts',
    deviceLabel: 'Billable Users',
    // Real header row is buried under junk title rows from a copy-paste
    // export — find it dynamically rather than assuming row 0.
    useDynamicHeader: true,
    dynamicHeaderMarker: 'Organization',
    extractRows: (parsed) => parsed
      .filter((row) => row['Status'] === 'Active')
      .map((row) => ({
        // Strips both known label-suffix variants this export uses
        // inconsistently — neither reliably indicates paying status,
        // that's determined from our own contracted ACP data instead.
        name: (row['Organization'] || '')
          .replace(/\s*\(Account Compromise Protection\)\s*/, '')
          .replace(/\s*\(Declined SaaS Alerts\)\s*/, '')
          .trim(),
        devices: parseInt(row['Billable Users'], 10) || 0,
      }))
      .filter((r) => r.name),
  },
};

// Sources shown as their own column in the main spreadsheet — SaaS Alerts
// is excluded since it compares against the ACP add-on specifically, not
// the base user/device count, and gets its own dedicated section instead
// (same treatment as Vigilance/Archive).
const MAIN_TABLE_KEYS = ['datto_rmm', 'sentinelone', 'saas_protect', 'knowbe4'];

const SOURCE_KEYS = Object.keys(SOURCES);

// ── Visual language ──────────────────────────────────────────────────────────
// Clean white table: matching numbers are plain grey text; only numbers that
// don't match get a small colored pill with the difference beside them.
// Color says what to DO about it (confirmed with Matt — "over/under" scheme):
//   over        red    using more than billed → bill them
//   under       amber  billed for more than used → check / adjust
//   opportunity blue   ACP usage with no ACP contract → sell it
//   mismatch    red    Vigilance on/off doesn't match the contract
const PILL_TONES = {
  over:        { background: 'var(--red-soft)',   color: '#b91c1c' },
  under:       { background: 'var(--amber-soft)', color: '#92400e' },
  opportunity: { background: 'var(--blue-soft)',  color: 'var(--blue)' },
  mismatch:    { background: 'var(--red-soft)',   color: '#b91c1c' },
};

const LEGEND = [
  { tone: 'over',        sample: '+3', text: 'Over contract — using more than billed' },
  { tone: 'under',       sample: '−2', text: 'Under contract — billed for more than used' },
  { tone: 'opportunity', sample: '+18', text: 'Sales opportunity (ACP)' },
];

function signed(n) {
  return n > 0 ? `+${n}` : `−${Math.abs(n)}`;
}

function Pill({ tone, children, diff }) {
  return (
    <span className="it-mono" style={{
      ...PILL_TONES[tone],
      display: 'inline-flex', alignItems: 'baseline', gap: 5,
      padding: '2px 9px', borderRadius: 999, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap'
    }}>
      {children}
      {diff != null && <span style={{ fontSize: 11, fontWeight: 400 }}>{signed(diff)}</span>}
    </span>
  );
}

function Plain({ children }) {
  return <span className="it-mono" style={{ fontSize: 12, color: 'var(--ink3)' }}>{children}</span>;
}

function NoData() {
  return <span className="it-mono" style={{ fontSize: 12, color: '#cbd5e1' }}>—</span>;
}

// RMM / S1 / SaaS Protect / KB4 cell: consumed count, pill if it differs.
function SourceCell({ consumedValue, discrepancy }) {
  if (consumedValue == null) return <NoData />;
  if (!discrepancy) return <Plain>{consumedValue}</Plain>;
  return <Pill tone={discrepancy > 0 ? 'over' : 'under'} diff={discrepancy}>{consumedValue}</Pill>;
}

function VigilanceCell({ row }) {
  if (row.hasConsumedVigilance == null) return <NoData />;
  if (row.vigilanceMismatch) return <Pill tone="mismatch">Mismatch</Pill>;
  return <Plain>Aligned</Plain>;
}

function ArchiveCell({ row }) {
  if (row.archivedSeats == null) return <NoData />;
  if (row.archiveOverage > 0) return <Pill tone="over" diff={row.archiveOverage}>{row.archivedSeats}</Pill>;
  return <Plain>{row.archivedSeats}</Plain>;
}

function AcpCell({ row }) {
  if (row.billableUsers == null) return <NoData />;
  if (row.acpOpportunity > 0) return <Pill tone="opportunity" diff={row.acpOpportunity}>{row.billableUsers}</Pill>;
  return <Plain>{row.billableUsers}</Plain>;
}

function PanelSection({ title, children }) {
  return (
    <div>
      <div className="it-eyebrow" style={{ marginBottom: 6 }}>{title}</div>
      <div>{children}</div>
    </div>
  );
}

function PanelRow({ label, note, children }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
      padding: '8px 0', borderTop: '1px solid var(--border)'
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--ink2)' }}>{label}</div>
        {note && <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 1 }}>{note}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

// ── Card filters ─────────────────────────────────────────────────────────────
// Each overview card doubles as a filter for the client table. Clicking a
// card shows only the clients with that problem; clicking it again (or
// "Clear filters") shows everyone.
const CARD_FILTERS = {
  datto_rmm:    { label: 'RMM discrepancies',          test: (r) => !!r.perSource.datto_rmm.discrepancy },
  sentinelone:  { label: 'S1 discrepancies',           test: (r) => !!r.perSource.sentinelone.discrepancy },
  saas_protect: { label: 'SaaS Protect discrepancies', test: (r) => !!r.perSource.saas_protect.discrepancy },
  knowbe4:      { label: 'KB4 discrepancies',          test: (r) => !!r.perSource.knowbe4.discrepancy },
  vigilance:    { label: 'Vigilance mismatches',       test: (r) => r.vigilanceMismatch },
  archive:      { label: 'Archive overages',           test: (r) => r.archiveOverage > 0 },
  acp:          { label: 'ACP opportunities',          test: (r) => r.acpOpportunity > 0 },
};

// Overview card that doubles as a filter. Plain white; blue outline when it's
// the active filter.
function FilterCard({ label, count, problemText, active, onClick }) {
  return (
    <button
      onClick={onClick}
      title={active ? 'Click to clear this filter' : 'Click to show only these clients'}
      style={{
        textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer',
        background: 'white', borderRadius: 12, padding: active ? '11px 13px' : '12px 14px',
        border: active ? '2px solid var(--blue)' : '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0
      }}
    >
      <span className="it-eyebrow" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      <span style={{ fontSize: 24, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' }}>{count}</span>
      <span style={{ fontSize: 11.5, color: count > 0 ? 'var(--ink3)' : 'var(--green)' }}>
        {count > 0 ? problemText : 'All aligned'}
      </span>
    </button>
  );
}

// ── Sorting ─────────────────────────────────────────────────────────────────
// Every column is sortable. Software columns sort by the size of the
// discrepancy (biggest overage first on the first click), not the raw count,
// since that's what the audit is about. Clients with no data for a column
// ("—") always sort to the bottom, in either direction.
const SORT_COLUMNS = {
  name:        { label: 'CLIENT',    align: 'left',  firstDir: 'asc',  value: (r) => (r.companyName || '').toLowerCase() },
  users:       { label: 'CONTRACTED USERS',     align: 'right', firstDir: 'desc', value: (r) => r.totalContractedUsers },
  devices:     { label: 'CONTRACTED DEVICES',   align: 'right', firstDir: 'desc', value: (r) => r.totalContractedDevices },
  datto_rmm:   { label: 'RMM',       align: 'right', firstDir: 'desc', value: (r) => r.perSource.datto_rmm.discrepancy },
  sentinelone: { label: 'S1',        align: 'right', firstDir: 'desc', value: (r) => r.perSource.sentinelone.discrepancy },
  saas_protect:{ label: 'SAAS PROTECT', align: 'right', firstDir: 'desc', value: (r) => r.perSource.saas_protect.discrepancy },
  knowbe4:     { label: 'KB4',       align: 'right', firstDir: 'desc', value: (r) => r.perSource.knowbe4.discrepancy },
  vigilance:   { label: 'VIGILANCE', align: 'right', firstDir: 'desc', value: (r) => (r.hasConsumedVigilance == null ? null : r.vigilanceMismatch ? 1 : 0) },
  archive:     { label: 'ARCHIVE',   align: 'right', firstDir: 'desc', value: (r) => r.archiveOverage },
  acp:         { label: 'ACP OPP.',  align: 'right', firstDir: 'desc', value: (r) => r.acpOpportunity },
};
const SORT_COLUMN_ORDER = ['name', 'users', 'devices', 'datto_rmm', 'sentinelone', 'saas_protect', 'knowbe4', 'vigilance', 'archive', 'acp'];

function compareRows(a, b, key, dir) {
  const va = SORT_COLUMNS[key].value(a);
  const vb = SORT_COLUMNS[key].value(b);
  if (va == null && vb == null) return 0;
  if (va == null) return 1;   // no data → bottom, regardless of direction
  if (vb == null) return -1;
  let cmp = typeof va === 'string' ? va.localeCompare(vb) : va - vb;
  if (dir === 'desc') cmp = -cmp;
  return cmp;
}

// Contract numbers (users, devices, add-ons) come from a saved copy that
// rebuilds automatically every night, or on demand with this button. The
// top-bar "Sync Data" button does NOT refresh it — it only refreshes tickets.
const STALE_AFTER_MS = 36 * 60 * 60 * 1000; // older than a missed nightly rebuild

function ContractDataControl({ rebuild, builtAt, onRebuild }) {
  const building = !!rebuild?.isBuilding;
  const stale = builtAt && Date.now() - new Date(builtAt).getTime() > STALE_AFTER_MS;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
      <button
        onClick={onRebuild}
        disabled={building}
        className="it-mono"
        style={{
          padding: '8px 16px', borderRadius: 8,
          border: '1px solid var(--border-strong)',
          background: building ? 'var(--slate-soft)' : 'white',
          color: 'var(--ink)', fontSize: 12.5,
          cursor: building ? 'default' : 'pointer'
        }}
      >
        {building ? 'Rebuilding contract data…' : 'Rebuild contract data'}
      </button>
      <span className="it-mono" style={{ fontSize: 11, color: stale ? 'var(--amber)' : 'var(--ink4)' }}>
        {building
          ? 'Takes several minutes — you can keep working'
          : builtAt
            ? `Contract data from ${new Date(builtAt).toLocaleString()}${stale ? ' · out of date' : ''}`
            : 'Contract data not built yet'}
      </span>
      {rebuild?.status === 'error' && !building && (
        <span className="it-mono" style={{ fontSize: 11, color: 'var(--red)' }}>
          Last rebuild failed: {rebuild.error}
        </span>
      )}
    </div>
  );
}

export function LicenseAudit({ licenseAudit }) {
  const {
    contracted, companies, consumed, loading, uploading, error,
    loadContracted, loadCompanies, loadConsumed,
    uploadConsumed, mapConsumed, ignoreConsumed,
    rebuild, pollStatus, startRebuild
  } = licenseAudit;

  const [uploadSource, setUploadSource] = useState('datto_rmm');
  const [uploadSummary, setUploadSummary] = useState(null);
  const [mappingChoice, setMappingChoice] = useState({});
  const [showReconcile, setShowReconcile] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [search, setSearch] = useState('');
  const [cardFilter, setCardFilter] = useState(null); // key of CARD_FILTERS, or null
  const [sortKey, setSortKey] = useState(null);       // null = default (problems first, then A–Z)
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    loadContracted();
    pollStatus(); // shows "last updated", and picks up a rebuild already in progress
    loadCompanies();
    SOURCE_KEYS.forEach((key) => loadConsumed(key)); // all sources, including saas_alerts for the ACP section below
  }, []);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const config = SOURCES[uploadSource];
    const parsed = config.useDynamicHeader
      ? parseCSVDynamicHeader(text, config.dynamicHeaderMarker)
      : parseCSV(text);
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

  // One row per client, with every main-table source's consumed value +
  // discrepancy pre-computed, plus the Vigilance / Archive / ACP
  // opportunity comparisons (each compares against a specific add-on, not
  // the base user/device count, so they're handled separately).
  const tableRows = useMemo(() => {
    return clients.map((c) => {
      const perSource = {};
      MAIN_TABLE_KEYS.forEach((key) => {
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

      const acpEntry = consumed.saas_alerts?.byCompany?.[String(c.companyId)];
      const billableUsers = acpEntry ? acpEntry.devices : null;
      const contractedAcp = c.addons?.acp?.units || 0;
      const acpOpportunity = billableUsers != null ? billableUsers - contractedAcp : null;

      const anyDiscrepancy = MAIN_TABLE_KEYS.some((key) => perSource[key].discrepancy)
        || vigilanceMismatch || (archiveOverage != null && archiveOverage > 0)
        || (acpOpportunity != null && acpOpportunity > 0);

      return {
        ...c, perSource, hasConsumedVigilance, hasContractedVigilance, vigilanceMismatch,
        archivedSeats, contractedArchive, archiveOverage,
        billableUsers, contractedAcp, acpOpportunity,
        anyDiscrepancy
      };
    });
  }, [clients, consumed]);

  // What the table actually shows: search + card filter + sort.
  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = tableRows;
    if (q) rows = rows.filter((r) => (r.companyName || '').toLowerCase().includes(q));
    if (cardFilter) rows = rows.filter(CARD_FILTERS[cardFilter].test);
    const sorted = [...rows];
    if (sortKey) {
      sorted.sort((a, b) => compareRows(a, b, sortKey, sortDir) || compareRows(a, b, 'name', 'asc'));
    } else {
      // Default: clients with any problem first, then A–Z
      sorted.sort((a, b) => (b.anyDiscrepancy ? 1 : 0) - (a.anyDiscrepancy ? 1 : 0) || compareRows(a, b, 'name', 'asc'));
    }
    return sorted;
  }, [tableRows, search, cardFilter, sortKey, sortDir]);

  const toggleCardFilter = (key) => setCardFilter((current) => (current === key ? null : key));

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(SORT_COLUMNS[key].firstDir);
    }
  };

  const clearAll = () => { setSearch(''); setCardFilter(null); setSortKey(null); };
  const anyFilterActive = !!search.trim() || !!cardFilter || !!sortKey;

  // Overview counts, one per software type, for the top cards.
  const overageCounts = MAIN_TABLE_KEYS.reduce((acc, key) => {
    acc[key] = tableRows.filter((r) => r.perSource[key].discrepancy).length;
    return acc;
  }, {});
  const vigilanceMismatchCount = tableRows.filter((r) => r.vigilanceMismatch).length;
  const archiveOverageCount = tableRows.filter((r) => r.archiveOverage > 0).length;

  // ACP opportunity: clients with real billable usage in SaaS Alerts but no
  // (or insufficient) contracted ACP — the sales-opportunity signal, not a
  // billing-correction one like the others. Shown as its own column.
  const acpOpportunityCount = tableRows.filter((r) => r.acpOpportunity > 0).length;

  const sourceData = consumed[uploadSource] || { byCompany: {}, unmatched: [], uploadedAt: null };
  const selected = tableRows.find((r) => r.companyId === selectedCompanyId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div>
          <div className="it-section-title">License Audit</div>
          <div className="it-section-sub">Contracted vs. consumed, across every tracked software source</div>
        </div>
        <ContractDataControl rebuild={rebuild} builtAt={rebuild?.builtAt ?? contracted?.builtAt} onRebuild={startRebuild} />
      </div>

      {error && (
        <div style={{ background: 'var(--red-soft)', border: '1px solid #fecaca', borderRadius: 10, padding: 16 }}>
          <p className="it-mono" style={{ fontSize: 12, color: 'var(--red)' }}>{error}</p>
        </div>
      )}

      {/* Overview cards — one per software type. Click one to filter the
          client table down to just those clients. */}
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 10 }}>
          {MAIN_TABLE_KEYS.map((key) => (
            <FilterCard key={key}
              label={SOURCES[key].shortLabel}
              count={overageCounts[key]}
              problemText="Discrepancies"
              active={cardFilter === key}
              onClick={() => toggleCardFilter(key)} />
          ))}
          <FilterCard label="Vigilance" count={vigilanceMismatchCount} problemText="Mismatched"
            active={cardFilter === 'vigilance'} onClick={() => toggleCardFilter('vigilance')} />
          <FilterCard label="Archive" count={archiveOverageCount} problemText="Likely unbilled"
            active={cardFilter === 'archive'} onClick={() => toggleCardFilter('archive')} />
          <FilterCard label="ACP opportunity" count={acpOpportunityCount} problemText="Not yet selling"
            active={cardFilter === 'acp'} onClick={() => toggleCardFilter('acp')} />
        </div>
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 10 }}>
          {LEGEND.map((l) => (
            <span key={l.tone} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--ink3)' }}>
              <Pill tone={l.tone}>{l.sample}</Pill>{l.text}
            </span>
          ))}
        </div>
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

      <style>{`.la-row:hover td { background: var(--slate-soft); }`}</style>

      {/* Unified spreadsheet — every client, every source, one table */}
      <div className="it-card" style={{ padding: 20, overflowX: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <div className="it-section-title">All clients</div>
            {tableRows.length > 0 && (
              <span className="it-mono" style={{ fontSize: 11.5, color: 'var(--ink4)' }}>
                {visibleRows.length === tableRows.length
                  ? `${tableRows.length} clients`
                  : `Showing ${visibleRows.length} of ${tableRows.length}`}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {cardFilter && (
              <span className="it-mono" style={{
                fontSize: 11.5, padding: '4px 10px', borderRadius: 999,
                background: 'var(--blue-soft, #eaf2fb)', color: 'var(--blue)'
              }}>
                {CARD_FILTERS[cardFilter].label}
                <button
                  onClick={() => setCardFilter(null)}
                  title="Remove this filter"
                  style={{ marginLeft: 6, background: 'none', border: 0, cursor: 'pointer', color: 'var(--blue)', fontSize: 12, padding: 0 }}
                >
                  ✕
                </button>
              </span>
            )}
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients…"
              style={{
                width: 220, padding: '7px 10px', borderRadius: 6,
                border: '1px solid var(--border-strong)', fontSize: 12.5, fontFamily: 'inherit'
              }}
            />
            {anyFilterActive && (
              <button
                onClick={clearAll}
                className="it-mono"
                style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--ink4)', fontSize: 11.5, padding: 0 }}
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
        {loading && <p className="it-mono" style={{ fontSize: 12, color: 'var(--ink4)' }}>Loading…</p>}
        {!loading && tableRows.length === 0 && (
          <p className="it-mono" style={{ fontSize: 12, color: 'var(--ink4)' }}>No contracted data yet.</p>
        )}
        {tableRows.length > 0 && visibleRows.length === 0 && (
          <p className="it-mono" style={{ fontSize: 12, color: 'var(--ink4)' }}>No clients match these filters.</p>
        )}
        {visibleRows.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {SORT_COLUMN_ORDER.map((key) => {
                  const col = SORT_COLUMNS[key];
                  const active = sortKey === key;
                  return (
                    <th key={key} style={{ textAlign: col.align, padding: '0 12px 8px', whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => handleSort(key)}
                        title="Click to sort"
                        style={{
                          background: 'none', border: 0, padding: 0, cursor: 'pointer',
                          fontSize: 11, fontFamily: 'var(--mono)',
                          color: active ? 'var(--ink)' : 'var(--ink4)',
                          fontWeight: active ? 600 : 400
                        }}
                      >
                        {col.label}{active ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr
                  key={row.companyId}
                  className="la-row"
                  onClick={() => setSelectedCompanyId(row.companyId)}
                  style={{
                    cursor: 'pointer',
                    borderTop: '1px solid var(--border)',
                    background: row.companyId === selectedCompanyId ? 'var(--blue-soft)' : undefined
                  }}
                >
                  <td style={{ padding: '11px 12px', fontSize: 13, color: 'var(--ink)' }}>{row.companyName}</td>
                  <td style={{ padding: '11px 12px', textAlign: 'right' }}><Plain>{row.totalContractedUsers}</Plain></td>
                  <td style={{ padding: '11px 12px', textAlign: 'right' }}><Plain>{row.totalContractedDevices}</Plain></td>
                  {MAIN_TABLE_KEYS.map((key) => (
                    <td key={key} style={{ padding: '11px 12px', textAlign: 'right' }}>
                      <SourceCell consumedValue={row.perSource[key].consumedValue} discrepancy={row.perSource[key].discrepancy} />
                    </td>
                  ))}
                  <td style={{ padding: '11px 12px', textAlign: 'right' }}><VigilanceCell row={row} /></td>
                  <td style={{ padding: '11px 12px', textAlign: 'right' }}><ArchiveCell row={row} /></td>
                  <td style={{ padding: '11px 12px', textAlign: 'right' }}><AcpCell row={row} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Slide-out client detail panel — same clean treatment as the table:
          plain grey values, pills only where something doesn't match. */}
      {selected && (
        <>
          <div
            onClick={() => setSelectedCompanyId(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.12)', zIndex: 40 }}
          />
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: 440, maxWidth: '92vw',
            background: 'white', borderLeft: '1px solid var(--border)',
            boxShadow: '-8px 0 24px rgba(15, 23, 42, 0.06)', zIndex: 50,
            padding: '24px 28px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 22
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--ink)' }}>{selected.companyName}</div>
                <div className="it-mono" style={{ fontSize: 11.5, color: 'var(--ink4)', marginTop: 3 }}>
                  {selected.totalContractedUsers} contracted users · {selected.totalContractedDevices} contracted devices
                </div>
              </div>
              <button
                onClick={() => setSelectedCompanyId(null)}
                aria-label="Close"
                style={{
                  background: 'none', border: '1px solid var(--border)', borderRadius: 8,
                  width: 30, height: 30, cursor: 'pointer', color: 'var(--ink3)', fontSize: 14, lineHeight: 1
                }}
              >
                ✕
              </button>
            </div>

            <PanelSection title="Contracted (AutoTask)">
              <PanelRow label="Full users"><Plain>{selected.fullUsers}</Plain></PanelRow>
              <PanelRow label="Partial users"><Plain>{selected.partialUsers}</Plain></PanelRow>
              <PanelRow label="Extra devices">
                {selected.extraDevicesLapsed
                  ? <Pill tone="under">{selected.extraDevices} · lapsed</Pill>
                  : <Plain>{selected.extraDevices}</Plain>}
              </PanelRow>
              <PanelRow label="Servers"><Plain>{selected.servers}</Plain></PanelRow>
            </PanelSection>

            <PanelSection title="Consumed, by source">
              {MAIN_TABLE_KEYS.map((key) => {
                const src = selected.perSource[key];
                return (
                  <PanelRow key={key} label={SOURCES[key].label}
                    note={src.consumedValue != null && src.discrepancy
                      ? `vs ${src.contractedValue} ${SOURCES[key].contractedLabel.toLowerCase()}`
                      : null}>
                    <SourceCell consumedValue={src.consumedValue} discrepancy={src.discrepancy} />
                  </PanelRow>
                );
              })}
            </PanelSection>

            <PanelSection title="Add-ons">
              <PanelRow label="Vigilance"
                note={`${selected.hasContractedVigilance ? `Contracted (${selected.addons.vigilance.units})` : 'Not contracted'}${
                  selected.hasConsumedVigilance != null ? ` · ${selected.hasConsumedVigilance ? 'on' : 'off'} in S1` : ''}`}>
                <VigilanceCell row={selected} />
              </PanelRow>
              <PanelRow label="Long Term Archive" note={`${selected.contractedArchive} contracted · archived seats in SaaS Protect`}>
                <ArchiveCell row={selected} />
              </PanelRow>
              <PanelRow label="ACP" note={`${selected.contractedAcp} contracted · billable users in SaaS Alerts`}>
                <AcpCell row={selected} />
              </PanelRow>
              <PanelRow label="vPenTest"><Plain>{selected.addons?.vPenTest?.units || 0}</Plain></PanelRow>
            </PanelSection>
          </div>
        </>
      )}
    </div>
  );
}