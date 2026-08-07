import { useState, useCallback, useRef } from 'react';
import { createApi } from '../utils/api';

const AUTOSAVE_DEBOUNCE_MS = 1200;

export function useTeamRocks(getToken) {
  const [doc, setDoc] = useState(null);        // the current quarter's shared record, or null
  const [notStarted, setNotStarted] = useState(false); // true when the quarter has no record yet (404)
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const api = createApi(getToken);
  const debounceRef = useRef({});  // keyed by path string -> timeout id

  const loadQuarter = useCallback(async (quarter) => {
    setLoading(true);
    setError(null);
    try {
      const record = await api.teamRocks.get(quarter);
      setDoc(record);
      setNotStarted(false);
    } catch (err) {
      if (String(err.message).includes('404')) {
        setDoc(null);
        setNotStarted(true);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  const startMeeting = useCallback(async (quarter) => {
    setLoading(true);
    setError(null);
    try {
      const record = await api.teamRocks.start(quarter);
      setDoc(record);
      setNotStarted(false);
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
        await api.teamRocks.update(doc?.quarter, fieldPath, value);
      } catch (err) {
        setError(`Autosave failed: ${err.message}`);
      } finally {
        setSaving(false);
      }
    }, AUTOSAVE_DEBOUNCE_MS);
  }, [getToken, doc?.quarter]);

  const finalize = useCallback(async () => {
    if (!doc?.quarter) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api.teamRocks.finalize(doc.quarter);
      setDoc(updated);
      return updated;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [getToken, doc?.quarter]);

  const unlock = useCallback(async () => {
    if (!doc?.quarter) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api.teamRocks.unlock(doc.quarter);
      setDoc(updated);
      return updated;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [getToken, doc?.quarter]);

  const removeRecord = useCallback(async (quarter, force) => {
    setSaving(true);
    setError(null);
    try {
      await api.teamRocks.remove(quarter, force);
      if (doc?.quarter === quarter) { setDoc(null); setNotStarted(true); }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [getToken, doc?.quarter]);

  return {
    doc, notStarted, loading, saving, error,
    loadQuarter, startMeeting, up, finalize, unlock, removeRecord
  };
}