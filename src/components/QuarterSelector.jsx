export function QuarterSelector({ quarters, selectedKey, onChange, label = 'Filter by quarter:' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 0' }}>
      <div className="it-mono" style={{ fontSize: 11.5, color: 'var(--ink3)', marginRight: 4 }}>
        {label}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {quarters.map(q => {
          const isActive = selectedKey === q.key;
          const isCurrent = q.isCurrentQuarter;
          return (
            <button
              key={q.key}
              onClick={() => onChange(q.key)}
              className={`it-pill${isActive ? ' active' : ''}${isCurrent ? ' current' : ''}`}
            >
              {q.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}