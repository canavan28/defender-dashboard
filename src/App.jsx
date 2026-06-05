import { useEffect, useState } from 'react';
import { TopBar } from './components/TopBar';
import { NavTabs } from './components/NavTabs';
import { TicketOverview } from './modules/TicketOverview';
import { TechCapacity } from './modules/TechCapacity';
import { TimeAnalytics } from './modules/TimeAnalytics';
import { SLAHealth } from './modules/SLAHealth';
import { StaffingSignals } from './modules/StaffingSignals';
import { AIReview } from './modules/AIReview';
import { ActionItems } from './modules/ActionItems';
import { useDashboard } from './hooks/useDashboard';
import { useTicketMetrics } from './hooks/useTicketMetrics';
import { useAuth } from './hooks/useAuth';
import { useAIReview } from './hooks/useAIReview';
import { createApi } from './utils/api';

export default function App() {
  const { account, loading: authLoading, error: authError, logout, getToken } = useAuth();
  const api = createApi(getToken);

  const {
    rawData, loading, fullRefreshStep, error,
    lastSynced, selectedQuarterKey, setSelectedQuarterKey,
    sync, fullRefresh
  } = useDashboard(getToken);

  const metrics = useTicketMetrics(rawData, selectedQuarterKey);
  const aiReview = useAIReview(api);
  const [activeTab, setActiveTab] = useState('Ticket overview');
  const [aiFilter, setAiFilter] = useState(null);

  useEffect(() => { if (account) sync(); }, [account]);

  const unactionedCount = aiReview.flags.filter(f => f.action === 'unactioned').length;
  const criticalUnactionedCount = aiReview.flags.filter(
    f => f.action === 'unactioned' && f.sev === 'critical'
  ).length;
  const actionItemsCount = aiReview.flags.filter(
    f => f.action === 'escalated' || f.action === 'assigned'
  ).length;

  const handleCriticalFlagsClick = () => {
    setAiFilter('critical');
    setActiveTab('AI Review');
  };

  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <img src="/infotank-logo.png" alt="InfoTank" style={{ height: 32, marginBottom: 20 }} />
          <p className="it-mono" style={{ fontSize: 13, color: 'var(--ink3)' }}>Signing in...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)'
      }}>
        <div className="it-card" style={{ padding: 32, maxWidth: 400, textAlign: 'center' }}>
          <p style={{ color: 'var(--red)', marginBottom: 8 }}>Authentication error</p>
          <p className="it-mono" style={{ fontSize: 12, color: 'var(--ink3)' }}>{authError}</p>
        </div>
      </div>
    );
  }

  if (!account) return null;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      <TopBar
        lastSynced={lastSynced}
        loading={loading}
        onSync={sync}
        account={account}
        onLogout={logout}
        cacheInfo={rawData?.cacheInfo}
      />
      <NavTabs
        active={activeTab}
        onChange={(tab) => {
          setActiveTab(tab);
          if (tab !== 'AI Review') setAiFilter(null);
        }}
        aiUnactionedCount={unactionedCount}
        actionItemsCount={actionItemsCount}
      />

      <main style={{ flex: 1, padding: '20px 24px 28px' }}>
        {loading && !rawData && (
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            height: 256, gap: 12
          }}>
            <p className="it-mono" style={{ fontSize: 13, color: 'var(--ink3)' }}>
              Pulling data from AutoTask...
            </p>
            <p className="it-mono" style={{ fontSize: 11, color: 'var(--ink4)' }}>
              First load may take a few minutes while building the cache
            </p>
          </div>
        )}

        {error && (
          <div style={{
            background: 'var(--red-soft)', border: '1px solid #fecaca',
            borderRadius: 10, padding: 20, marginBottom: 16
          }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--red)', marginBottom: 4 }}>
              Connection error
            </p>
            <p className="it-mono" style={{ fontSize: 12, color: 'var(--ink3)' }}>{error}</p>
          </div>
        )}

        {metrics && (
          <>
            {activeTab === 'Ticket overview' && (
              <TicketOverview
                metrics={metrics}
                selectedQuarterKey={selectedQuarterKey}
                onSelectQuarter={setSelectedQuarterKey}
                criticalFlagsCount={criticalUnactionedCount}
                onCriticalFlagsClick={handleCriticalFlagsClick}
              />
            )}
            {activeTab === 'Tech capacity' && (
              <TechCapacity
                metrics={metrics}
                selectedQuarterKey={selectedQuarterKey}
                onSelectQuarter={setSelectedQuarterKey}
                aiReview={aiReview}
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

        {activeTab === 'AI Review' && (
          <AIReview aiReview={aiReview} initialSevFilter={aiFilter} syncInProgress={loading} />
        )}

        {activeTab === 'Action Items' && (
          <ActionItems aiReview={aiReview} />
        )}
      </main>
    </div>
  );
}
