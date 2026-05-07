import { useState, useCallback } from 'react';
import { api } from '../utils/api';

export function useDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastSynced, setLastSynced] = useState(null);

  const sync = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const summary    = await api.tickets.summary();
      const open       = await api.tickets.open();
      const categories = await api.tickets.categories();
      const resources  = await api.resources();
      const sla        = await api.sla();

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