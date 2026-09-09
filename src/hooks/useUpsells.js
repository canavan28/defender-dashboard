import { useState, useEffect, useCallback, useRef } from 'react';

const POLL_INTERVAL_MS = 5000;

export function useUpsells(api) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const pollRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.upsells.all();
      setData(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // /refresh now returns almost immediately after just starting the
  // rebuild in the background - the old code awaited /refresh directly,
  // which meant the browser had to hold that connection open for the full
  // multi-minute AutoTask loop, and Railway's proxy was killing it partway
  // through (showed up as a CORS/502 error). This polls GET /status
  // instead, which is a cheap in-memory read on the backend.
  const pollStatus = useCallback(() => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const status = await api.upsells.status();
        if (status.status === 'done') {
          stopPolling();
          setRefreshing(false);
          await load();
        } else if (status.status === 'error') {
          stopPolling();
          setRefreshing(false);
          setError(status.error || 'Refresh failed.');
        }
        // status === 'running' -> keep polling
      } catch (err) {
        stopPolling();
        setRefreshing(false);
        setError(err.message);
      }
    }, POLL_INTERVAL_MS);
  }, [api, load, stopPolling]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      await api.upsells.refresh();
      pollStatus();
    } catch (err) {
      // A 409 means a build was already running when this click landed
      // (e.g. the initial page-load state was mid-rebuild) - treat that
      // the same as a normal in-progress refresh and just start polling,
      // rather than surfacing it as a real error.
      if (err.message.includes('409')) {
        pollStatus();
      } else {
        setError(err.message);
        setRefreshing(false);
      }
    }
  }, [api, pollStatus]);

  // Stop polling if the component unmounts mid-refresh.
  useEffect(() => stopPolling, [stopPolling]);

  return { data, loading, error, refreshing, refresh };
}