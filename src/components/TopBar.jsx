export function TopBar({ lastSynced, loading, onSync }) {
  const time = lastSynced
    ? lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <header style={{
      background: 'var(--card)',
      borderBottom: '1px solid var(--border)',
      padding: '14px 24px 13px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img
          src="/infotank-logo.png"
          alt="InfoTank"
          style={{ height: 26 }}
        />
        <div style={{
          height: 22, width: 1,
          background: 'var(--border)',
          marginRight: 2
        }} />
        <div>
          <div style={{
            fontSize: 14, fontWeight: 600,
            color: 'var(--ink)', lineHeight: 1.1
          }}>
            Executive Dashboard
          </div>
          <div className="it-mono" style={{
            fontSize: 11, color: 'var(--ink3)', marginTop: 2
          }}>
            Executive Operations · AutoTask
            {time && ` · Synced ${time}`}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={onSync}
          disabled={loading}
          className="it-btn primary"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2"
            style={loading ? { animation: 'it-spin 1s linear infinite' } : {}}>
            <path d="M3 12a9 9 0 1 0 3-6.7L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
          {loading ? 'Syncing...' : 'Sync data'}
        </button>
      </div>
    </header>
  );
}