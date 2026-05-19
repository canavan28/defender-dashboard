import { useState, useEffect } from 'react';
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

  const logout = () => {
    msalInstance.logoutRedirect();
  };

  const getToken = async () => {
    const activeAccount = msalInstance.getActiveAccount();
    if (!activeAccount) throw new Error('No active account');
    const response = await msalInstance.acquireTokenSilent({
      ...loginRequest,
      account: activeAccount
    });
    return response.accessToken;
  };

  return { account, loading, error, logout, getToken };
}