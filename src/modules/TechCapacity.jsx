import { MetricCard } from '../components/MetricCard';
import { QuarterSelector } from '../components/QuarterSelector';

export function TechCapacity({ metrics, selectedQuarterKey, onSelectQuarter }) {
  if (!metrics) return null;
  const { openByTechList, closedByTechList, selectedQLabel, quarterlyTrend, avgOpenAge } = metrics;

  const maxOpen = Math.max(24, ...(openByTechList.map(t => t.count)));
  const maxClosed = closedByTechList[0]?.count || 1;

  const loadStatus = (n) => {
    if (n <= 12) return { color: 'var(--green)', label: 'healthy' };
    if (n <= 24) return { color: 'var(--amber)', label: 'moderate' };
    return { color: 'var(--red)', label: 'high' };
  };

  const activeCount = openByTechList.length;
  const avgOpen = activeCount
    ? Math.round(openByTechList.reduce((s, t) => s + t.count, 0) / activeCount)
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <MetricCard eyebrow="Active technicians" value={activeCount}
          foot="With open tickets" />
        <MetricCard eyebrow="Avg open tickets" value={avgOpen}
          foot={avgOpen <= 12 ? 'Within healthy range' : avgOpen <= 24 ? 'Moderate load' : 'Above healthy threshold'}
          footTone={avgOpen <= 12 ? 'pos' : avgOpen <= 24 ? 'warn' : 'neg'} />
        <MetricCard eyebrow="Avg ticket age"
          value={<>{avgOpenAge}<span style={{ fontSize: 16, color: 'var(--ink3)', marginLeft: 2 }}>d</span></>}
          foot="Days since created"
          footTone={avgOpenAge > 7 ? 'warn' : 'pos'} />
      </div>

      {/* Quarter selector */}
      <div className="it-card" style={{ padding: '0 18px' }}>
        <QuarterSelector
          quarters={quarterlyTrend}
          selectedKey={selectedQuarterKey}
          onChange={onSelectQuarter}
          label="Closed tickets period:"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Open tickets */}
        <div className="it-card" style={{ padding: 20 }}>
          <div className="it-section-title">Current open tickets</div>
          <div className="it-section-sub" style={{ marginBottom: 20 }}>
            Live workload · ≤12 healthy · ≤24 moderate · &gt;24 high
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {openByTechList.map(tech => {
              const status = loadStatus(tech.count);
              return (
                <div key={tech.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '120px 1fr 32px',
                  gap: 14, alignItems: 'center'
                }}>
                  <div style={{
                    fontSize: 13, color: 'var(--ink)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}>
                    {tech.name}
                  </div>
                  <div className="it-bar-track">
                    <div className="it-bar-fill" style={{
                      width: `${(tech.count / maxOpen) * 100}%`,
                      background: status.color
                    }} />
                  </div>
                  <div className="it-mono" style={{
                    fontSize: 13, color: 'var(--ink)', textAlign: 'right'
                  }}>
                    {tech.count}
                  </div>
                </div>
              );
            })}
            {openByTechList.length === 0 && (
              <p style={{ fontSize: 13, color: 'var(--ink3)' }}>No open tickets</p>
            )}
          </div>
        </div>

        {/* Closed tickets */}
        <div className="it-card" style={{ padding: 20 }}>
          <div className="it-section-title">Tickets closed per tech</div>
          <div className="it-section-sub" style={{ marginBottom: 20 }}>
            {selectedQLabel || 'Select a quarter'} · Based on completed date
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {closedByTechList.map(tech => (
              <div key={tech.id} style={{
                display: 'grid',
                gridTemplateColumns: '120px 1fr 32px',
                gap: 14, alignItems: 'center'
              }}>
                <div style={{
                  fontSize: 13, color: 'var(--ink)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>
                  {tech.name}
                </div>
                <div className="it-bar-track">
                  <div className="it-bar-fill" style={{
                    width: `${(tech.count / maxClosed) * 100}%`,
                    background: 'var(--blue)'
                  }} />
                </div>
                <div className="it-mono" style={{
                  fontSize: 13, color: 'var(--ink)', textAlign: 'right'
                }}>
                  {tech.count}
                </div>
              </div>
            ))}
            {closedByTechList.length === 0 && (
              <p style={{ fontSize: 13, color: 'var(--ink3)' }}>
                {selectedQuarterKey ? 'No completed tickets for this quarter' : 'Select a quarter above'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}