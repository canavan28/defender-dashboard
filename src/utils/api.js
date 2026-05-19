const BASE_URL = import.meta.env.VITE_API_URL;

async function apiFetch(path, getToken) {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

async function apiFetchLongRunning(path, getToken) {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    keepalive: true
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export function createApi(getToken) {
  return {
    tickets: {
      all:                () => apiFetch('/api/tickets/all', getToken),
      refreshTickets:     () => apiFetchLongRunning('/api/tickets/refreshtickets', getToken),
      refreshTimeEntries: () => apiFetchLongRunning('/api/tickets/refreshtimeentries', getToken)
    }
  };
}