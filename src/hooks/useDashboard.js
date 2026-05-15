import { useState, useCallback } from 'react';
import { api } from '../utils/api';
import { getQuarterKey } from './useTicketMetrics';

export function useDashboard() {
  const [rawData, setRawData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fullRefreshStep, setFullRefreshStep] = useState(null);
  const [error, setError] = useState(null);
  const [lastSynced, setLastSynced] = useState(null);
  const [selectedQuarterKey, setSelectedQuarterKey] = useState(null);

  const processResponse = (response) => {
    setRawData({
      allTickets: response.allTickets || [],
      completedTickets: response.completedTickets || [],
      openTickets: response.openTickets || [],
      timeEntries: response.timeEntries || [],
      resources: response.resources || [],
      excludeResources: response.excludeResources || [],
      issueTypeMap: response.issueTypeMap || {},
      subIssueMap: response.subIssueMap || {},
      cacheInfo: response.cacheInfo
    });
    setSelectedQuarterKey(prev => prev || getQuarterKey(new Date()));
    setLastSynced(new Date());
  };

  const sync = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.tickets.all();
      processResponse(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fullRefresh = useCallback(async () => {
    setError(null);
    try {
      // Step 1 — rebuild tickets
      setFullRefreshStep('Rebuilding ticket history... this may take a few minutes');
      await api.tickets.refreshTickets();

      // Step 2 — rebuild time entries
      setFullRefreshStep('Rebuilding time entry history...');
      await api.tickets.refreshTimeEntries();

      // Step 3 — fetch merged data
      setFullRefreshStep('Loading updated data...');
      const response = await api.tickets.all();
      processResponse(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setFullRefreshStep(null);
    }
  }, []);

  return {
    rawData,
    loading,
    fullRefreshStep,
    error,
    lastSynced,
    selectedQuarterKey,
    setSelectedQuarterKey,
    sync,
    fullRefresh
  };
}