import { useState, useCallback, useRef } from 'react';
import { createApi } from '../utils/api';

const AUTOSAVE_DEBOUNCE_MS = 1200;

export function useTeamRocks(getToken) {
  const [rollup, setRollup] = useState([]);       // summary cards for the rollup view
  const [rollupQuarter, setRollupQuarter] = useState(null);
  const [managers, setManagers] = useState([]);    // known manager names, for the "pick or type" control
  const [doc, setDoc] = useState(null);            // currently open record (includes embedded prevQuarter)
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const api = createApi(getToken);
  const debounceRef = useRef({});  // keyed by path string -> timeout id

  const loadRollup = useCallback(async (quarter) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.teamRocks.rollup(quarter);
      setRollup(res.records || []);
      setRollupQuarter(res.quarter);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  const loadManagers = useCallback(async () => {
    try {
      const res = await api.teamRocks.managers();
      setManagers(res.managers || []);
    } catch (err) {
      setError(err.message);
    }
  }, [getToken]);

  const openRecord = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const record = await api.teamRocks.get(id);
      setDoc(record);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  // Starts a new quarter's meeting for a manager. Backend auto-links the
  // prior quarter's record for that manager (if one exists) so it arrives
  // read-only on doc.prevQuarter.
  const createNew = useCallback(async (manager, quarter) => {
    setLoading(true);
    setError(null);
    try {
      const record = await api.teamRocks.create(manager, quarter);
      setDoc(record);
      return record;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  // Optimistic local update + debounced PATCH per field path, same pattern
  // as VTO's autosave — each field settles ~1.2s after the last edit.
  const up = useCallback((fieldPath, value) => {
    setDoc(prev => {
      if (!prev) return prev;
      const clone = structuredClone(prev);
      let node = clone;
      for (let i = 0; i < fieldPath.length - 1; i++) node = node[fieldPath[i]];
      node[fieldPath[fieldPath.length - 1]] = value;
      return clone;
    });

    const key = fieldPath.join('.');
    if (debounceRef.current[key]) clearTimeout(debounceRef.current[key]);
    debounceRef.current[key] = setTimeout(async () => {
      setSaving(true);
      try {
        await api.teamRocks.update(doc?.id, fieldPath, value);
      } catch (err) {
        setError(`Autosave failed: ${err.message}`);
      } finally {
        setSaving(false);
      }
    }, AUTOSAVE_DEBOUNCE_MS);
  }, [getToken, doc?.id]);

  const finalize = useCallback(async () => {
    if (!doc?.id) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api.teamRocks.finalize(doc.id);
      setDoc(updated);
      return updated;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [getToken, doc?.id]);

  const unlock = useCallback(async () => {
    if (!doc?.id) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api.teamRocks.unlock(doc.id);
      setDoc(updated);
      return updated;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [getToken, doc?.id]);

  const removeRecord = useCallback(async (id, force) => {
    setSaving(true);
    setError(null);
    try {
      await api.teamRocks.remove(id, force);
      if (doc?.id === id) setDoc(null);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [getToken, doc?.id]);

  const closeDoc = useCallback(() => setDoc(null), []);

  return {
    rollup, rollupQuarter, managers, doc, loading, saving, error,
    loadRollup, loadManagers, openRecord, createNew, up, finalize, unlock, removeRecord, closeDoc
  };
}