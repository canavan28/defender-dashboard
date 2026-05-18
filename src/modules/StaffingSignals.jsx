import { MetricCard } from '../components/MetricCard';

export function StaffingSignals({ metrics, fullRefreshStep, onFullRefresh, cacheInfo }) {
  if (!metrics) return null;
  const {
    staffing, openByTechList,
    avgOpenAge, avgResolutionDays, slaBreachRate
  } = metrics;
  const { trailing12, lastCompleteQuarter } = staffing;

  const avgOpen = openByTechList.length
    ? Math.round(openByTechList.reduce((s, t) => s + t.count, 0) / openByTechList.length)
    : 0;

  const volumeSignals = [
    {
      label: 'Trailing 12 months vs prior 12',
      a: { period: trailing12.priorLabel, n: trailing12.prior },
      b: { period: trailing12.currentLabel, n: trailing12.current },
      pct: `${trailing12.change > 0 ? '+' : ''}${trailing12.change}%`,
      tone: trailing12.change > 5 ? 'neg' : 'pos'
    },
    {
      label: 'Last complete quarter vs same quarter prior year',
      a: { period: lastCompleteQuarter.priorLabel, n: lastCompleteQuarter.prior },
      b: { period: lastCompleteQuarter.currentLabel, n: lastCompleteQuarter.current },
      pct: `${lastCompleteQuarter.change > 0 ? '+' : ''}${lastCompleteQuarter.change}%`,
      tone: lastCompleteQuarter.change > 5 ? 'neg' : 'pos'
    }
  ];

  const groups = [
    {
      group: 'Workload',
      items: [
        {
          dot: avgOpenAge > 10 ? 'var(--red)' : avgOpenAge > 7 ? 'var(--amber)' : 'var(--green)',
          title: 'Avg open ticket age',
          sub: avgOpenAge > 7 ? 'Tickets aging — capacity concern' : 'Within normal range',
          badge: `${avgOpenAge}d`,
          tone: avgOpenAge > 10 ? 'bad' : avgOpenAge > 7 ? 'warn' : 'good'
        },
        {
          dot: (openByTechList[0]?.count || 0) > 24 ? 'var(--red)' : 'var(--amber)',
          title: 'Highest tech open load',
          sub: openByTechList[0]?.name
            ? `${openByTechList[0].name} has highest load`
            : 'No open tickets',
          badge: `${openByTechList[0]?.count || 0} tickets`,
          tone: (openByTechList[0]?.count || 0) > 24 ? 'bad' : 'warn'
        },
        {
          dot: avgOpen > 24 ? 'var(--red)' : avgOpen > 12 ? 'var(--amber)' : 'var(--green)',
          title: 'Avg open tickets per tech',
          sub: avgOpen > 12 ? 'Team load elevated' : 'Team load acceptable',
          badge: `${avgOpen} tickets`,
          tone: avgOpen > 24 ? 'bad' : avgOpen > 12 ? 'warn' : 'good'
        }
      ]
    },
    {
      group: 'SLA & quality',
      items: [
        {
          dot: avgResolutionDays > 7 ? 'var(--red)' : avgResolutionDays > 5 ? 'var(--amber)' : 'var(--green)',
          title: 'Avg resolution time',
          sub: avgResolutionDays > 5 ? 'Resolution slowing down' : 'Resolving at healthy pace',
          badge: `${avgResolutionDays}d`,
          tone: avgResolutionDays > 7 ? 'bad' : avgResolutionDays > 5 ? 'warn' : 'good'
        },
        {
          dot: slaBreachRate > 10 ? 'var(--red)' : slaBreachRate > 2 ? 'var(--amber)' : 'var(--green)',
          title: 'SLA breach rate',
          sub: slaBreachRate > 10 ? 'Significant breach rate — service risk'
            : slaBreachRate > 2 ? 'Elevated breach rate'
            : 'Within acceptable range',
          badge: `${slaBreachRate}%`,
          tone: slaBreachRate > 10 ? 'bad' : slaBreachRate > 2 ? 'warn' : 'good'
        }
      ]
    },
    {
      group: 'Staffing',
      items: [
        {
          dot: 'var(--slate)',
          title: 'Active technicians',
          sub: 'Currently assigned to open tickets',
          badge: `${openByTechList.length}`,
          tone: 'neutral'
        }
      ]
    }
  ];

  const toneStyle = {
    bad:     { color: '#991b1b', bg: 'var(--red-soft)' },
    warn:    { color: '#854d0e', bg: 'var(--amber-soft)' },
    good:    { color: '#14532d', bg: 'var(--green-soft)' },
    neutral: { color: 'var(--ink3)', bg: 'var(--slate-soft)' }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Volume signals */}
      <div>
        <div className="it-eyebrow" style={{ marginBottom: 10 }}>Volume signals</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {volumeSignals.map(v => (
            <div key={v.label} className="it-card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink)' }}>{v.label}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 8 }}>
                    <div>
                      <div className="it-mono" style={{ fontSize: 11, color: 'var(--ink4)' }}>{v.a.period}</div>
                      <div className="it-mono" style={{ fontSize: 22, color: 'var(--ink3)', marginTop: 2 }}>
                        {v.a.n.toLocaleString()}
                      </div>
                    </div>
                    <div style={{ color: 'var(--ink4)', fontSize: 18 }}>→</div>
                    <div>
                      <div className="it-mono" style={{ fontSize: 11, color: 'var(--ink4)' }}>{v.b.period}</div>
                      <div className="it-mono" style={{ fontSize: 22, color: 'var(--ink)', marginTop: 2 }}>
                        {v.b.n.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="it-mono" style={{
                  fontSize: 13, fontWeight: 600,
                  padding: '6px 14px', borderRadius: 999,
                  background: v.tone === 'neg' ? 'var(--red-soft)' : 'var(--green-soft)',
                  color: v.tone === 'neg' ? 'var(--red)' : 'var(--green)'
                }}>
                  {v.pct}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Operational signals */}
      <div>
        <div className="it-eyebrow" style={{ marginBottom: 10 }}>Operational signals</div>
        <div className="it-card" style={{ padding: 0, overflow: 'hidden' }}>
          {groups.map((grp, gi) => (
            <div key={grp.group}>
              <div style={{
                padding: '10px 20px',
                background: '#fafbfc',
                borderTop: gi === 0 ? 0 : '1px solid var(--border)',
                borderBottom: '1px solid var(--border)'
              }}>
                <div className="it-mono" style={{
                  fontSize: 11, color: 'var(--ink3)',
                  textTransform: 'uppercase', letterSpacing: '0.06em'
                }}>
                  {grp.group}
                </div>
              </div>
              {grp.items.map((item, i) => {
                const t = toneStyle[item.tone];
                return (
                  <div key={item.title} style={{
                    display: 'grid',
                    gridTemplateColumns: '14px 1fr auto',
                    gap: 12, alignItems: 'center',
                    padding: '14px 20px',
                    borderTop: i === 0 ? 0 : '1px solid var(--border)'
                  }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: 999,
                      background: item.dot, marginLeft: 2
                    }} />
                    <div>
                      <div style={{ fontSize: 13.5, color: 'var(--ink)' }}>{item.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 1 }}>{item.sub}</div>
                    </div>
                    <div className="it-mono" style={{
                      fontSize: 12, fontWeight: 500,
                      padding: '4px 10px', borderRadius: 999,
                      background: t.bg, color: t.color
                    }}>
                      {item.badge}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Cache info + full refresh */}
      <div className="it-card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="it-section-title">Data cache</div>
            {cacheInfo && (
              <div className="it-mono" style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 4 }}>
                Historical cache built: {new Date(cacheInfo.historicalBuiltAt).toLocaleString()} · {cacheInfo.totalTickets.toLocaleString()} total tickets
              </div>
            )}
            <div style={{ fontSize: 12.5, color: 'var(--ink3)', marginTop: 8, maxWidth: 540 }}>
              Regular sync only refreshes the last 30 days. Use Full refresh to rebuild the complete historical dataset. This will take several minutes.
            </div>
          </div>
          <button
            className="it-btn"
            onClick={onFullRefresh}
            disabled={!!fullRefreshStep}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              style={fullRefreshStep ? { animation: 'it-spin 1s linear infinite' } : {}}>
              <path d="M3 12a9 9 0 1 0 3-6.7L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
            {fullRefreshStep || 'Full refresh'}
          </button>
        </div>
      </div>

    </div>
  );
}