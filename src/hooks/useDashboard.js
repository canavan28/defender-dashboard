import { useState, useCallback } from 'react';
import { api } from '../utils/api';
import { getQuarterKey } from './useTicketMetrics';

export function useDashboard() {
  const [rawData, setRawData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fullRefreshing, setFullRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastSynced, setLastSynced] = useState(null);
  const [selectedQuarterKey, setSelectedQuarterKey] = useState(null);

  const processResponse = (response) => {
    setRawData({
      allTickets: response.allTickets || [],
      completedTickets: response.completedTickets || [],
      openTickets: response.openTickets || [],
      resources: response.resources || [],
      excludeResources: response.excludeResources || [],
      issueTypeMap: response.issueTypeMap || {},
      cacheInfo: response.cacheInfo
    });
    // Default to current quarter
    setSelectedQuarterKey(getQuarterKey(new Date()));
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
    setFullRefreshing(true);
    setError(null);
    try {
      const response = await api.tickets.fullRefresh();
      processResponse(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setFullRefreshing(false);
    }
  }, []);

  return {
    rawData,
    loading,
    fullRefreshing,
    error,
    lastSynced,
    selectedQuarterKey,
    setSelectedQuarterKey,
    sync,
    fullRefresh
  };
}