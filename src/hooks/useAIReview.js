import { useState, useCallback } from 'react';

export function useAIReview(api) {
  const [flags, setFlags] = useState([]);
  const [exclusions, setExclusions] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [lastRun, setLastRun] = useState(null);
  const [reviewStats, setReviewStats] = useState({});
  const [running, setRunning] = useState(false);
  const [runState, setRunState] = useState({ progress: 0, phase: 0 });
  const [error, setError] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const [status, companiesRes] = await Promise.all([
        api.aiReview.status(),
        api.aiReview.companies()
      ]);
      setFlags(status.flags || []);
      setExclusions(status.exclusions || []);
      setLastRun(status.lastReviewRun);
      setReviewStats(status.reviewStats || {});
      setCompanies((companiesRes.companies || []).map(c => c.name));
      setLoaded(true);
    } catch (err) {
      console.error('[AIReview] Failed to load status:', err.message);
      setLoaded(true);
    }
  }, []);

  const runReview = useCallback(async () => {
    setRunning(true);
    setError(null);
    setRunState({ progress: 0, phase: 0 });

    // Animate phases while waiting for response
    const phases = [
      { phase: 0, target: 25, label: 'Fetching tickets' },
      { phase: 1, target: 55, label: 'Analyzing content' },
      { phase: 2, target: 80, label: 'Cross-referencing' },
      { phase: 3, target: 95, label: 'Generating flags' }
    ];

    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress = Math.min(currentProgress + 1, 94);
      const phaseIdx = phases.findIndex(p => currentProgress < p.target) - 1;
      setRunState({
        progress: currentProgress,
        phase: Math.max(0, Math.min(phaseIdx, 3))
      });
    }, 600);

    try {
      const result = await api.aiReview.run();
      clearInterval(interval);
      setRunState({ progress: 100, phase: 3 });
      setFlags(result.flags || []);
      setLastRun(new Date().toISOString());
      setReviewStats(prev => ({
        ...prev,
        lastRunAt: new Date().toISOString(),
        lastRunReviewed: result.reviewed,
        lastRunFlagged: result.flagged,
        totalReviewed: (prev.totalReviewed || 0) + result.reviewed
      }));
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      clearInterval(interval);
      setError(err.message);
    } finally {
      setRunning(false);
      setRunState({ progress: 0, phase: 0 });
    }
  }, []);

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

  return {
    flags, exclusions, companies,
    lastRun, reviewStats, running, runState,
    error, loaded,
    loadStatus, runReview, setAction,
    addExclusion, removeExclusion
  };
}