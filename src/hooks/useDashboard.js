import { useState, useCallback } from 'react';
import { api } from '../utils/api';

/**
 * Central data hook. Fetches all endpoints in parallel on load or manual sync.
 * Returns: { data, loading, error, lastSynced, sync }
 */
export function useDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastSynced, setLastSynced] = useState(null);

  const sync = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summary, open, categories, resources, sla] = await Promise.all([
        api.tickets.summary(),
        api.tickets.open(),
        api.tickets.categories(),
        api.resources(),
        api.sla()
      ]);
      setData({ summary, open, categories, resources, sla });
      setLastSynced(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, lastSynced, sync };
}
