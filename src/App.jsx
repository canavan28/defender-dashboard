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

  // Preview mode — owner-only. Lets an owner see the app exactly as any
  // configured person would, without needing that person's actual
  // credentials. realIsOwner is captured separately from `access` because
  // `access` gets overwritten with the previewed person's (always
  // non-owner) profile while previewing, but the preview control itself
  // must stay visible/functional based on who's REALLY logged in.
  const [realAccess, setRealAccess] = useState(null);
  const [previewOid, setPreviewOid] = useState(null);
  const [previewList, setPreviewList] = useState([]);

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
        setRealAccess(resolved);
        setActiveCategory(resolved.defaultCategory);
        setActiveTab(resolved.defaultTab || firstTabOf(resolved.defaultCategory));
        setAccessLoaded(true);

        if (resolved.isOwner) {
          api.mePreviewList()
            .then((list) => { if (!cancelled) setPreviewList(list || []); })
            .catch(() => {});
        }
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

  const startPreview = async (oid) => {
    if (!oid) return;
    try {
      const res = await api.mePreview(oid);
      const resolved = {
        isOwner: false,
        categories: res.categories || ['operations'],
        defaultCategory: res.defaultCategory || 'operations',
        defaultTab: res.defaultTab || null,
        previewName: res.name,
      };
      setAccess(resolved);
      setPreviewOid(oid);
      setActiveCategory(resolved.defaultCategory);
      setActiveTab(resolved.defaultTab || firstTabOf(resolved.defaultCategory));
      setAiFilter(null);
    } catch (err) {
      console.error('[Preview] Failed to load preview access:', err.message);
    }
  };

  const exitPreview = () => {
    if (!realAccess) return;
    setAccess(realAccess);
    setPreviewOid(null);
    setActiveCategory(realAccess.defaultCategory);
    setActiveTab(realAccess.defaultTab || firstTabOf(realAccess.defaultCategory));
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

      {/* Preview-as control — owner-only, always checked against realAccess
          (the actual logged-in user), never the currently-effective
          previewed access. */}
      {realAccess?.isOwner && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 24px', background: previewOid ? '#fef3c7' : 'var(--card)',
          borderBottom: '1px solid var(--border)'
        }}>
          {previewOid ? (
            <>
              <span className="it-mono" style={{ fontSize: 12.5, color: '#854d0e' }}>
                Previewing as <strong>{access.previewName}</strong> — this is what they'd see, not you
              </span>
              <button
                onClick={exitPreview}
                className="it-mono"
                style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #d97706', background: 'white', color: '#854d0e', fontSize: 12, cursor: 'pointer' }}
              >
                Exit preview
              </button>
            </>
          ) : (
            <>
              <span className="it-mono" style={{ fontSize: 11.5, color: 'var(--ink4)' }}>Preview as another user (testing only)</span>
              <select
                value=""
                onChange={(e) => startPreview(e.target.value)}
                style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 12, fontFamily: 'inherit' }}
              >
                <option value="">Select a person…</option>
                {previewList.map((p) => (
                  <option key={p.oid} value={p.oid}>{p.name}</option>
                ))}
              </select>
            </>
          )}
        </div>
      )}

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
