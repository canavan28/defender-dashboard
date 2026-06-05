import { useState, useCallback, useRef } from 'react';

export function useAIReview(api) {
  const [flags, setFlags] = useState([]);
  const [exclusions, setExclusions] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [lastRun, setLastRun] = useState(null);
  const [reviewStats, setReviewStats] = useState({});
  const [trends, setTrends] = useState(null);
  const [running, setRunning] = useState(false);
  const [runState, setRunState] = useState({ progress: 0, phase: 0 });
  const [error, setError] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [prompts, setPrompts] = useState({ ticketReview: '', trendAnalysis: '' });
  const [ignoredTrends, setIgnoredTrends] = useState([]);
  const [techAnalysis, setTechAnalysis] = useState({});
  const [techAnalysisRunning, setTechAnalysisRunning] = useState(null); // techId currently running
  const pollRef = useRef(null);

  const applyStatus = (status) => {
    setFlags(status.flags || []);
    setExclusions(status.exclusions || []);
    setLastRun(status.lastReviewRun);
    setReviewStats(status.reviewStats || {});
    if (status.trends) setTrends(status.trends);
    if (status.prompts) setPrompts(status.prompts);
    if (status.ignoredTrends) setIgnoredTrends(status.ignoredTrends);
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const startPolling = useCallback(() => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const status = await api.aiReview.status();

        // Map backend progress/phase to frontend runState
        const phaseMap = {
          'Fetching tickets': 0,
          'Fetching company names': 0,
          'Analyzing': 1,
          'Analyzing long-term trends': 2,
          'Complete': 3,
          'Failed': 3
        };
        const phaseIdx = Object.entries(phaseMap).find(([key]) =>
          status.runPhase?.startsWith(key)
        )?.[1] ?? 1;

        setRunState({ progress: status.runProgress || 0, phase: phaseIdx });

        if (!status.running) {
          stopPolling();
          setRunning(false);
          setRunState({ progress: 100, phase: 3 });

          if (status.runError) {
            setError(status.runError);
          } else {
            applyStatus(status);
            setLastRun(new Date().toISOString());
          }
        }
      } catch (err) {
        console.error('[AIReview] Poll error:', err.message);
      }
    }, 4000);
  }, [api]);

  const loadStatus = useCallback(async () => {
    if (!api?.aiReview) return;
    try {
      const [status, companiesRes] = await Promise.all([
        api.aiReview.status(),
        api.aiReview.companies()
      ]);
      applyStatus(status);
      setCompanies((companiesRes.companies || []).map(c => c.name));

      // If a review is already running (e.g. server restarted mid-run), start polling
      if (status.running) {
        setRunning(true);
        setRunState({ progress: status.runProgress || 0, phase: 0 });
        startPolling();
      }

      setLoaded(true);
    } catch (err) {
      console.error('[AIReview] Failed to load status:', err.message);
      setLoaded(true);
    }
  }, [startPolling]);

  const runReview = useCallback(async () => {
    if (!api?.aiReview) return;
    setRunning(true);
    setError(null);
    setRunState({ progress: 2, phase: 0 });

    try {
      const result = await api.aiReview.run();
      if (result.alreadyRunning) {
        // Already in progress — just start polling to track it
        setRunState({ progress: result.progress || 2, phase: 0 });
        startPolling();
        return;
      }
      if (result.started) {
        // Fire-and-forget confirmed — start polling for progress
        startPolling();
      } else {
        setRunning(false);
        setError('Failed to start review');
      }
    } catch (err) {
      setRunning(false);
      setError(err.message);
    }
  }, [startPolling]);

  const setAction = useCallback(async (ticketId, action) => {
    setFlags(prev => prev.map(f => f.id === ticketId ? { ...f, action } : f));
    try {
      await api.aiReview.action(ticketId, action);
    } catch (err) {
      console.error('[AIReview] Action failed:', err.message);
    }
  }, []);

  const addExclusion = useCallback(async (companyId, companyName, reason) => {
    try {
      const result = await api.aiReview.addExclusion(companyId, companyName, reason);
      setExclusions(result.exclusions || []);
    } catch (err) {
      console.error('[AIReview] Add exclusion failed:', err.message);
    }
  }, []);

  const removeExclusion = useCallback(async (companyId) => {
    try {
      const result = await api.aiReview.removeExclusion(companyId);
      setExclusions(result.exclusions || []);
    } catch (err) {
      console.error('[AIReview] Remove exclusion failed:', err.message);
    }
  }, []);

  const loadTechAnalysis = useCallback(async () => {
    try {
      const result = await api.aiReview.getTechAnalysis();
      setTechAnalysis(result.techAnalysis || {});
    } catch (err) {
      console.error('[TechAnalysis] Failed to load:', err.message);
    }
  }, []);

  const runTechAnalysis = useCallback(async (techId) => {
    setTechAnalysisRunning(techId);
    try {
      const result = await api.aiReview.analyzeTech(techId);
      if (result.ok && result.analysis) {
        setTechAnalysis(prev => ({ ...prev, [techId]: result.analysis }));
      }
    } catch (err) {
      console.error('[TechAnalysis] Failed to run:', err.message);
    } finally {
      setTechAnalysisRunning(null);
    }
  }, []);

  const ignoreTrend = useCallback(async (key) => {
    setIgnoredTrends(prev => prev.includes(key) ? prev : [...prev, key]);
    try {
      const result = await api.aiReview.ignoreTrend(key);
      setIgnoredTrends(result.ignoredTrends || []);
    } catch (err) {
      console.error('[AIReview] Ignore trend failed:', err.message);
    }
  }, []);

  const unignoreTrend = useCallback(async (key) => {
    setIgnoredTrends(prev => prev.filter(k => k !== key));
    try {
      const result = await api.aiReview.unignoreTrend(key);
      setIgnoredTrends(result.ignoredTrends || []);
    } catch (err) {
      console.error('[AIReview] Unignore trend failed:', err.message);
    }
  }, []);

  const loadPrompts = useCallback(async () => {
    try {
      const result = await api.aiReview.getPrompts();
      setPrompts(result);
    } catch (err) {
      console.error('[AIReview] Failed to load prompts:', err.message);
    }
  }, []);

  const savePrompts = useCallback(async (ticketReview, trendAnalysis) => {
    try {
      const result = await api.aiReview.savePrompts(ticketReview, trendAnalysis);
      if (result.ok) setPrompts(result.prompts);
      return result.ok;
    } catch (err) {
      console.error('[AIReview] Failed to save prompts:', err.message);
      return false;
    }
  }, []);

  const resetPrompts = useCallback(async () => {
    try {
      const result = await api.aiReview.resetPrompts();
      setPrompts({ ticketReview: result.ticketReview, trendAnalysis: result.trendAnalysis });
      return result; // return full result so PromptsPanel can update its local state
    } catch (err) {
      console.error('[AIReview] Failed to reset prompts:', err.message);
      return null;
    }
  }, []);

  return {
    flags, exclusions, companies,
    lastRun, reviewStats, trends,
    running, runState,
    error, loaded,
    loadStatus, runReview, setAction,
    addExclusion, removeExclusion,
    prompts, loadPrompts, savePrompts, resetPrompts,
    ignoredTrends, ignoreTrend, unignoreTrend,
    techAnalysis, techAnalysisRunning, loadTechAnalysis, runTechAnalysis
  };
}