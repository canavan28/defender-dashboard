const TABS = [
  { id: 'Ticket overview',  label: 'Ticket overview' },
  { id: 'Tech capacity',    label: 'Tech capacity' },
  { id: 'Time analytics',   label: 'Time analytics' },
  { id: 'SLA health',       label: 'SLA health' },
  { id: 'Staffing signals', label: 'Staffing signals' },
  { id: 'AI Review',        label: 'AI Review', isAI: true },
];

export function NavTabs({ active, onChange, aiUnactionedCount = 0 }) {
  return (
    <nav style={{
      display: 'flex',
      gap: 2,
      borderBottom: '1px solid var(--border)',
      padding: '0 24px',
      background: 'var(--card)'
    }}>
      {TABS.map(tab => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              appearance: 'none',
              background: 'none',
              border: 0,
              cursor: 'pointer',
              padding: '14px 14px 13px',
              fontSize: 14,
              color: isActive
                ? (tab.isAI ? 'var(--ai-deep)' : 'var(--ink)')
                : 'var(--ink3)',
              fontWeight: 500,
              borderBottom: isActive
                ? `2px solid ${tab.isAI ? 'var(--ai)' : 'var(--blue)'}`
                : '2px solid transparent',
              marginBottom: -1,
              borderRadius: '6px 6px 0 0',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'color 0.12s, border-color 0.12s',
              fontFamily: 'inherit'
            }}
          >
            {tab.isAI && (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2">
                <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
            {tab.label}
            {tab.isAI && aiUnactionedCount > 0 && (
              <span style={{
                background: isActive ? 'var(--ai)' : 'var(--ai-soft)',
                color: isActive ? 'white' : 'var(--ai-deep)',
                fontSize: 11,
                fontWeight: 600,
                padding: '1px 7px',
                borderRadius: 999,
                fontFamily: 'var(--mono)'
              }}>
                {aiUnactionedCount}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}