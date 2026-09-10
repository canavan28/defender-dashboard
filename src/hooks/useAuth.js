import { useState, useEffect, useCallback, useRef } from 'react';
import { msalInstance, loginRequest } from '../auth/msalConfig';

// MSAL tracks whether a login/token redirect is currently underway using a
// key in the configured cache (localStorage here) ending in
// ".interaction.status". If a redirect is interrupted before MSAL sees it
// complete — e.g. the passkey/WebAuthn prompt takes an extra round-trip and
// the tab is closed, backgrounded, or reloaded mid-flow — this key can be
// left set to "in progress," and MSAL then refuses to start any new
// login/token redirect, throwing `interaction_in_progress` on every attempt
// until it's cleared. logoutRedirect() wipes the whole MSAL cache (including
// this key), which is why a full logout has been "fixing" it. This clears
// just that flag, without requiring a full logout.
function clearStuckInteractionFlag() {
    Object.keys(window.localStorage)
        .filter((key) => key.endsWith('.interaction.status'))
        .forEach((key) => window.localStorage.removeItem(key));
}

// ── Module-level "auth is ready" gate ──────────────────────────────────────
// App.jsx calls several hooks (useUpsells, useStandup, and likely others)
// that fire their first data load immediately on mount, with no check for
// whether an account exists yet — unlike useDashboard's sync(), which is
// explicitly gated with `if (account)`. React renders App() for the first
// time, and mounts all of these hooks, before useAuth's own async init()
// (handleRedirectPromise -> setActiveAccount) has had a chance to finish.
// On a fresh login this means getToken() can be called before any account
// is set, throwing "No active account" — confirmed by this being specific
// to right-after-login, specific to the tabs whose hooks load unconditionally
// on mount, and resolved by a hard refresh (which skips the race because
// MSAL already has the account cached from localStorage by then).
//
// Rather than audit and individually gate every hook that might have this
// pattern, getToken() itself now waits for init() to finish before it does
// anything else — so ANY caller, no matter how early it fires, just waits
// briefly instead of failing.
let resolveAuthReady;
const authReady = new Promise((resolve) => { resolveAuthReady = resolve; });

export function useAuth() {
    const [account, setAccount] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const initStarted = useRef(false);

    useEffect(() => {
        // Guard against this effect firing more than once (e.g. React
        // double-invoking effects in dev, or a fast remount) triggering two
        // overlapping redirect flows, which is another way to produce a
        // stuck interaction flag.
        if (initStarted.current) return;
        initStarted.current = true;

        const init = async () => {
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

                // No cached account — about to redirect to Microsoft, so the
                // page is going away. Resolve the gate anyway so nothing is
                // left hanging if something manages to call getToken() in
                // the brief window before the redirect actually navigates.
                resolveAuthReady();
                await msalInstance.loginRedirect(loginRequest);
            } catch (err) {
                console.error('[Auth] Error:', err.errorCode || '(no errorCode)', err.message);

                if (err.errorCode === 'interaction_in_progress') {
                    console.warn('[Auth] Detected stuck interaction_in_progress flag — clearing and retrying login.');
                    clearStuckInteractionFlag();
                    try {
                        await msalInstance.loginRedirect(loginRequest);
                        return;
                    } catch (retryErr) {
                        console.error('[Auth] Retry after clearing flag also failed:', retryErr.errorCode || '', retryErr.message);
                        setError(retryErr.message);
                        setLoading(false);
                        resolveAuthReady();
                        return;
                    }
                }

                setError(err.message);
                setLoading(false);
                resolveAuthReady();
            }
        };

        init();
    }, []);

    const getToken = useCallback(async () => {
        // Wait for the initial handleRedirectPromise()/getAllAccounts()
        // check to finish before doing anything else. In the normal case
        // (account already cached, or this is called well after mount)
        // this promise has already resolved and adds no delay at all.
        await authReady;

        const activeAccount = msalInstance.getActiveAccount();
        if (!activeAccount) throw new Error('No active account');
        try {
            const response = await msalInstance.acquireTokenSilent({
                ...loginRequest,
                account: activeAccount,
            });
            return response.accessToken;
        } catch (err) {
            console.error('[Auth] Silent token failed:', err.errorCode || '(no errorCode)', err.message);
            await msalInstance.acquireTokenRedirect(loginRequest);
        }
    }, []);

    const logout = useCallback(() => {
        msalInstance.logoutRedirect();
    }, []);

    return { account, loading, error, logout, getToken };
}