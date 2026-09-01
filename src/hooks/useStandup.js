import { useState, useEffect, useCallback } from 'react';

// Confirmed with Matt: auto-refresh hourly, not on every mount/short
// interval — this is a TV display meant to run unattended, not a live
// feed, and standup.js's route makes several live AutoTask calls on
// every request rather than reading from a disk cache.
const AUTO_REFRESH_MS = 60 * 60 * 1000;

export function useStandup(api) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // `isManual` distinguishes the button-triggered refresh (shows a
  // "refreshing" state without blanking the existing data) from the
  // initial load and the silent hourly auto-refresh (neither should
  // flash a full loading state over data that's already on screen).
  const load = useCallback(async (isManual) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await api.standup.data();
      setData(res);
    } catch (err) {
      setError(err.message);
    } finally {
      if (isManual) setRefreshing(false);
      else setLoading(false);
    }
  }, [api]);

  useEffect(() => { load(false); }, [load]);

  useEffect(() => {
    const interval = setInterval(() => load(false), AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  return { data, loading, error, refreshing, refresh };
}