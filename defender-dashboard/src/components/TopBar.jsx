export function TopBar({ lastSynced, loading, onSync }) {
  const time = lastSynced
    ? lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <header style={{ borderBottom: '1px solid var(--border)' }}
      className="flex items-center justify-between px-8 py-5">
      <div>
        <h1 className="text-base font-medium tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Defender Technology
        </h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace' }}>
          Executive Operations · AutoTask
          {time && ` · Synced ${time}`}
        </p>
      </div>
      <button
        onClick={onSync}
        disabled={loading}
        style={{
          border: '1px solid var(--border)',
          color: loading ? 'var(--text-secondary)' : 'var(--accent)',
          background: loading ? 'transparent' : 'var(--accent-dim)',
          fontFamily: 'DM Mono, monospace'
        }}
        className="text-xs px-4 py-2 rounded-lg transition-all disabled:cursor-not-allowed">
        {loading ? 'Syncing...' : 'Sync data'}
      </button>
    </header>
  );
}
