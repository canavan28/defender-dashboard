/**
 * Central API client.
 * Reads Railway URL and API key from Vercel environment variables.
 * Add VITE_API_URL and VITE_API_KEY in Vercel -> Settings -> Environment Variables.
 */

const BASE_URL = import.meta.env.VITE_API_URL;
const API_KEY  = import.meta.env.VITE_API_KEY;

async function apiFetch(path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export const api = {
  tickets: {
    summary:    () => apiFetch('/api/tickets/summary'),
    open:       () => apiFetch('/api/tickets/open'),
    categories: () => apiFetch('/api/tickets/categories')
  },
  resources:  () => apiFetch('/api/resources'),
  sla:        () => apiFetch('/api/sla/compliance')
};
