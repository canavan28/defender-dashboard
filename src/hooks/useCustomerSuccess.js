import { useState, useCallback } from 'react';
import { createApi } from '../utils/api';

// Below this score, a client is considered flagged (matches the confirmed
// CS scoring design: base 10, below 7 = Tier 1 flag).
export const CS_SCORE_THRESHOLD = 7;

export function useCustomerSuccess(getToken) {
  const [scores, setScores] = useState([]);       // summary list: all clients
  const [client, setClient] = useState(null);      // currently open client (full ledger)
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncErrors, setSyncErrors] = useState([]);
  const [error, setError] = useState(null);

  const api = createApi(getToken);

  const loadScores = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.customerSuccess.scores();
      setScores(res || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  const openClient = useCallback(async (companyId) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.customerSuccess.get(companyId);
      setClient(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  const closeClient = useCallback(() => setClient(null), []);

  // Adds a manual event, then refreshes both the open client's ledger and
  // the summary list (so the row's score updates without a full reload).
  const addEvent = useCallback(async (companyId, { type, delta, note, companyName }) => {
    setSaving(true);
    setError(null);
    try {
      const updated = await api.customerSuccess.addEvent(companyId, type, delta, note, companyName);
      setClient(updated);
      setScores(prev => {
        const idx = prev.findIndex(c => c.companyId === updated.companyId);
        const row = {
          companyId: updated.companyId,
          companyName: updated.companyName,
          score: updated.score,
          eventCount: updated.events.length
        };
        if (idx === -1) return [...prev, row];
        const next = [...prev];
        next[idx] = row;
        return next;
      });
      return updated;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [getToken]);

  const deleteEvent = useCallback(async (companyId, eventId) => {
    setSaving(true);
    setError(null);
    try {
      const updated = await api.customerSuccess.deleteEvent(companyId, eventId);
      setClient(updated);
      setScores(prev => prev.map(c =>
        c.companyId === updated.companyId
          ? { ...c, score: updated.score, eventCount: updated.events.length }
          : c
      ));
      return updated;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [getToken]);

  const runSync = useCallback(async () => {
    setSyncing(true);
    setSyncErrors([]);
    setError(null);
    try {
      const res = await api.customerSuccess.sync();
      setSyncErrors(res.errors || []);
      await loadScores();
      if (client) await openClient(client.companyId);
      return res;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setSyncing(false);
    }
  }, [getToken, loadScores, openClient, client]);

  return {
    scores, client, loading, saving, syncing, syncErrors, error,
    loadScores, openClient, closeClient, addEvent, deleteEvent, runSync
  };
}