const TABS = [
  { id: 'Ticket overview',  label: 'Ticket overview' },
  { id: 'Tech capacity',    label: 'Tech capacity' },
  { id: 'Time analytics',   label: 'Time analytics' },
  { id: 'SLA health',       label: 'SLA health' },
  { id: 'Staffing signals', label: 'Staffing signals' },
  { id: 'AI Review',        label: 'AI Review', isAI: true },
  { id: 'Action Items',     label: 'Action Items', isAction: true },
  { id: 'Inside Sales',     label: 'Inside Sales' },
  { id: 'VTO',              label: 'VTO', isOwnerOnly: true },
];

export function NavTabs({ active, onChange, aiUnactionedCount = 0, actionItemsCount = 0, isOwner = false }) {
  const visibleTabs = TABS.filter(tab => !tab.isOwnerOnly || isOwner);

  return (
    <nav style={{
      display: 'flex',
      gap: 2,
      borderBottom: '1px solid var(--border)',
      padding: '0 24px',
      background: 'var(--card)'
    }}>
      {visibleTabs.map(tab => {
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
                ? (tab.isAI || tab.isAction ? 'var(--ai-deep)' : (tab.isOwnerOnly ? '#c66a3a' : 'var(--ink)'))
                : 'var(--ink3)',
              fontWeight: 500,
              borderBottom: isActive
                ? `2px solid ${tab.isAI || tab.isAction ? 'var(--ai)' : (tab.isOwnerOnly ? '#c66a3a' : 'var(--blue)')}`
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
            {tab.isAction && (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2">
                <path d="M9 11l3 3L22 4"/>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
            )}
            {tab.isOwnerOnly && (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2">
                <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/>
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
            {tab.isAction && actionItemsCount > 0 && (
              <span style={{
                background: isActive ? 'var(--ai)' : 'var(--ai-soft)',
                color: isActive ? 'white' : 'var(--ai-deep)',
                fontSize: 11,
                fontWeight: 600,
                padding: '1px 7px',
                borderRadius: 999,
                fontFamily: 'var(--mono)'
              }}>
                {actionItemsCount}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}