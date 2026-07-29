import { useState, useCallback } from 'react';
import { createApi } from '../utils/api';

export function useLicenseAudit(getToken) {
  const [contracted, setContracted] = useState(null);   // full /all payload: { clients, errors, excludedNoFullUsers }
  const [companies, setCompanies] = useState([]);        // [{ id, companyName }] for the mapping dropdown
  const [consumed, setConsumed] = useState({});          // { [source]: { byCompany, unmatched, uploadedAt } }
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const api = createApi(getToken);

  const loadContracted = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.licenseAudit.contractedAll();
      setContracted(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  const loadCompanies = useCallback(async () => {
    try {
      const res = await api.licenseAudit.companiesList();
      setCompanies(res || []);
    } catch (err) {
      setError(err.message);
    }
  }, [getToken]);

  const loadConsumed = useCallback(async (source) => {
    try {
      const res = await api.licenseAudit.getConsumed(source);
      setConsumed((prev) => ({ ...prev, [source]: res }));
    } catch (err) {
      setError(err.message);
    }
  }, [getToken]);

  // rows: [{ name, devices }] already parsed client-side from whatever
  // CSV format the source uses — backend just does matching, no CSV
  // parsing on the server.
  const uploadConsumed = useCallback(async (source, rows) => {
    setUploading(true);
    setError(null);
    try {
      const result = await api.licenseAudit.uploadConsumed(source, rows);
      await loadConsumed(source);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setUploading(false);
    }
  }, [getToken, loadConsumed]);

  const mapConsumed = useCallback(async (source, rawName, companyId) => {
    try {
      await api.licenseAudit.mapConsumed(source, rawName, companyId);
      await loadConsumed(source);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [getToken, loadConsumed]);

  const ignoreConsumed = useCallback(async (source, rawName) => {
    try {
      await api.licenseAudit.ignoreConsumed(source, rawName);
      await loadConsumed(source);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [getToken, loadConsumed]);

  return {
    contracted, companies, consumed, loading, uploading, error,
    loadContracted, loadCompanies, loadConsumed,
    uploadConsumed, mapConsumed, ignoreConsumed
  };
}