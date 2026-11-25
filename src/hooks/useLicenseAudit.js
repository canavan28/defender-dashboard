import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { createApi } from '../utils/api';

export function useLicenseAudit(getToken) {
  const [contracted, setContracted] = useState(null);   // full /all payload: { clients, errors, excludedNoFullUsers }
  const [companies, setCompanies] = useState([]);        // [{ id, companyName }] for the mapping dropdown
  const [consumed, setConsumed] = useState({});          // { [source]: { byCompany, unmatched, uploadedAt } }
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  // Contract-data rebuild state (from GET /api/license-audit/status):
  // { builtAt, isBuilding, status, startedAt, finishedAt, error, trigger }
  const [rebuild, setRebuild] = useState(null);
  const pollTimer = useRef(null);
  const watchingBuild = useRef(false); // true while we're waiting on a rebuild

  // Memoized — an api object rebuilt on every render is the same bug class
  // as the runaway re-render loop fixed earlier in App.jsx.
  const api = useMemo(() => createApi(getToken), [getToken]);

  const loadContracted = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.licenseAudit.contractedAll();
      setContracted(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [api]);

  const loadCompanies = useCallback(async () => {
    try {
      const res = await api.licenseAudit.companiesList();
      setCompanies(res || []);
    } catch (err) {
      setError(err.message);
    }
  }, [api]);

  const loadConsumed = useCallback(async (source) => {
    try {
      const res = await api.licenseAudit.getConsumed(source);
      setConsumed((prev) => ({ ...prev, [source]: res }));
    } catch (err) {
      setError(err.message);
    }
  }, [api]);

  // rows: [{ name, devices }] already parsed client-side from whatever
  // CSV format the source uses — backend just does matching, no CSV
  // parsing on the server.
  const uploadConsumed = useCallback(async (source, rows) => {
    setUploading(true);
    setError(null);
    try {
      const result = await api.licenseAudit.uploadConsumed(source, rows);
      await loadConsumed(source);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setUploading(false);
    }
  }, [api, loadConsumed]);

  const mapConsumed = useCallback(async (source, rawName, companyId) => {
    try {
      await api.licenseAudit.mapConsumed(source, rawName, companyId);
      await loadConsumed(source);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [api, loadConsumed]);

  const ignoreConsumed = useCallback(async (source, rawName) => {
    try {
      await api.licenseAudit.ignoreConsumed(source, rawName);
      await loadConsumed(source);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [api, loadConsumed]);

  // ── Contract-data rebuild ─────────────────────────────────────────────
  // A full rebuild takes several minutes, so the backend runs it in the
  // background. Poll /status every 10 seconds until it finishes, then
  // reload the contracted numbers.
  const stopPolling = () => {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current);
      pollTimer.current = null;
    }
  };

  const pollStatus = useCallback(async () => {
    stopPolling();
    try {
      const status = await api.licenseAudit.contractedStatus();
      setRebuild(status);
      if (status.isBuilding) {
        watchingBuild.current = true;
        pollTimer.current = setTimeout(pollStatus, 10000);
      } else if (watchingBuild.current) {
        // A rebuild we were waiting on just finished — load the new numbers.
        watchingBuild.current = false;
        if (status.status === 'done') await loadContracted();
      }
      return status;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, [api, loadContracted]);

  const startRebuild = useCallback(async () => {
    setError(null);
    try {
      const res = await api.licenseAudit.contractedRefresh();
      setRebuild((prev) => ({ ...(prev || {}), ...res, isBuilding: true }));
      watchingBuild.current = true;
      pollTimer.current = setTimeout(pollStatus, 10000);
    } catch (err) {
      setError(err.message);
    }
  }, [api, pollStatus]);

  useEffect(() => stopPolling, []);

  return {
    contracted, companies, consumed, loading, uploading, error,
    loadContracted, loadCompanies, loadConsumed,
    uploadConsumed, mapConsumed, ignoreConsumed,
    rebuild, pollStatus, startRebuild
  };
}