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
      const tickets   = await api.tickets.all();
      const resources = await api.resources();
      const sla       = await api.sla();

      // Shape data to match what the dashboard modules expect
      const now = new Date();
      const allTickets = tickets.summary.items || [];
      const openTickets = tickets.open.items || [];

      const byMonth = {};
      allTickets.forEach(t => {
        const month = t.createDate?.substring(0, 7);
        if (month) byMonth[month] = (byMonth[month] || 0) + 1;
      });

      const withAge = openTickets.map(t => ({
        ...t,
        ageInDays: Math.floor((now - new Date(t.createDate)) / (1000 * 60 * 60 * 24))
      }));

      const avgAge = withAge.length
        ? (withAge.reduce((s, t) => s + t.ageInDays, 0) / withAge.length).toFixed(1)
        : 0;

      const byTech = {};
      withAge.forEach(t => {
        const id = t.assignedResourceID || 'unassigned';
        byTech[id] = (byTech[id] || 0) + 1;
      });

      const byCategory = {};
      (tickets.categories.items || []).forEach(t => {
        const cat = t.ticketCategory || 'Uncategorized';
        byCategory[cat] = (byCategory[cat] || 0) + 1;
      });

      setData({
        summary: { byMonth, total: allTickets.length },
        open: { total: openTickets.length, avgAgeInDays: parseFloat(avgAge), byTech },
        categories: { byCategory, total: tickets.categories.items?.length || 0 },
        resources,
        sla
      });
      setLastSynced(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, lastSynced, sync };
}