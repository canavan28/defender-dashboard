import { PublicClientApplication, LogLevel } from '@azure/msal-browser';

export const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID}`,
    // Full-page sign-in (loginRedirect / acquireTokenRedirect) still returns
    // to the dashboard itself.
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        if (level === LogLevel.Error) console.error('[MSAL]', message);
      }
    }
  }
};

export const loginRequest = {
  scopes: [`api://${import.meta.env.VITE_AZURE_CLIENT_ID}/access_as_user`]
};

// Background (hidden iframe) token renewal lands on this intentionally blank
// page instead of the dashboard. Pointing it at the dashboard made the whole
// app load inside the hidden iframe, which MSAL blocks with
// "block_iframe_reload" — the cause of the sign-in loop.
//
// This exact URL MUST be registered in Entra ID → App registrations →
// (dashboard app) → Authentication → Single-page application redirect URIs,
// and public/redirect.html must exist and be served as a blank page.
export const silentRedirectUri = `${window.location.origin}/redirect.html`;

export const msalInstance = new PublicClientApplication(msalConfig);