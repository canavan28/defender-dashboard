export function StaffingSignals({ metrics, fullRefreshing, onFullRefresh, cacheInfo }) {
  if (!metrics) return null;
  const { staffing, quarterlyTrend } = metrics;
  const { trailing12, lastCompleteQuarter } = staffing;

  const signals = [
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

  const dangerCount = signals.filter(s => s.status === 'danger').length;
  const warnCount = signals.filter(s => s.status === 'warn').length;

  const verdict =
    dangerCount >= 2 ? { text: 'Strong case for new hire', color: 'var(--red)' } :
    dangerCount >= 1 || warnCount >= 2 ? { text: 'New hire worth serious consideration', color: 'var(--amber)' } :
    { text: 'Current staffing appears adequate', color: 'var(--green)' };

  const statusColors = {
    danger: { bg: '#fef2f2', text: 'var(--red)', border: '#fecaca' },
    warn:   { bg: '#fffbeb', text: 'var(--amber)', border: '#fde68a' },
    ok:     { bg: '#f0fdf4', text: 'var(--green)', border: '#bbf7d0' }
  };

  return (
    <div className="space-y-6">
      {/* Verdict */}
      <div style={{
        background: 'var(--surface)',
        border: `1px solid ${verdict.color}`,
        borderRadius: 12
      }} className="p-5 flex items-center justify-between">
        <div>
          <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace' }}>
            Executive recommendation
          </p>
          <p className="text-lg font-medium" style={{ color: verdict.color }}>{verdict.text}</p>
        </div>
        <div className="text-right">
          <p className="text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace' }}>
            {dangerCount} critical · {warnCount} warning
          </p>
        </div>
      </div>

      {/* Signal cards */}
      {signals.map((sig, i) => {
        const colors = statusColors[sig.status];
        return (
          <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            className="rounded-xl p-6">
            <p className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
              {sig.label}
            </p>
            <div className="flex items-end gap-6 mb-3">
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

      {/* Cache info + Full refresh */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        className="rounded-xl p-6">
        <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
          Data cache
        </p>
        {cacheInfo && (
          <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace' }}>
            Historical cache built: {new Date(cacheInfo.historicalBuiltAt).toLocaleString()} ·{' '}
            {cacheInfo.totalTickets.toLocaleString()} total tickets
          </p>
        )}
        <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
          Regular sync only refreshes the last 30 days. Use Full refresh to rebuild the complete historical dataset. This will take several minutes.
        </p>
        <button
          onClick={onFullRefresh}
          disabled={fullRefreshing}
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