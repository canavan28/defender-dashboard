const BASE_URL = import.meta.env.VITE_API_URL;
const API_KEY  = import.meta.env.VITE_API_KEY;

async function apiFetch(path, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });
    if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
    return res.json();
  } finally {
    clearTimeout(timeout);
  }
}

export const api = {
  tickets: {
    all:                () => apiFetch('/api/tickets/all', 30000),
    refreshTickets:     () => apiFetch('/api/tickets/refreshtickets', 600000),
    refreshTimeEntries: () => apiFetch('/api/tickets/refreshtimeentries', 600000)
  }
};