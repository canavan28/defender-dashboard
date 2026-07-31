import { useEffect, useState, useMemo } from 'react';
import { TopBar } from './components/TopBar';
import { NavTabs, CATEGORIES } from './components/NavTabs';
import { TicketOverview } from './modules/TicketOverview';
import { TechCapacity } from './modules/TechCapacity';
import { TimeAnalytics } from './modules/TimeAnalytics';
import { SLAHealth } from './modules/SLAHealth';
import { StaffingSignals } from './modules/StaffingSignals';
import { AIReview } from './modules/AIReview';
import { ActionItems } from './modules/ActionItems';
import { VTOTab } from './modules/VTO';
import { InsideSales } from './modules/InsideSales';
import { CustomerSuccess } from './modules/CustomerSuccess';
import { LicenseAudit } from './modules/LicenseAudit';
import { useDashboard } from './hooks/useDashboard';
import { useTicketMetrics } from './hooks/useTicketMetrics';
import { useAuth } from './hooks/useAuth';
import { useAIReview } from './hooks/useAIReview';
import { useUpsells } from './hooks/useUpsells';
import { useCustomerSuccess } from './hooks/useCustomerSuccess';
import { useLicenseAudit } from './hooks/useLicenseAudit';
import { createApi } from './utils/api';

// First sub-tab of a category, used whenever a category has no explicit
// defaultTab (e.g. clicking into a category directly) or none was returned
// by /api/me for some reason.
function firstTabOf(categoryId) {
  const cat = CATEGORIES.find((c) => c.id === categoryId);
  return cat?.tabs?.[0]?.id || null;
}

export default function App() {
  const { account, loading: authLoading, error: authError, logout, getToken } = useAuth();
  const api = useMemo(() => createApi(getToken), [getToken]);

  const {
    rawData, loading, fullRefreshStep, error,
    lastSynced, selectedQuarterKey, setSelectedQuarterKey,
    sync, fullRefresh
  } = useDashboard(getToken);

  const metrics = useTicketMetrics(rawData, selectedQuarterKey);
  const aiReview = useAIReview(api);
  const upsells = useUpsells(api);
  const cs = useCustomerSuccess(getToken);
  const licenseAudit = useLicenseAudit(getToken);

  const [aiFilter, setAiFilter] = useState(null);

  // Access info from /api/me: fails closed (only 'operations', no owner
  // access) until positively confirmed, same defensive pattern the old
  // isOwner-only check used — never show anything optimistically while
  // this is loading or if the request errors.
  const [access, setAccess] = useState({
    isOwner: false,
    categories: ['operations'],
    defaultCategory: 'operations',
    defaultTab: null,
  });
  const [accessLoaded, setAccessLoaded] = useState(false);

  const [activeCategory, setActiveCategory] = useState(null);
  const [activeTab, setActiveTab] = useState(null);

  useEffect(() => { if (account) sync(); }, [account]);

  useEffect(() => {
    if (!account) return;
    let cancelled = false;
    api.me()
      .then((res) => {
        if (cancelled) return;
        const resolved = {
          isOwner: !!res.isOwner,
          categories: res.categories || ['operations'],
          defaultCategory: res.defaultCategory || 'operations',
          defaultTab: res.defaultTab || null,
        };
        setAccess(resolved);
        setActiveCategory(resolved.defaultCategory);
        setActiveTab(resolved.defaultTab || firstTabOf(resolved.defaultCategory));
        setAccessLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setAccessLoaded(true); // fails closed to the operations-only default already in state
        setActiveCategory('operations');
        setActiveTab(firstTabOf('operations'));
      });
    return () => { cancelled = true; };
  }, [account]);

  const goHome = () => {
    setActiveCategory(access.defaultCategory);
    setActiveTab(access.defaultTab || firstTabOf(access.defaultCategory));
    setAiFilter(null);
  };

  const handleChangeCategory = (categoryId) => {
    setActiveCategory(categoryId);
    setActiveTab(firstTabOf(categoryId));
    setAiFilter(null);
  };

  const handleChangeTab = (tabId) => {
    setActiveTab(tabId);
    if (tabId !== 'AI Review') setAiFilter(null);
  };

  const unactionedCount = aiReview.flags.filter(f => f.action === 'unactioned').length;
  const criticalUnactionedCount = aiReview.flags.filter(
    f => f.action === 'unactioned' && f.sev === 'critical'
  ).length;
  const actionItemsCount = aiReview.flags.filter(
    f => f.action === 'escalated' || f.action === 'assigned'
  ).length;

  const handleCriticalFlagsClick = () => {
    setAiFilter('critical');
    setActiveCategory('operations');
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
        onLogoClick={accessLoaded ? goHome : undefined}
      />
      {accessLoaded && (
        <NavTabs
          categories={access.categories}
          isOwner={access.isOwner}
          activeCategory={activeCategory}
          activeTab={activeTab}
          onChangeCategory={handleChangeCategory}
          onChangeTab={handleChangeTab}
          aiUnactionedCount={unactionedCount}
          actionItemsCount={actionItemsCount}
        />
      )}

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

        {activeCategory === 'finance' && !activeTab && (
          <div className="it-card" style={{ padding: 32, textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: 'var(--ink3)' }}>Finance tabs are coming soon.</p>
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

        {activeTab === 'Inside Sales' && (
          <InsideSales upsells={upsells} />
        )}

        {activeTab === 'Customer Success' && (
          <CustomerSuccess cs={cs} companyMap={rawData?.companyMap} />
        )}

        {activeTab === 'License Audit' && (
          <LicenseAudit licenseAudit={licenseAudit} />
        )}

        {activeTab === 'VTO' && access.isOwner && (
          <VTOTab getToken={getToken} currentUserName={account?.name} />
        )}
      </main>
    </div>
  );
}
