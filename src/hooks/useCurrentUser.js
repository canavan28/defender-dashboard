// New file: src/hooks/useCurrentUser.js
// Small standalone hook — fetches /api/me once on mount so the shell knows
// whether to render the VTO tab at all. Kept separate from useDashboard so
// it can resolve independently and fail closed (defaults to non-owner).

import { useState, useEffect } from 'react';
import { createApi } from '../utils/api';

export function useCurrentUser(getToken) {
  const [user, setUser] = useState(null);       // { name, email, isOwner }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const api = createApi(getToken);
    api.me()
      .then(res => { if (!cancelled) setUser(res); })
      .catch(() => { if (!cancelled) setUser({ isOwner: false }); }) // fail closed
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [getToken]);

  return { user, loading, isOwner: !!user?.isOwner };
}

// ---------------------------------------------------------------------
// Integration into src/App.jsx (sketch — adapt to your actual tab list
// structure, since I haven't seen the real file):
//
//   import { useCurrentUser } from './hooks/useCurrentUser';
//
//   function App() {
//     const { getToken } = /* ...your existing auth context... */;
//     const { isOwner, loading: userLoading } = useCurrentUser(getToken);
//
//     const TABS = [
//       { id: 'ticket-overview', label: 'Ticket Overview', ... },
//       { id: 'tech-capacity',   label: 'Tech Capacity',   ... },
//       // ...existing tabs...
//       ...(isOwner ? [{ id: 'vto', label: 'VTO', component: VTOTab }] : []),
//     ];
//
//     // render TABS as you already do — the VTO entry simply won't exist
//     // in the array for non-owners, so it never appears in the nav and
//     // there is no route/tab id a non-owner could guess or deep-link into
//     // that would even attempt to render it.
//   }
//
// Why fail-closed matters here: while userLoading is true (or if /api/me
// errors for any reason — network blip, expired token, etc.), isOwner is
// false. The tab only appears once we've positively confirmed ownership,
// never as a default/optimistic state. A non-owner should never see it
// flash on screen even briefly.
//
// Defense in depth, for completeness:
// - Tab hidden from nav (above) — the primary UX guarantee.
// - Backend requireOwner on every /api/vto/* route — the actual security
//   boundary. Even if someone hand-crafted a request or found a stale
//   client-side route, the API itself refuses non-owners with 403.
// - If your router supports direct URLs (e.g. /dashboard/vto), make sure
//   that route also checks isOwner before mounting VTOTab and redirects
//   or shows a simple "not available" state otherwise — don't rely on the
//   nav-hiding alone if deep links are possible in your router setup.