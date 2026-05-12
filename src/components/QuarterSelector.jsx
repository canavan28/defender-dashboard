export function QuarterSelector({ quarters, selectedKey, onChange }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {quarters.map(q => (
        <button
          key={q.key}
          onClick={() => onChange(q.key)}
          style={{
            fontSize: 11,
            padding: '4px 12px',
            borderRadius: 20,
            border: `1px solid ${q.isSelected ? 'var(--accent)' : 'var(--border)'}`,
            cursor: 'pointer',
            background: q.isSelected ? 'var(--accent-dim)' : 'transparent',
            color: q.isSelected ? 'var(--accent)' : 'var(--text-secondary)',
            fontFamily: 'DM Mono, monospace',
            fontWeight: q.isCurrentQuarter ? '600' : '400'
          }}>
          {q.label}{q.isCurrentQuarter ? ' ●' : ''}
        </button>
      ))}
    </div>
  );
}