import { useEffect, useState } from 'react';
import { TopBar } from './components/TopBar';
import { NavTabs } from './components/NavTabs';
import { TicketOverview } from './modules/TicketOverview';
import { TechCapacity } from './modules/TechCapacity';
import { TimeAnalytics } from './modules/TimeAnalytics';
import { SLAHealth } from './modules/SLAHealth';
import { StaffingSignals } from './modules/StaffingSignals';
import { useDashboard } from './hooks/useDashboard';
import { useTicketMetrics } from './hooks/useTicketMetrics';

export default function App() {
  const {
    rawData, loading, fullRefreshStep, error,
    lastSynced, selectedQuarterKey, setSelectedQuarterKey,
    sync, fullRefresh
  } = useDashboard();

  const metrics = useTicketMetrics(rawData, selectedQuarterKey);
  const [activeTab, setActiveTab] = useState('Ticket overview');

  useEffect(() => { sync(); }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f4f5f7' }}>
      <TopBar lastSynced={lastSynced} loading={loading} onSync={sync} />
      <NavTabs active={activeTab} onChange={setActiveTab} />

      <main className="flex-1 px-8 py-7">
        {loading && !rawData && (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <p className="text-sm"
              style={{ color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace' }}>
              Pulling data from AutoTask...
            </p>
            <p className="text-xs"
              style={{ color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace' }}>
              First load may take a few minutes while building the cache
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-xl p-5 mb-6"
            style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--red)' }}>
              Connection error
            </p>
            <p className="text-xs"
              style={{ color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace' }}>
              {error}
            </p>
          </div>
        )}

        {metrics && (
          <>
            {activeTab === 'Ticket overview' && (
              <TicketOverview
                metrics={metrics}
                selectedQuarterKey={selectedQuarterKey}
                onSelectQuarter={setSelectedQuarterKey}
              />
            )}
            {activeTab === 'Tech capacity' && (
              <TechCapacity
                metrics={metrics}
                selectedQuarterKey={selectedQuarterKey}
                onSelectQuarter={setSelectedQuarterKey}
              />
            )}
            {activeTab === 'Time analytics' && (
              <TimeAnalytics
                metrics={metrics}
                selectedQuarterKey={selectedQuarterKey}
                onSelectQuarter={setSelectedQuarterKey}
              />
            )}
            {activeTab === 'SLA health' && (
              <SLAHealth
                metrics={metrics}
                selectedQuarterKey={selectedQuarterKey}
                onSelectQuarter={setSelectedQuarterKey}
              />
            )}
            {activeTab === 'Staffing signals' && (
              <StaffingSignals
                metrics={metrics}
                fullRefreshStep={fullRefreshStep}
                onFullRefresh={fullRefresh}
                cacheInfo={rawData?.cacheInfo}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}