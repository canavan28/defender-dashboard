// Category -> sub-tab structure. "Executive" is owner-only (backend-gated
// too, same as VTO always was); "Finance" currently has no sub-tabs yet —
// rendered as a "coming soon" placeholder in App.jsx rather than an empty
// tab row.
export const CATEGORIES = [
  {
    id: 'operations',
    label: 'Operations',
    tabs: [
      { id: 'Ticket overview', label: 'Ticket overview' },
      { id: 'Tech capacity', label: 'Tech capacity' },
      { id: 'Time analytics', label: 'Time analytics' },
      { id: 'SLA health', label: 'SLA health' },
      { id: 'Staffing signals', label: 'Staffing signals' },
      { id: 'AI Review', label: 'AI Review', isAI: true },
      { id: 'Action Items', label: 'Action Items', isAction: true },
    ],
  },
  {
    id: 'sales',
    label: 'Sales',
    tabs: [
      { id: 'Inside Sales', label: 'Inside Sales' },
    ],
  },
  {
    id: 'customer-success',
    label: 'Customer Success',
    tabs: [
      { id: 'Customer Success', label: 'Customer Success' },
      { id: 'License Audit', label: 'License Audit' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    tabs: [],
  },
  {
    id: 'executive',
    label: 'Executive',
    ownerOnly: true,
    tabs: [
      { id: 'VTO', label: 'VTO' },
    ],
  },
];

export function NavTabs({
  categories,           // array of category ids the current user can see (from /api/me)
  isOwner,
  activeCategory,
  activeTab,
  onChangeCategory,
  onChangeTab,
  aiUnactionedCount = 0,
  actionItemsCount = 0,
}) {
  const visibleCategories = CATEGORIES.filter(
    (cat) => (!cat.ownerOnly || isOwner) && categories.includes(cat.id)
  );
  const currentCategory = visibleCategories.find((c) => c.id === activeCategory);

  return (
    <div>
      {/* Category row */}
      <nav style={{
        display: 'flex', gap: 2, borderBottom: '1px solid var(--border)',
        padding: '0 24px', background: 'var(--card)'
      }}>
        {visibleCategories.map((cat) => {
          const isActive = cat.id === activeCategory;
          return (
            <button
              key={cat.id}
              onClick={() => onChangeCategory(cat.id)}
              style={{
                appearance: 'none', background: 'none', border: 0, cursor: 'pointer',
                padding: '14px 16px 13px', fontSize: 14,
                color: isActive ? (cat.ownerOnly ? '#c66a3a' : 'var(--ink)') : 'var(--ink3)',
                fontWeight: 500,
                borderBottom: isActive ? `2px solid ${cat.ownerOnly ? '#c66a3a' : 'var(--blue)'}` : '2px solid transparent',
                marginBottom: -1, borderRadius: '6px 6px 0 0',
                display: 'flex', alignItems: 'center', gap: 8,
                transition: 'color 0.12s, border-color 0.12s', fontFamily: 'inherit'
              }}
            >
              {cat.ownerOnly && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/>
                </svg>
              )}
              {cat.label}
            </button>
          );
        })}
      </nav>

      {/* Sub-tab row — only rendered when the active category has tabs */}
      {currentCategory && currentCategory.tabs.length > 0 && (
        <nav style={{
          display: 'flex', gap: 2, borderBottom: '1px solid var(--border)',
          padding: '0 24px', background: '#fafbfc'
        }}>
          {currentCategory.tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => onChangeTab(tab.id)}
                style={{
                  appearance: 'none', background: 'none', border: 0, cursor: 'pointer',
                  padding: '11px 14px 10px', fontSize: 13,
                  color: isActive ? (tab.isAI || tab.isAction ? 'var(--ai-deep)' : 'var(--ink)') : 'var(--ink3)',
                  fontWeight: 500,
                  borderBottom: isActive ? `2px solid ${tab.isAI || tab.isAction ? 'var(--ai)' : 'var(--blue)'}` : '2px solid transparent',
                  marginBottom: -1,
                  display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'color 0.12s, border-color 0.12s', fontFamily: 'inherit'
                }}
              >
                {tab.isAI && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
                {tab.isAction && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 11l3 3L22 4"/>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                  </svg>
                )}
                {tab.label}
                {tab.isAI && aiUnactionedCount > 0 && (
                  <span style={{
                    background: isActive ? 'var(--ai)' : 'var(--ai-soft)',
                    color: isActive ? 'white' : 'var(--ai-deep)',
                    fontSize: 10.5, fontWeight: 600, padding: '1px 6px',
                    borderRadius: 999, fontFamily: 'var(--mono)'
                  }}>
                    {aiUnactionedCount}
                  </span>
                )}
                {tab.isAction && actionItemsCount > 0 && (
                  <span style={{
                    background: isActive ? 'var(--ai)' : 'var(--ai-soft)',
                    color: isActive ? 'white' : 'var(--ai-deep)',
                    fontSize: 10.5, fontWeight: 600, padding: '1px 6px',
                    borderRadius: 999, fontFamily: 'var(--mono)'
                  }}>
                    {actionItemsCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}