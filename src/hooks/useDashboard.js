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
      const issueTypeMap = tickets.issueTypeMap || {};

      // Resource map — exclude API users and excluded resources
      const resourceMap = {};
      (resources.resources || [])
        .filter(r => r.licenseType !== 7 && !excludeResources.includes(r.id))
        .forEach(r => { resourceMap[r.id] = r.name; });

      // Build full 12-month window
      const allTickets = tickets.summary?.items || [];
      const now = new Date();
      const byMonth = {};

      // Pre-populate all 12 months with 0
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        byMonth[key] = 0;
      }

      // Fill in actual counts
      allTickets.forEach(t => {
        const month = t.createDate?.substring(0, 7);
        if (month && byMonth.hasOwnProperty(month)) {
          byMonth[month] = (byMonth[month] || 0) + 1;
        }
      });

      // Open tickets
      const openTicketsRaw = tickets.open?.items || [];
      const openTickets = openTicketsRaw.filter(
        t => t.assignedResourceID && !excludeResources.includes(t.assignedResourceID)
      );

      // Avg age of open tickets (createDate to today)
      const openAges = openTickets
        .filter(t => t.createDate)
        .map(t => (now - new Date(t.createDate)) / (1000 * 60 * 60 * 24));
      const avgOpenAge = openAges.length
        ? (openAges.reduce((s, d) => s + d, 0) / openAges.length).toFixed(1)
        : 0;

      // Tech workload
      const byTech = {};
      openTickets.forEach(t => {
        const id = t.assignedResourceID;
        if (resourceMap[id]) byTech[id] = (byTech[id] || 0) + 1;
      });

      // Avg resolution time from completed tickets
      const completedTickets = tickets.completed?.items || [];
      const resolutionTimes = completedTickets
        .filter(t => t.completedDate && t.createDate)
        .map(t => (new Date(t.completedDate) - new Date(t.createDate)) / (1000 * 60 * 60 * 24))
        .filter(d => d >= 0);
      const avgResolutionDays = resolutionTimes.length
        ? (resolutionTimes.reduce((s, d) => s + d, 0) / resolutionTimes.length).toFixed(1)
        : 0;

      // SLA breach — firstResponseDateTime > firstResponseDueDateTime
      const slaTickets = [...allTickets, ...completedTickets];
      const slaEligible = slaTickets.filter(t => t.firstResponseDueDateTime);
      const slaBreach = slaEligible.filter(t => {
        if (!t.firstResponseDateTime) return true; // no response = breach
        return new Date(t.firstResponseDateTime) > new Date(t.firstResponseDueDateTime);
      });
      const slaBreachRate = slaEligible.length
        ? parseFloat(((slaBreach.length / slaEligible.length) * 100).toFixed(1))
        : 0;

      // Issue type breakdown from all tickets
      const byIssueType = {};
      allTickets.forEach(t => {
        if (t.issueType) {
          const label = issueTypeMap[String(t.issueType)] || `Type ${t.issueType}`;
          byIssueType[label] = (byIssueType[label] || 0) + 1;
        }
      });

      setData({
        summary: { byMonth, total: allTickets.length },
        open: {
          total: openTickets.length,
          avgAgeInDays: parseFloat(avgOpenAge),
          avgResolutionDays: parseFloat(avgResolutionDays),
          byTech
        },
        issueTypes: byIssueType,
        slaBreachRate,
        resources: {
          resources: Object.entries(resourceMap).map(([id, name]) => ({
            id: parseInt(id), name
          }))
        },
        sla: {
          current: { breachRate: slaBreachRate, total: slaEligible.length },
          prior: sla.prior
        }
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