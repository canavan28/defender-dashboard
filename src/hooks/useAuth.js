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

export function useAuth() {
    const [account, setAccount] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const initStarted = useRef(false);

    useEffect(() => {
        // Guard against this effect firing more than once (e.g. React
        // double-invoking effects in dev, or a fast remount) triggering two
        // overlapping redirect flows, which is another way to produce the
        // same stuck flag.
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
                    return;
                }

                const accounts = msalInstance.getAllAccounts();
                if (accounts.length > 0) {
                    msalInstance.setActiveAccount(accounts[0]);
                    setAccount(accounts[0]);
                    setLoading(false);
                    return;
                }

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
                        return;
                    }
                }

                setError(err.message);
                setLoading(false);
            }
        };

        init();
    }, []);

    const getToken = useCallback(async () => {
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

            if (err.errorCode === 'interaction_in_progress') {
                console.warn('[Auth] Detected stuck interaction_in_progress flag during token refresh — clearing and retrying.');
                clearStuckInteractionFlag();
            }

            await msalInstance.acquireTokenRedirect(loginRequest);
        }
    }, []);

    const logout = useCallback(() => {
        msalInstance.logoutRedirect();
    }, []);

    return { account, loading, error, logout, getToken };
}