// MSAL v5 redirect bridge. Runs only on /redirect.html (the page Microsoft
// sends background token renewals to) and passes the sign-in answer back to
// the main dashboard window. Without this, MSAL waits and fails with
// "timed_out". Do not import anything else from the app here.
import { broadcastResponseToMainFrame } from '@azure/msal-browser/redirect-bridge';

broadcastResponseToMainFrame().catch((error) => {
  console.error('[Auth] Redirect bridge failed:', error);
});