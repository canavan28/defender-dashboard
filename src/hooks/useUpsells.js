import { useState, useEffect, useCallback } from 'react';

export function useUpsells(api) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

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

  // Full refresh hits AutoTask fresh for every company - this can take
  // several minutes, same tradeoff as the ticket cache's full refresh.
  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      await api.upsells.refresh();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  }, [api, load]);

  return { data, loading, error, refreshing, refresh };
}