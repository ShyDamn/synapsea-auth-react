// src/provider.tsx
import { createContext, useContext, useState, useEffect, useCallback } from "react";

// src/client.ts
var SynapseaAuthClient = class {
  constructor(config) {
    this.apiKey = config.apiKey;
    const raw = config.baseURL || "https://auth.synapsea.agency";
    this.baseURL = raw.replace(/\/$/, "");
    this.callbackURL = config.callbackURL || (typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : "");
  }
  async request(path, options = {}) {
    const res = await fetch(`${this.baseURL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-Synapsea-Key": this.apiKey,
        ...options.headers
      }
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(data.error || `Request failed: ${res.status}`);
    }
    return res.json();
  }
  /** Get list of configured providers for this project (matches GET /api/v1/auth/providers) */
  async getProviders() {
    return this.request("/api/v1/auth/providers");
  }
  /**
   * Start OAuth redirect flow (`oauth_redirect` methods: oauth, oidc, …).
   * For Telegram OIDC use `method: 'oidc'` (or `'oauth'` — API maps it to oidc).
   * Telegram Login Widget / Mini App: use `signInTelegramWidget` / `signInTelegramMiniApp` instead.
   */
  async signIn(provider, options) {
    const body = {
      provider,
      method: options?.method,
      callbackURL: options?.callbackURL || this.callbackURL
    };
    if (options?.scopes?.length) body.scopes = options.scopes;
    const { url } = await this.request("/api/v1/auth/sign-in/social", {
      method: "POST",
      body: JSON.stringify(body)
    });
    window.location.href = url;
  }
  /** Telegram Login Widget — POST body = auth fields from the widget (`id`, `hash`, `auth_date`, …). */
  async signInTelegramWidget(widgetAuth) {
    return this.request("/api/v1/auth/sign-in/telegram/widget", {
      method: "POST",
      body: JSON.stringify(widgetAuth)
    });
  }
  /** Telegram Mini App — pass `initData` from WebApp. */
  async signInTelegramMiniApp(initData) {
    return this.request("/api/v1/auth/sign-in/telegram/miniapp", {
      method: "POST",
      body: JSON.stringify({ initData })
    });
  }
  /** Exchange one-time `sa_code` from OAuth redirect URL for a session token. */
  async exchangeCode(code) {
    return this.request("/api/v1/auth/exchange-code", {
      method: "POST",
      body: JSON.stringify({ code })
    });
  }
  /**
   * Verify token (Google One Tap, VK silent_token, etc).
   * API returns `{ token, user }` — not `session_token`.
   */
  async verifyToken(provider, method, data) {
    return this.request("/api/v1/auth/verify-token", {
      method: "POST",
      body: JSON.stringify({ provider, method, ...data })
    });
  }
  /** Get current session */
  async getSession(token) {
    return this.request("/api/v1/auth/session", {
      headers: { "Authorization": `Bearer ${token}` }
    });
  }
  /** Sign out */
  async signOut(token) {
    await this.request("/api/v1/auth/sign-out", {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` }
    });
  }
  /** Send email OTP */
  async sendEmailOTP(email) {
    return this.request("/api/v1/auth/sign-in/email-otp/send", {
      method: "POST",
      body: JSON.stringify({ email })
    });
  }
  /** Verify email OTP */
  async verifyEmailOTP(email, code) {
    return this.request("/api/v1/auth/sign-in/email-otp/verify", {
      method: "POST",
      body: JSON.stringify({ email, code })
    });
  }
  /** Send SMS OTP */
  async sendSmsOTP(phone) {
    return this.request("/api/v1/auth/sign-in/sms-otp/send", {
      method: "POST",
      body: JSON.stringify({ phone })
    });
  }
  /** Verify SMS OTP */
  async verifySmsOTP(phone, code) {
    return this.request("/api/v1/auth/sign-in/sms-otp/verify", {
      method: "POST",
      body: JSON.stringify({ phone, code })
    });
  }
};

// src/provider.tsx
import { jsx } from "react/jsx-runtime";
var AuthContext = createContext(null);
var TOKEN_KEY = "synapsea_session";
function SynapseaAuthProvider({ config, children }) {
  const [client] = useState(() => new SynapseaAuthClient(config));
  const [state, setState] = useState({ user: null, session: null, loading: true, error: null });
  const getToken = useCallback(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
  }, []);
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    client.getSession(token).then(({ user, session }) => {
      setState({ user, session, loading: false, error: null });
      config.onSignIn?.(user);
    }).catch(() => {
      localStorage.removeItem(TOKEN_KEY);
      setState({ user: null, session: null, loading: false, error: null });
    });
  }, [client, config, getToken]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("sa_code");
    const stripAuthParamsFromUrl = () => {
      const url = new URL(window.location.href);
      url.searchParams.delete("sa_code");
      url.searchParams.delete("sa_token");
      url.searchParams.delete("session_token");
      url.searchParams.delete("sa_user_id");
      window.history.replaceState({}, "", url.toString());
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
        } catch (err) {
          stripAuthParamsFromUrl();
          const message = err instanceof Error ? err.message : "Exchange failed";
          setState((s) => ({ ...s, loading: false, error: message }));
        }
      })();
    }
  }, [client, config]);
  const signIn = useCallback(async (provider, options) => {
    try {
      await client.signIn(provider, options);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign-in failed";
      setState((s) => ({ ...s, error: message }));
    }
  }, [client]);
  const signOut = useCallback(async () => {
    const token = getToken();
    if (token) {
      try {
        await client.signOut(token);
      } catch {
      }
    }
    localStorage.removeItem(TOKEN_KEY);
    setState({ user: null, session: null, loading: false, error: null });
    config.onSignOut?.();
  }, [client, config, getToken]);
  return /* @__PURE__ */ jsx(AuthContext.Provider, { value: { ...state, client, signIn, signOut, getToken }, children });
}
function useSynapseaAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useSynapseaAuth must be used within <SynapseaAuthProvider>");
  return ctx;
}

// src/components.tsx
import { jsx as jsx2 } from "react/jsx-runtime";
function LoginButton({ provider, method, callbackURL, scopes, children, className, style }) {
  const { signIn } = useSynapseaAuth();
  const options = method || callbackURL || scopes?.length ? { method, callbackURL, scopes } : void 0;
  return /* @__PURE__ */ jsx2(
    "button",
    {
      onClick: () => signIn(provider, options),
      className,
      style,
      children: children || `Sign in with ${provider}`
    }
  );
}
export {
  LoginButton,
  SynapseaAuthClient,
  SynapseaAuthProvider,
  useSynapseaAuth
};
