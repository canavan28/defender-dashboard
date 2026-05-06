import { useEffect, useState } from 'react';
import { TopBar } from './components/TopBar';
import { NavTabs } from './components/NavTabs';
import { TicketOverview } from './modules/TicketOverview';
import { TechCapacity } from './modules/TechCapacity';
import { SLAHealth } from './modules/SLAHealth';
import { StaffingSignals } from './modules/StaffingSignals';
import { useDashboard } from './hooks/useDashboard';

export default function App() {
  const { data, loading, error, lastSynced, sync } = useDashboard();
  const [activeTab, setActiveTab] = useState('Ticket overview');

  // Auto-sync on first load
  useEffect(() => { sync(); }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0e0f11' }}>
      <TopBar lastSynced={lastSynced} loading={loading} onSync={sync} />
      <NavTabs active={activeTab} onChange={setActiveTab} />

      <main className="flex-1 px-8 py-7">
        {loading && !data && (
          <div className="flex items-center justify-center h-64">
            <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace' }}>
              Pulling data from AutoTask...
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-xl p-5 mb-6"
            style={{ background: 'rgba(224,92,92,0.1)', border: '1px solid rgba(224,92,92,0.3)' }}>
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--red)' }}>Connection error</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace' }}>
              {error}
            </p>
          </div>
        )}

        {data && (
          <>
            {activeTab === 'Ticket overview'  && <TicketOverview data={data} />}
            {activeTab === 'Tech capacity'    && <TechCapacity data={data} />}
            {activeTab === 'SLA health'       && <SLAHealth data={data} />}
            {activeTab === 'Staffing signals' && <StaffingSignals data={data} />}
          </>
        )}
      </main>
    </div>
  );
}
