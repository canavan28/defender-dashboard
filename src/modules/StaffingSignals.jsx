export function StaffingSignals({ metrics, fullRefreshing, onFullRefresh, cacheInfo }) {
  if (!metrics) return null;
  const { staffing, openByTechList, avgOpenAge, avgResolutionDays, slaBreachRate } = metrics;
  const { trailing12, lastCompleteQuarter } = staffing;

  const maxOpen = openByTechList[0]?.count || 1;
  const avgOpen = openByTechList.length
    ? Math.round(openByTechList.reduce((s, t) => s + t.count, 0) / openByTechList.length)
    : 0;

  const volumeSignals = [
    {
      label: 'Trailing 12 months vs prior 12',
      current: trailing12.current,
      prior: trailing12.prior,
      change: trailing12.change,
      currentLabel: trailing12.currentLabel,
      priorLabel: trailing12.priorLabel,
      status: trailing12.change > 15 ? 'danger' : trailing12.change > 5 ? 'warn' : 'ok'
    },
    {
      label: 'Last complete quarter vs same quarter prior year',
      current: lastCompleteQuarter.current,
      prior: lastCompleteQuarter.prior,
      change: lastCompleteQuarter.change,
      currentLabel: lastCompleteQuarter.currentLabel,
      priorLabel: lastCompleteQuarter.priorLabel,
      status: lastCompleteQuarter.change > 15 ? 'danger' : lastCompleteQuarter.change > 5 ? 'warn' : 'ok'
    }
  ];

  const operationalSignals = [
    {
      label: 'Avg open ticket age',
      value: `${avgOpenAge}d`,
      note: avgOpenAge > 7 ? 'Tickets aging — capacity concern' : 'Within normal range',
      status: avgOpenAge > 10 ? 'danger' : avgOpenAge > 7 ? 'warn' : 'ok'
    },
    {
      label: 'Avg resolution time',
      value: `${avgResolutionDays}d`,
      note: avgResolutionDays > 5 ? 'Resolution slowing down' : 'Resolving at healthy pace',
      status: avgResolutionDays > 7 ? 'danger' : avgResolutionDays > 5 ? 'warn' : 'ok'
    },
    {
      label: 'SLA breach rate',
      value: `${slaBreachRate}%`,
      note: slaBreachRate > 10 ? 'Significant breach rate — service risk' : slaBreachRate > 5 ? 'Elevated breach rate' : 'Within acceptable range',
      status: slaBreachRate > 10 ? 'danger' : slaBreachRate > 5 ? 'warn' : 'ok'
    },
    {
      label: 'Highest tech open load',
      value: `${openByTechList[0]?.count || 0} tickets`,
      note: openByTechList[0]?.name ? `${openByTechList[0].name} has highest load` : 'No open tickets',
      status: (openByTechList[0]?.count || 0) > 20 ? 'danger' : (openByTechList[0]?.count || 0) > 15 ? 'warn' : 'ok'
    },
    {
      label: 'Avg open tickets per tech',
      value: `${avgOpen} tickets`,
      note: avgOpen > 15 ? 'Team consistently over threshold' : 'Team load acceptable',
      status: avgOpen > 15 ? 'danger' : avgOpen > 10 ? 'warn' : 'ok'
    },
    {
      label: 'Active technicians',
      value: `${openByTechList.length}`,
      note: 'Currently assigned to open tickets',
      status: 'neutral'
    }
  ];

  const allSignals = [...volumeSignals.map(s => ({ ...s, isVolume: true })), ...operationalSignals];
  const dangerCount = allSignals.filter(s => s.status === 'danger').length;
  const warnCount = allSignals.filter(s => s.status === 'warn').length;

  const verdict =
    dangerCount >= 3 ? { text: 'Strong case for new hire', color: 'var(--red)' } :
    dangerCount >= 1 || warnCount >= 3 ? { text: 'New hire worth serious consideration', color: 'var(--amber)' } :
    { text: 'Current staffing appears adequate', color: 'var(--green)' };

  const statusColors = {
    danger: { bg: '#fef2f2', text: 'var(--red)', border: '#fecaca' },
    warn:   { bg: '#fffbeb', text: 'var(--amber)', border: '#fde68a' },
    ok:     { bg: '#f0fdf4', text: 'var(--green)', border: '#bbf7d0' },
    neutral:{ bg: '#f8f9fb', text: 'var(--text-secondary)', border: 'var(--border)' }
  };

  return (
    <div className="space-y-6">
      

      {/* Volume signals */}
      <p className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace' }}>
        Volume signals
      </p>
      {volumeSignals.map((sig, i) => {
        const colors = statusColors[sig.status];
        return (
          <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            className="rounded-xl p-6">
            <p className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>{sig.label}</p>
            <div className="flex items-end gap-6 mb-2">
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace' }}>
                  {sig.priorLabel}
                </p>
                <p className="text-3xl font-light" style={{ color: 'var(--text-secondary)' }}>
                  {sig.prior.toLocaleString()}
                </p>
              </div>
              <p className="text-2xl mb-1" style={{ color: 'var(--text-secondary)' }}>→</p>
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace' }}>
                  {sig.currentLabel}
                </p>
                <p className="text-3xl font-light" style={{ color: 'var(--text-primary)' }}>
                  {sig.current.toLocaleString()}
                </p>
              </div>
              <span className="text-sm font-medium px-3 py-1 rounded-full ml-4"
                style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, fontFamily: 'DM Mono, monospace' }}>
                {sig.change > 0 ? '+' : ''}{sig.change}%
              </span>
            </div>
          </div>
        );
      })}

      {/* Operational signals */}
      <p className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace' }}>
        Operational signals
      </p>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        className="rounded-xl divide-y divide-gray-100">
        {operationalSignals.map((sig, i) => {
          const colors = statusColors[sig.status];
          return (
            <div key={i} className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: colors.text }} />
                <div>
                  <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{sig.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{sig.note}</p>
                </div>
              </div>
              <span className="text-xs font-medium px-3 py-1 rounded-full flex-shrink-0 ml-4"
                style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, fontFamily: 'DM Mono, monospace' }}>
                {sig.value}
              </span>
            </div>
          );
        })}
      </div>

      {/* Cache info + Full refresh */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        className="rounded-xl p-6">
        <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Data cache</p>
        {cacheInfo && (
          <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace' }}>
            Historical cache built: {new Date(cacheInfo.historicalBuiltAt).toLocaleString()} · {cacheInfo.totalTickets.toLocaleString()} total tickets
          </p>
        )}
        <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
          Regular sync only refreshes the last 30 days. Use Full refresh to rebuild the complete historical dataset. This will take several minutes.
        </p>
        <button onClick={onFullRefresh} disabled={fullRefreshing}
          style={{
            border: '1px solid var(--border)',
            color: fullRefreshing ? 'var(--text-secondary)' : 'var(--text-primary)',
            background: 'var(--surface-raised)',
            fontFamily: 'DM Mono, monospace'
          }}
          className="text-xs px-4 py-2 rounded-lg transition-all disabled:cursor-not-allowed">
          {fullRefreshing ? 'Running full refresh... this may take several minutes' : 'Full refresh'}
        </button>
      </div>
    </div>
  );
}