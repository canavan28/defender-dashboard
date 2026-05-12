const tooltipStyle = {
  background: '#ffffff', border: '1px solid rgba(0,0,0,0.1)',
  borderRadius: 8, color: '#1a1b1e', fontSize: 12,
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
};

function TechBar({ name, count, maxCount, colorFn }) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-sm w-36 truncate flex-shrink-0" style={{ color: '#6b7280' }}>
        {name}
      </span>
      <div className="flex-1 rounded-full overflow-hidden"
        style={{ background: 'rgba(0,0,0,0.06)', height: 8 }}>
        <div className="h-full rounded-full transition-all"
          style={{ width: `${(count / maxCount) * 100}%`, background: colorFn(count, maxCount) }} />
      </div>
      <span className="text-sm font-medium w-8 text-right flex-shrink-0"
        style={{ color: 'var(--text-primary)', fontFamily: 'DM Mono, monospace' }}>
        {count}
      </span>
    </div>
  );
}

function MetricCard({ label, value, delta, deltaDir }) {
  const deltaColor =
    deltaDir === 'up-bad' ? 'text-red-600' :
    deltaDir === 'down-good' ? 'text-green-600' :
    'text-gray-400';
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
      className="rounded-xl p-5">
      <p style={{ color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace' }}
        className="text-xs uppercase tracking-widest mb-3">{label}</p>
      <p className="text-3xl font-light mb-2" style={{ color: 'var(--text-primary)' }}>{value}</p>
      {delta && <p className={`text-xs font-medium ${deltaColor}`}>{delta}</p>}
    </div>
  );
}

export function TechCapacity({ metrics, selectedQuarterKey }) {
  if (!metrics) return null;
  const { openByTechList, closedByTechList, selectedQLabel } = metrics;

  const maxOpen = openByTechList[0]?.count || 1;
  const maxClosed = closedByTechList[0]?.count || 1;
  const avgOpen = openByTechList.length
    ? Math.round(openByTechList.reduce((s, t) => s + t.count, 0) / openByTechList.length)
    : 0;

  const openColor = (count, max) => {
    if (count >= max * 0.85) return 'var(--red)';
    if (count >= max * 0.65) return 'var(--amber)';
    return 'var(--green)';
  };

  const closedColor = () => '#2563eb';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <MetricCard label="Active technicians" value={openByTechList.length}
          delta="With open tickets" deltaDir="neutral" />
        <MetricCard label="Avg open tickets" value={avgOpen}
          delta={avgOpen > 15 ? 'Above healthy threshold' : 'Within healthy range'}
          deltaDir={avgOpen > 15 ? 'up-bad' : 'down-good'} />
        <MetricCard label="Highest load" value={openByTechList[0]?.count || 0}
          delta={openByTechList[0]?.name || ''}
          deltaDir={openByTechList[0]?.count > 20 ? 'up-bad' : 'neutral'} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Current open tickets */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          className="rounded-xl p-6">
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            Current open tickets
          </p>
          <p className="text-xs mb-6" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace' }}>
            Live workload · Red = high · Amber = moderate · Green = healthy
          </p>
          <div className="space-y-4">
            {openByTechList.map(tech => (
              <TechBar key={tech.id} name={tech.name} count={tech.count}
                maxCount={maxOpen} colorFn={openColor} />
            ))}
            {openByTechList.length === 0 && (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No open tickets</p>
            )}
          </div>
        </div>

        {/* Closed tickets by selected quarter */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          className="rounded-xl p-6">
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            Tickets closed per tech
          </p>
          <p className="text-xs mb-6" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace' }}>
            {selectedQLabel || 'Select a quarter to filter'} · Based on completed date
          </p>
          <div className="space-y-4">
            {closedByTechList.map(tech => (
              <TechBar key={tech.id} name={tech.name} count={tech.count}
                maxCount={maxClosed} colorFn={closedColor} />
            ))}
            {closedByTechList.length === 0 && (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {selectedQuarterKey ? 'No completed tickets for this quarter' : 'Select a quarter above'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}