import { useState, useCallback, useRef } from 'react';
import { createApi } from '../utils/api';
import { getQuarterKey } from './useTicketMetrics';

export function useDashboard(getToken) {
  const [rawData, setRawData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fullRefreshStep, setFullRefreshStep] = useState(null);
  const [error, setError] = useState(null);
  const [lastSynced, setLastSynced] = useState(null);
  const [selectedQuarterKey, setSelectedQuarterKey] = useState(null);
  const pollRef = useRef(null);

  const api = createApi(getToken);

  const processResponse = (response) => {
    setRawData({
      allTickets: [...(response.allTickets || [])],
      completedTickets: [...(response.completedTickets || [])],
      openTickets: [...(response.openTickets || [])],
      timeEntries: [...(response.timeEntries || [])],
      resources: [...(response.resources || [])],
      excludeResources: response.excludeResources || [],
      issueTypeMap: response.issueTypeMap || {},
      subIssueMap: response.subIssueMap || {},
      companyMap: response.companyMap || {},
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
  }, [getToken]);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const fullRefresh = useCallback(async () => {
    setError(null);
    setFullRefreshStep('Starting full rebuild...');

    try {
      // Step 1: Fire refreshtickets — don't await response, it may timeout
      // We catch the error silently and rely on polling to detect completion
      setFullRefreshStep('Rebuilding ticket history... (this takes a few minutes)');
      try {
        await api.tickets.refreshTickets();
      } catch (err) {
        // Timeout is expected — Railway continues working even if fetch dies
        console.log('[FullRefresh] refreshTickets fetch ended (may have timed out):', err.message);
      }

      // Step 2: Fire refreshtimeentries
      setFullRefreshStep('Rebuilding time entry history...');
      try {
        await api.tickets.refreshTimeEntries();
      } catch (err) {
        console.log('[FullRefresh] refreshTimeEntries fetch ended (may have timed out):', err.message);
      }

      // Step 3: Poll /all until we get a fresh cache timestamp
      setFullRefreshStep('Waiting for rebuild to complete...');
      const startedAt = Date.now();
      const previousBuiltAt = rawData?.cacheInfo?.historicalBuiltAt;

      stopPolling();
      pollRef.current = setInterval(async () => {
        try {
          const response = await api.tickets.all();
          const newBuiltAt = response?.cacheInfo?.historicalBuiltAt;

          // Check if cache has been rebuilt (new timestamp) or timeout after 15min
          const elapsed = Date.now() - startedAt;
          const cacheRefreshed = newBuiltAt && newBuiltAt !== previousBuiltAt;

          if (cacheRefreshed) {
            stopPolling();
            processResponse(response);
            setFullRefreshStep(null);
          } else if (elapsed > 15 * 60 * 1000) {
            stopPolling();
            setFullRefreshStep(null);
            setError('Full refresh timed out after 15 minutes. Try again or check Railway logs.');
          } else {
            setFullRefreshStep(`Waiting for rebuild to complete... (${Math.round(elapsed / 1000)}s)`);
          }
        } catch (err) {
          console.log('[FullRefresh] Poll error:', err.message);
        }
      }, 10000); // poll every 10 seconds

    } catch (err) {
      stopPolling();
      setFullRefreshStep(null);
      setError(err.message);
    }
  }, [getToken, rawData]);

  return {
    rawData, loading, fullRefreshStep, error,
    lastSynced, selectedQuarterKey, setSelectedQuarterKey,
    sync, fullRefresh
  };
}