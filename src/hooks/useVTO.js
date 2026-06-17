import { useState, useCallback, useRef } from 'react';
import { createApi } from '../utils/api';

const AUTOSAVE_DEBOUNCE_MS = 1200;

export function useVTO(getToken) {
  const [history, setHistory] = useState([]);
  const [doc, setDoc] = useState(null);          // currently open VTO (full record)
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const api = createApi(getToken);
  const debounceRef = useRef({});  // keyed by path string -> timeout id

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.vto.history();
      setHistory(res.history || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  const openVto = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const vto = await api.vto.get(id);
      setDoc(vto);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  const createNew = useCallback(async (year) => {
    setLoading(true);
    setError(null);
    try {
      const vto = await api.vto.create(year);
      setDoc(vto);
      return vto;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  // Optimistic local update + debounced PATCH per field path, so rapid
  // keystrokes during the retreat don't spam the API but nothing is lost
  // if the tab closes (each field settles ~1.2s after the last edit to it).
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
        await api.vto.update(doc?.id, fieldPath, value);
      } catch (err) {
        setError(`Autosave failed: ${err.message}`);
      } finally {
        setSaving(false);
      }
    }, AUTOSAVE_DEBOUNCE_MS);
  }, [getToken, doc?.id]);

  const finalize = useCallback(async (authoredBy) => {
    if (!doc?.id) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api.vto.finalize(doc.id, authoredBy);
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
      const updated = await api.vto.unlock(doc.id);
      setDoc(updated);
      return updated;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [getToken, doc?.id]);

  const closeDoc = useCallback(() => setDoc(null), []);

  return {
    history, doc, loading, saving, error,
    loadHistory, openVto, createNew, up, finalize, unlock, closeDoc
  };
}