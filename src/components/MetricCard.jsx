export function MetricCard({ label, value, delta, deltaDir }) {
  const deltaColor =
    deltaDir === 'up-bad' ? 'text-[var(--red)]' :
    deltaDir === 'down-good' ? 'text-[var(--green)]' :
    'text-[var(--text-secondary)]';

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      className="rounded-xl p-5">
      <p style={{ color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace' }}
        className="text-xs uppercase tracking-widest mb-3">{label}</p>
      <p className="text-3xl font-light mb-2" style={{ color: 'var(--text-primary)' }}>{value}</p>
      {delta && (
        <p className={`text-xs font-medium ${deltaColor}`}>{delta}</p>
      )}
    </div>
  );
}
