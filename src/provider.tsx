import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { SynapseaAuthClient } from './client';
import type { SynapseaAuthConfig, SynapseaUser, SynapseaSession, AuthState } from './types';

export type SignInOptions = { method?: string; callbackURL?: string; scopes?: string[] };

interface AuthContextValue extends AuthState {
  client: SynapseaAuthClient;
  signIn: (provider: string, options?: SignInOptions) => Promise<void>;
  signOut: () => Promise<void>;
  getToken: () => string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const TOKEN_KEY = 'synapsea_session';

export function SynapseaAuthProvider({ config, children }: { config: SynapseaAuthConfig; children: ReactNode }) {
  const [client] = useState(() => new SynapseaAuthClient(config));
  const [state, setState] = useState<AuthState>({ user: null, session: null, loading: true, error: null });

  const getToken = useCallback(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  }, []);

  // Check session on mount
  useEffect(() => {
    const token = getToken();
    if (!token) { setState(s => ({ ...s, loading: false })); return; }

    client.getSession(token)
        .then(({ user, session }) => {
          setState({ user, session, loading: false, error: null });
          config.onSignIn?.(user);
        })
        .catch(() => {
          localStorage.removeItem(TOKEN_KEY);
          setState({ user: null, session: null, loading: false, error: null });
        });
  }, [client, config, getToken]);

  // OAuth redirect: only sa_code → exchange (no session token in URL)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('sa_code');

    const stripAuthParamsFromUrl = () => {
      const url = new URL(window.location.href);
      url.searchParams.delete('sa_code');
      url.searchParams.delete('sa_token');
      url.searchParams.delete('session_token');
      url.searchParams.delete('sa_user_id');
      window.history.replaceState({}, '', url.toString());
    };

    if (code) {
      setState((s) => ({ ...s, loading: true, error: null }));
      void (async () => {
        try {
          const { token, user } = await client.exchangeCode(code);
          localStorage.setItem(TOKEN_KEY, token);
          stripAuthParamsFromUrl();
          const { session } = await client.getSession(token);
          setState({ user, session, loading: false, error: null });
          config.onSignIn?.(user);
        } catch (err: unknown) {
          stripAuthParamsFromUrl();
          const message = err instanceof Error ? err.message : 'Exchange failed';
          setState((s) => ({ ...s, loading: false, error: message }));
        }
      })();
    }
  }, [client, config]);

  const signIn = useCallback(async (provider: string, options?: SignInOptions) => {
    try {
      await client.signIn(provider, options);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign-in failed';
      setState((s) => ({ ...s, error: message }));
    }
  }, [client]);

  const signOut = useCallback(async () => {
    const token = getToken();
    if (token) {
      try { await client.signOut(token); } catch {}
    }
    localStorage.removeItem(TOKEN_KEY);
    setState({ user: null, session: null, loading: false, error: null });
    config.onSignOut?.();
  }, [client, config, getToken]);

  return (
      <AuthContext.Provider value={{ ...state, client, signIn, signOut, getToken }}>
        {children}
      </AuthContext.Provider>
  );
}

export function useSynapseaAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useSynapseaAuth must be used within <SynapseaAuthProvider>');
  return ctx;
}
