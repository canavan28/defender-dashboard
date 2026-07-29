import { useState, useEffect, useCallback } from 'react';
import { msalInstance, loginRequest } from '../auth/msalConfig';

export function useAuth() {
    const [account, setAccount] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const init = async () => {
            try {
                await msalInstance.initialize();

                // Handle redirect response
                const response = await msalInstance.handleRedirectPromise();
                if (response?.account) {
                    msalInstance.setActiveAccount(response.account);
                    setAccount(response.account);
                    setLoading(false);
                    return;
                }

                // Check for existing session
                const accounts = msalInstance.getAllAccounts();
                if (accounts.length > 0) {
                    msalInstance.setActiveAccount(accounts[0]);
                    setAccount(accounts[0]);
                    setLoading(false);
                    return;
                }

                // No session — trigger login redirect
                await msalInstance.loginRedirect(loginRequest);
            } catch (err) {
                console.error('[Auth] Error:', err);
                setError(err.message);
                setLoading(false);
            }
        };

        init();
    }, []);

    // FIX: was a plain function before, recreated on every render — a new
    // getToken reference every render cascades into a new `api` object in
    // App.jsx (since createApi(getToken) wasn't memoized there either),
    // which can retrigger any effect elsewhere that lists api/getToken as a
    // dependency, causing a tight re-render loop with no setInterval/delay
    // involved. This is very likely the source of the runaway
    // /api/tickets/all requests. useCallback with an empty dependency array
    // keeps this one stable reference for the component's lifetime, matching
    // how msalInstance/loginRequest are themselves stable module-level values.
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
            console.error('[Auth] Silent token failed, redirecting:', err);
            await msalInstance.acquireTokenRedirect(loginRequest);
        }
    }, []);

    const logout = useCallback(() => {
        msalInstance.logoutRedirect();
    }, []);

    return { account, loading, error, logout, getToken };
}