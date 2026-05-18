export function MetricCard({ eyebrow, value, foot, footTone, subtext, children }) {
  const footColor =
    footTone === 'pos' ? 'var(--green)' :
    footTone === 'neg' ? 'var(--red)' :
    footTone === 'warn' ? 'var(--amber)' :
    'var(--ink3)';

  return (
    <div className="it-card" style={{ padding: '18px 20px 16px' }}>
      <div className="it-eyebrow">{eyebrow}</div>
      <div style={{
        fontSize: 30,
        fontWeight: 500,
        lineHeight: 1.05,
        letterSpacing: '-0.02em',
        color: 'var(--ink)',
        marginTop: 6,
        fontVariantNumeric: 'tabular-nums'
      }}>
        {value}
      </div>
      {foot && (
        <div style={{
          marginTop: 8,
          fontSize: 12.5,
          color: footColor
        }}>
          {foot}
        </div>
      )}
      {subtext && (
        <div className="it-mono" style={{
          fontSize: 11,
          color: 'var(--ink4)',
          marginTop: 6
        }}>
          {subtext}
        </div>
      )}
      {children}
    </div>
  );
}