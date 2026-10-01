import { useState, useEffect, useCallback, useRef } from 'react';
import { msalInstance, loginRequest, silentRedirectUri } from '../auth/msalConfig';

// ── Am I running inside a hidden iframe? ───────────────────────────────────
// MSAL renews tokens in the background using a hidden iframe. If that iframe
// ever ends up loading this app (it used to — the silent renewal returned to
// the dashboard's home page), this copy of the app must NOT try to sign in or
// redirect. Doing so caused MSAL's "block_iframe_reload" error and the
// sign-in loop. Silent renewal now lands on the blank /redirect.html instead
// (see msalConfig.js), so this guard is a backstop, not the main fix.
const IN_IFRAME = (() => {
    try {
        return window.self !== window.top;
    } catch {
        // Cross-origin access to window.top throws — that also means iframe.
        return true;
    }
})();

// ── Stuck "interaction in progress" flag ───────────────────────────────────
// MSAL tracks an in-progress login/token redirect with a localStorage key
// ending in ".interaction.status". If a redirect is interrupted (e.g. passkey
// prompt, tab closed mid-flow), the key can be left set, and MSAL then
// refuses every new redirect with `interaction_in_progress`. This clears just
// that flag without a full logout.
function clearStuckInteractionFlag() {
    Object.keys(window.localStorage)
        .filter((key) => key.endsWith('.interaction.status'))
        .forEach((key) => window.localStorage.removeItem(key));
}

// ── Loop breaker ───────────────────────────────────────────────────────────
// Every trip to the Microsoft sign-in page is recorded in sessionStorage
// (which survives redirects within the same tab). If we've already sent the
// user to Microsoft MAX_REDIRECTS_IN_WINDOW times within LOOP_WINDOW_MS and
// still can't get a token, we stop and show an error instead of cycling
// forever. The record is cleared whenever a token is obtained successfully,
// so normal daily re-sign-ins never trip it.
const REDIRECT_LOG_KEY = 'infotank.authRedirectLog';
const LOOP_WINDOW_MS = 3 * 60 * 1000; // 3 minutes
const MAX_REDIRECTS_IN_WINDOW = 2;

const LOOP_MESSAGE =
    'Sign-in was stopped because it kept repeating. Close this tab, wait 3 minutes, ' +
    'then open the dashboard again. If it happens again, save the browser Console log ' +
    'and send it to Claude.';

function readRedirectLog() {
    try {
        const raw = window.sessionStorage.getItem(REDIRECT_LOG_KEY);
        const entries = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(entries)) return [];
        const now = Date.now();
        return entries.filter((t) => typeof t === 'number' && now - t < LOOP_WINDOW_MS);
    } catch {
        return [];
    }
}

function recordRedirect() {
    const entries = readRedirectLog();
    entries.push(Date.now());
    try {
        window.sessionStorage.setItem(REDIRECT_LOG_KEY, JSON.stringify(entries));
    } catch {
        // sessionStorage unavailable — loop breaker just won't work; not fatal.
    }
}

function clearRedirectLog() {
    try {
        window.sessionStorage.removeItem(REDIRECT_LOG_KEY);
    } catch {
        // ignore
    }
}

// ── Module-level "auth is ready" gate ──────────────────────────────────────
// Several hooks load data immediately on mount, before useAuth's async init()
// (handleRedirectPromise -> setActiveAccount) finishes. getToken() waits on
// this promise first, so early callers wait briefly instead of failing with
// "No active account".
let resolveAuthReady;
const authReady = new Promise((resolve) => { resolveAuthReady = resolve; });

// Lets module-level code (redirectOnce) surface an error in the hook's state.
let reportAuthError = () => {};

// A promise that never settles. Returned to callers once a full-page redirect
// to Microsoft has started — the page is navigating away, so callers should
// simply wait rather than throw errors (or send "Bearer undefined" requests
// to the backend, which the old code did).
const waitForever = () => new Promise(() => {});

// ── Single-flight redirect ─────────────────────────────────────────────────
// On page load, many hooks call getToken() at the same moment. Previously,
// when silent renewal failed, EACH of them started its own redirect to
// Microsoft. Each new redirect overwrote the saved sign-in request of the one
// before it, so when Microsoft sent the user back, MSAL couldn't match the
// answer and started over — part of the loop. Now only the first caller
// starts a redirect; everyone else waits on the same one.
let redirectInFlight = null;

function redirectOnce(kind, reason) {
    if (redirectInFlight) return redirectInFlight;

    if (readRedirectLog().length >= MAX_REDIRECTS_IN_WINDOW) {
        console.error(
            `[Auth] Redirect loop detected — already sent to Microsoft sign-in ` +
            `${MAX_REDIRECTS_IN_WINDOW} times in the last ${LOOP_WINDOW_MS / 60000} minutes. ` +
            `Stopping. Last reason: ${reason}`
        );
        reportAuthError(LOOP_MESSAGE);
        return Promise.reject(new Error(LOOP_MESSAGE));
    }

    recordRedirect();
    console.warn(`[Auth] Sending to Microsoft sign-in (${kind}). Reason: ${reason}`);

    const start = () =>
        kind === 'login'
            ? msalInstance.loginRedirect(loginRequest)
            : msalInstance.acquireTokenRedirect(loginRequest);

    redirectInFlight = (async () => {
        try {
            await start();
        } catch (err) {
            if (err.errorCode === 'interaction_in_progress') {
                // Nothing in THIS page started a redirect yet (redirectInFlight
                // was null), so this is a leftover stuck flag. Clear and retry once.
                console.warn('[Auth] Stuck interaction_in_progress flag — clearing and retrying once.');
                clearStuckInteractionFlag();
                try {
                    await start();
                } catch (retryErr) {
                    redirectInFlight = null;
                    console.error('[Auth] Redirect retry failed:', retryErr.errorCode || '(no errorCode)', retryErr.message);
                    reportAuthError(retryErr.message);
                    throw retryErr;
                }
            } else {
                redirectInFlight = null;
                console.error('[Auth] Redirect failed to start:', err.errorCode || '(no errorCode)', err.message);
                reportAuthError(err.message);
                throw err;
            }
        }
        // Redirect started — page is navigating away.
        return waitForever();
    })();

    return redirectInFlight;
}

export function useAuth() {
    const [account, setAccount] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const initStarted = useRef(false);

    // Wire up module-level error reporting to this hook's state.
    useEffect(() => {
        reportAuthError = (message) => {
            setError(message);
            setLoading(false);
        };
        return () => { reportAuthError = () => {}; };
    }, []);

    useEffect(() => {
        // Guard against this effect running twice (React dev double-invoke,
        // fast remount) and starting two overlapping sign-in flows.
        if (initStarted.current) return;
        initStarted.current = true;

        const init = async () => {
            if (IN_IFRAME) {
                // Backstop — see IN_IFRAME comment above. Do nothing here.
                console.warn('[Auth] App loaded inside a hidden iframe — skipping sign-in in this copy.');
                resolveAuthReady();
                return;
            }

            try {
                await msalInstance.initialize();

                const response = await msalInstance.handleRedirectPromise();
                if (response?.account) {
                    msalInstance.setActiveAccount(response.account);
                    setAccount(response.account);
                    setLoading(false);
                    resolveAuthReady();
                    return;
                }

                const accounts = msalInstance.getAllAccounts();
                if (accounts.length > 0) {
                    msalInstance.setActiveAccount(accounts[0]);
                    setAccount(accounts[0]);
                    setLoading(false);
                    resolveAuthReady();
                    return;
                }

                // No signed-in account — go to Microsoft. Resolve the gate so
                // early getToken() callers fall through to the shared redirect.
                resolveAuthReady();
                await redirectOnce('login', 'no signed-in account found');
            } catch (err) {
                console.error('[Auth] Error:', err.errorCode || '(no errorCode)', err.message);
                setError(err.message);
                setLoading(false);
                resolveAuthReady();
            }
        };

        init();
    }, []);

    const getToken = useCallback(async () => {
        await authReady;

        if (IN_IFRAME) {
            throw new Error('Sign-in is not available inside a hidden iframe.');
        }

        const activeAccount = msalInstance.getActiveAccount();
        if (!activeAccount) {
            // init() is already redirecting to Microsoft — wait on that.
            if (redirectInFlight) return redirectInFlight;
            throw new Error('No active account');
        }

        try {
            const response = await msalInstance.acquireTokenSilent({
                ...loginRequest,
                account: activeAccount,
                // Background renewal returns to the blank page, not the app.
                redirectUri: silentRedirectUri,
            });
            // A real token means sign-in is healthy — reset the loop breaker.
            clearRedirectLog();
            return response.accessToken;
        } catch (err) {
            console.error('[Auth] Silent token failed:', err.errorCode || '(no errorCode)', err.message);
            return redirectOnce('token', `silent renewal failed (${err.errorCode || err.message})`);
        }
    }, []);

    const logout = useCallback(() => {
        clearRedirectLog();
        msalInstance.logoutRedirect();
    }, []);

    return { account, loading, error, logout, getToken };
}