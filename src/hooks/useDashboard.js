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

      const excludeResources = tickets.excludeResources || [];

      // Build resource map excluding API users (licenseType 7) and excluded resources
      const resourceMap = {};
      (resources.resources || [])
        .filter(r => r.licenseType !== 7 && !excludeResources.includes(r.id))
        .forEach(r => { resourceMap[r.id] = r.name; });

      // Volume by month from summary tickets
      const byMonth = {};
      (tickets.summary.items || []).forEach(t => {
        const month = t.createDate?.substring(0, 7);
        if (month) byMonth[month] = (byMonth[month] || 0) + 1;
      });

      // Open tickets - exclude unassigned and excluded resources
      const openTickets = (tickets.open.items || []).filter(
        t => t.assignedResourceID && !excludeResources.includes(t.assignedResourceID)
      );

      const byTech = {};
      openTickets.forEach(t => {
        const id = t.assignedResourceID;
        if (resourceMap[id]) byTech[id] = (byTech[id] || 0) + 1;
      });

      // Avg resolution time from completed tickets using completedDate - createDate
      const completedTickets = tickets.completed.items || [];
      const resolutionTimes = completedTickets
        .filter(t => t.completedDate && t.createDate)
        .map(t => {
          const days = (new Date(t.completedDate) - new Date(t.createDate)) / (1000 * 60 * 60 * 24);
          return days;
        })
        .filter(days => days >= 0);

      const avgResolutionDays = resolutionTimes.length
        ? (resolutionTimes.reduce((s, d) => s + d, 0) / resolutionTimes.length).toFixed(1)
        : 0;

      // Category breakdown from open tickets
      const byCategory = {};
      openTickets.forEach(t => {
        const cat = t.ticketCategory || 'Uncategorized';
        byCategory[cat] = (byCategory[cat] || 0) + 1;
      });

      setData({
        summary: { byMonth, total: tickets.summary.items?.length || 0 },
        open: {
          total: openTickets.length,
          avgAgeInDays: parseFloat(avgResolutionDays),
          byTech
        },
        categories: { byCategory, total: openTickets.length },
        resources: { resources: Object.entries(resourceMap).map(([id, name]) => ({ id: parseInt(id), name })) },
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