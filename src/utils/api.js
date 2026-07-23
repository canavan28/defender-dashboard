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

async function apiPost(path, body, getToken) {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

// Mirrors apiPost, but with keepalive for long-running backend jobs
// (e.g. /api/customer-success/sync, which pages through AutoTask
// Tickets + SurveyResults sequentially and can take a while).
async function apiPostLongRunning(path, body, getToken) {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    keepalive: true,
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

async function apiPatch(path, body, getToken) {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

async function apiDelete(path, getToken) {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export function createApi(getToken) {
  return {
    me: () => apiFetch('/api/me', getToken),

    tickets: {
      all:                () => apiFetch('/api/tickets/all', getToken),
      refreshTickets:     () => apiFetchLongRunning('/api/tickets/refreshtickets', getToken),
      refreshTimeEntries: () => apiFetchLongRunning('/api/tickets/refreshtimeentries', getToken)
    },
    aiReview: {
      status:           () => apiFetch('/api/aireview/status', getToken),
      companies:        () => apiFetch('/api/aireview/companies', getToken),
      run:              () => apiPost('/api/aireview/run', {}, getToken),
      action:           (ticketId, action) => apiPost('/api/aireview/action', { ticketId, action }, getToken),
      addExclusion:     (companyId, companyName, reason) => apiPost('/api/aireview/exclusions', { companyId, companyName, reason }, getToken),
      removeExclusion:  (companyId) => apiDelete(`/api/aireview/exclusions/${companyId}`, getToken),
      getPrompts:       () => apiFetch('/api/aireview/prompts', getToken),
      savePrompts:      (ticketReview, trendAnalysis) => apiPost('/api/aireview/prompts', { ticketReview, trendAnalysis }, getToken),
      resetPrompts:     () => apiPost('/api/aireview/prompts/reset', {}, getToken),
      ignoreTrend:      (key) => apiPost('/api/aireview/trends/ignore', { key }, getToken),
      unignoreTrend:    (key) => apiDelete(`/api/aireview/trends/ignore/${encodeURIComponent(key)}`, getToken),
      getTechAnalysis:  () => apiFetch('/api/aireview/tech-analysis', getToken),
      analyzeTech:      (techId) => apiPost('/api/aireview/analyze-tech', { techId }, getToken)
    },
    vto: {
      history:  ()                 => apiFetch(`/api/vto`, getToken),
      get:      (id)                => apiFetch(`/api/vto/${id}`, getToken),
      create:   (year)              => apiPost(`/api/vto`, { year }, getToken),
      update:   (id, path, value)   => apiPatch(`/api/vto/${id}`, { path, value }, getToken),
      finalize: (id, authoredBy)    => apiPost(`/api/vto/${id}/finalize`, { authoredBy }, getToken),
      unlock:   (id)                => apiPost(`/api/vto/${id}/unlock`, {}, getToken)
    },
    upsells: {
      all:     () => apiFetch('/api/upsells/all', getToken),
      refresh: () => apiFetchLongRunning('/api/upsells/refresh', getToken)
    },
    customerSuccess: {
      scores:      ()                                            => apiFetch('/api/customer-success/scores', getToken),
      get:         (companyId)                                   => apiFetch(`/api/customer-success/scores/${companyId}`, getToken),
      addEvent:    (companyId, type, delta, note, companyName)    => apiPost(`/api/customer-success/scores/${companyId}/events`, { type, delta, note, companyName }, getToken),
      deleteEvent: (companyId, eventId)                          => apiDelete(`/api/customer-success/scores/${companyId}/events/${eventId}`, getToken),
      sync:        ()                                            => apiPostLongRunning('/api/customer-success/sync', {}, getToken)
    }
  };
}