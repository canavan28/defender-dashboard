const TABS = ['Ticket overview', 'Tech capacity', 'SLA health', 'Staffing signals'];

export function NavTabs({ active, onChange }) {
  return (
    <nav style={{ borderBottom: '1px solid var(--border)' }}
      className="flex gap-6 px-8">
      {TABS.map(tab => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          style={{
            color: active === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
            borderBottom: active === tab ? '2px solid var(--accent)' : '2px solid transparent',
            fontFamily: 'DM Sans, sans-serif'
          }}
          className="text-sm py-4 transition-colors">
          {tab}
        </button>
      ))}
    </nav>
  );
}
