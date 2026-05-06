export function StaffingSignals({ data }) {
  if (!data) return null;
  const { summary, open, sla, resources } = data;

  const monthKeys = Object.keys(summary.byMonth).sort();
  const mid = Math.floor(monthKeys.length / 2);
  const currentTotal = monthKeys.slice(mid).reduce((s, m) => s + (summary.byMonth[m] || 0), 0);
  const priorTotal = monthKeys.slice(0, mid).reduce((s, m) => s + (summary.byMonth[m] || 0), 0);
  const volumeGrowth = priorTotal ? (((currentTotal - priorTotal) / priorTotal) * 100).toFixed(0) : 0;

  const techList = Object.entries(open.byTech).sort((a, b) => b[1] - a[1]);
  const maxLoad = techList[0]?.[1] || 0;
  const avgLoad = techList.length
    ? Math.round(techList.reduce((s, [, c]) => s + c, 0) / techList.length)
    : 0;
  const slaChange = (sla.current.breachRate - sla.prior.breachRate).toFixed(1);

  const signals = [
    {
      label: 'Ticket volume growth',
      value: `+${volumeGrowth}% period over period`,
      status: volumeGrowth > 15 ? 'danger' : volumeGrowth > 8 ? 'warn' : 'ok',
      note: volumeGrowth > 15 ? 'Significant workload increase' : 'Moderate growth'
    },
    {
      label: 'SLA breach trend',
      value: `${slaChange > 0 ? '+' : ''}${slaChange}pts`,
      status: slaChange > 3 ? 'danger' : slaChange > 0 ? 'warn' : 'ok',
      note: slaChange > 0 ? 'Service quality declining' : 'Holding steady'
    },
    {
      label: 'Avg open ticket age',
      value: `${open.avgAgeInDays} days`,
      status: open.avgAgeInDays > 5 ? 'danger' : open.avgAgeInDays > 3 ? 'warn' : 'ok',
      note: open.avgAgeInDays > 5 ? 'Tickets aging — capacity concern' : 'Within normal range'
    },
    {
      label: 'Highest tech load',
      value: `${maxLoad} open tickets`,
      status: maxLoad > 80 ? 'danger' : maxLoad > 60 ? 'warn' : 'ok',
      note: maxLoad > 80 ? 'Individual at risk of burnout' : 'Manageable load'
    },
    {
      label: 'Avg tickets per tech',
      value: `${avgLoad} open tickets`,
      status: avgLoad > 60 ? 'danger' : avgLoad > 40 ? 'warn' : 'ok',
      note: avgLoad > 60 ? 'Team consistently over threshold' : 'Team load acceptable'
    },
    {
      label: 'Active technicians',
      value: `${resources.resources.length} resources`,
      status: 'neutral',
      note: 'Current headcount'
    }
  ];

  const dangerCount = signals.filter(s => s.status === 'danger').length;
  const warnCount = signals.filter(s => s.status === 'warn').length;

  const verdict =
    dangerCount >= 3 ? { text: 'Strong case for new hire', color: 'var(--red)' } :
    dangerCount >= 1 || warnCount >= 3 ? { text: 'New hire worth serious consideration', color: 'var(--amber)' } :
    { text: 'Current staffing appears adequate', color: 'var(--green)' };

  const statusColors = {
    danger: { bg: 'rgba(224,92,92,0.12)', text: 'var(--red)', dot: 'var(--red)' },
    warn:   { bg: 'rgba(224,154,58,0.12)', text: 'var(--amber)', dot: 'var(--amber)' },
    ok:     { bg: 'rgba(76,175,120,0.12)', text: 'var(--green)', dot: 'var(--green)' },
    neutral:{ bg: 'rgba(255,255,255,0.05)', text: 'var(--text-secondary)', dot: 'var(--text-secondary)' }
  };

  return (
    <div className="space-y-6">
      <div style={{ background: 'var(--surface-raised)', border: `1px solid ${verdict.color}`, borderRadius: 12 }}
        className="p-5 flex items-center justify-between">
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

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        className="rounded-xl divide-y" style2={{ divideColor: 'var(--border)' }}>
        {signals.map((sig, i) => {
          const colors = statusColors[sig.status];
          return (
            <div key={i} className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: i < signals.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: colors.dot }} />
                <div>
                  <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{sig.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{sig.note}</p>
                </div>
              </div>
              <span className="text-xs font-medium px-3 py-1 rounded-full flex-shrink-0 ml-4"
                style={{ background: colors.bg, color: colors.text, fontFamily: 'DM Mono, monospace' }}>
                {sig.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
