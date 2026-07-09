import { useMemo, useState } from 'react';

// Reuses the same brand hex values already established for VTO (blue/green/
// warm accent) for visual consistency across the app, since there isn't yet
// a dedicated status-color set in the shared CSS variables. All status
// colors are centralized here - change in one place if you want different
// colors later.
const STATUS_META = {
  active:               { label: 'Active',                   bg: '#e9f5ee', fg: '#3f9469' },
  included:             { label: 'Included',                 bg: '#eaf2fb', fg: '#2f74b5' },
  lapsed:               { label: 'Lapsed',                    bg: '#fdecea', fg: '#c0392b' },
  sold_not_on_contract: { label: 'Sold - not on contract',    bg: '#f7ece3', fg: '#c66a3a' },
  awaiting:             { label: 'Quoted - awaiting answer',  bg: '#f3f4f6', fg: '#6b7280' },
  declined:             { label: 'Declined',                  bg: '#fdecea', fg: '#c0392b' },
  not_quoted:           { label: 'Not yet quoted',             bg: '#f9fafb', fg: '#9ca3af' }
};

const UPSELL_ORDER = [
  'managedFirewall', 'backupDatto', 'backupNas', 'mdm',
  'accountCompromiseProtection', 'vigilance', 'vPenTest', 'passwordManager'
];

function StatusBadge({ upsell }) {
  const meta = STATUS_META[upsell.status] || STATUS_META.not_quoted;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-start' }}>
      <span style={{
        background: meta.bg,
        color: meta.fg,
        fontSize: 11,
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: 999,
        whiteSpace: 'nowrap'
      }}>
        {meta.label}
      </span>
      {upsell.status === 'active' && (
        <span className="it-mono" style={{ fontSize: 11, color: 'var(--ink3)' }}>
          ${upsell.mrr?.toLocaleString(undefined, { maximumFractionDigits: 2 })}/mo
        </span>
      )}
      {upsell.status === 'included' && upsell.bundleName && (
        <span className="it-mono" style={{ fontSize: 10, color: 'var(--ink4)' }}>
          via {upsell.bundleName}
        </span>
      )}
      {upsell.udfFlaggedNoContractLine && (
        <span className="it-mono" style={{ fontSize: 10, color: '#c66a3a' }}>
          ⚑ needs review
        </span>
      )}
    </div>
  );
}

export function InsideSales({ upsells }) {
  const { data, loading, error, refreshing, refresh } = upsells;
  const [search, setSearch] = useState('');

  const companies = data?.companies || [];

  const filtered = useMemo(() => {
    if (!search.trim()) return companies;
    const q = search.toLowerCase();
    return companies.filter(c => c.companyName?.toLowerCase().includes(q));
  }, [companies, search]);

  const summary = useMemo(() => {
    let totalMRR = 0;
    let gaps = 0;
    let awaitingCount = 0;
    let needsReview = [];

    companies.forEach(c => {
      UPSELL_ORDER.forEach(key => {
        const u = c.upsells?.[key];
        if (!u) return;
        if (u.status === 'active') totalMRR += u.mrr || 0;
        if (u.status === 'sold_not_on_contract') gaps++;
        if (u.status === 'awaiting') awaitingCount++;
        if (u.udfFlaggedNoContractLine) {
          needsReview.push({ companyName: c.companyName, upsellLabel: u.label, status: u.status });
        }
      });
    });

    return { totalMRR, gaps, awaitingCount, needsReview };
  }, [companies]);

  if (loading && !data) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: 256, gap: 12
      }}>
        <p className="it-mono" style={{ fontSize: 13, color: 'var(--ink3)' }}>
          Loading upsell data...
        </p>
        <p className="it-mono" style={{ fontSize: 11, color: 'var(--ink4)' }}>
          First load may take a few minutes while building the cache
        </p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>
            Inside Sales - Upsell Tracking
          </h2>
          {data?.builtAt && (
            <p className="it-mono" style={{ fontSize: 11, color: 'var(--ink4)' }}>
              Last built {new Date(data.builtAt).toLocaleString()}
            </p>
          )}
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="it-mono"
          style={{
            padding: '8px 14px',
            fontSize: 12,
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: refreshing ? 'var(--bg)' : 'var(--card)',
            color: 'var(--ink)',
            cursor: refreshing ? 'default' : 'pointer'
          }}
        >
          {refreshing ? 'Refreshing (this can take a few minutes)...' : 'Refresh from AutoTask'}
        </button>
      </div>

      {error && (
        <div style={{
          background: 'var(--red-soft)', border: '1px solid #fecaca',
          borderRadius: 10, padding: 16, marginBottom: 16
        }}>
          <p className="it-mono" style={{ fontSize: 12, color: 'var(--red)' }}>{error}</p>
        </div>
      )}

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <div className="it-card" style={{ padding: 16 }}>
          <p className="it-mono" style={{ fontSize: 11, color: 'var(--ink4)', marginBottom: 4 }}>ACTIVE UPSELL MRR</p>
          <p style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink)' }}>
            ${summary.totalMRR.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="it-card" style={{ padding: 16 }}>
          <p className="it-mono" style={{ fontSize: 11, color: 'var(--ink4)', marginBottom: 4 }}>SOLD, NOT ON CONTRACT</p>
          <p style={{ fontSize: 22, fontWeight: 600, color: '#c66a3a' }}>{summary.gaps}</p>
        </div>
        <div className="it-card" style={{ padding: 16 }}>
          <p className="it-mono" style={{ fontSize: 11, color: 'var(--ink4)', marginBottom: 4 }}>AWAITING ANSWER</p>
          <p style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink)' }}>{summary.awaitingCount}</p>
        </div>
        <div className="it-card" style={{ padding: 16 }}>
          <p className="it-mono" style={{ fontSize: 11, color: 'var(--ink4)', marginBottom: 4 }}>NEEDS MANUAL REVIEW</p>
          <p style={{ fontSize: 22, fontWeight: 600, color: '#c66a3a' }}>{summary.needsReview.length}</p>
        </div>
      </div>

      {/* Needs Review panel */}
      {summary.needsReview.length > 0 && (
        <div className="it-card" style={{ padding: 16, marginBottom: 20 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 10 }}>
            Needs manual review
          </p>
          <p className="it-mono" style={{ fontSize: 11, color: 'var(--ink4)', marginBottom: 12 }}>
            Marked in AutoTask's "Services" field, but no matching contract line item found. Sort these into real gaps vs. complimentary/bundled add-ons.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {summary.needsReview.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--ink)' }}>{item.companyName}</span>
                <span className="it-mono" style={{ color: 'var(--ink3)' }}>{item.upsellLabel}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <input
        type="text"
        placeholder="Search companies..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="it-mono"
        style={{
          width: '100%',
          maxWidth: 320,
          padding: '8px 12px',
          fontSize: 13,
          borderRadius: 8,
          border: '1px solid var(--border)',
          marginBottom: 12,
          background: 'var(--card)',
          color: 'var(--ink)'
        }}
      />

      <div className="it-card" style={{ overflowX: 'auto', padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{
                position: 'sticky', left: 0, background: 'var(--card)',
                textAlign: 'left', padding: '10px 14px', color: 'var(--ink3)', fontWeight: 500
              }}>
                Company
              </th>
              {UPSELL_ORDER.map(key => (
                <th key={key} style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--ink3)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                  {companies.find(c => c.upsells?.[key])?.upsells[key]?.label || key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(company => (
              <tr key={company.companyId} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{
                  position: 'sticky', left: 0, background: 'var(--card)',
                  padding: '10px 14px', fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap'
                }}>
                  {company.companyName}
                </td>
                {UPSELL_ORDER.map(key => (
                  <td key={key} style={{ padding: '10px 14px' }}>
                    {company.upsells?.[key] && <StatusBadge upsell={company.upsells[key]} />}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}