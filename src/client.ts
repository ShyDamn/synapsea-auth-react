import type { SynapseaAuthConfig, SynapseaUser, SynapseaSession } from './types';

export class SynapseaAuthClient {
  private apiKey: string;
  private baseURL: string;
  private callbackURL: string;

  constructor(config: SynapseaAuthConfig) {
    this.apiKey = config.apiKey;
    const raw = config.baseURL || 'https://auth.synapsea.agency';
    this.baseURL = raw.replace(/\/$/, '');
    this.callbackURL = config.callbackURL || (typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : '');
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${this.baseURL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Synapsea-Key': this.apiKey,
        ...options.headers,
      },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(data.error || `Request failed: ${res.status}`);
    }
    return res.json();
  }

  /** Get list of configured providers for this project (matches GET /api/v1/auth/providers) */
  async getProviders(): Promise<{
    providers: Array<{ id: string; name: string; configured: boolean; methods: Array<{ id: string; type: string }> }>;
  }> {
    return this.request('/api/v1/auth/providers');
  }

  /**
   * Start OAuth redirect flow (`oauth_redirect` methods: oauth, oidc, …).
   * For Telegram OIDC use `method: 'oidc'` (or `'oauth'` — API maps it to oidc).
   * Telegram Login Widget / Mini App: use `signInTelegramWidget` / `signInTelegramMiniApp` instead.
   */
  async signIn(
      provider: string,
      options?: { method?: string; callbackURL?: string; scopes?: string[] },
  ): Promise<void> {
    const body: Record<string, unknown> = {
      provider,
      method: options?.method,
      callbackURL: options?.callbackURL || this.callbackURL,
    };
    if (options?.scopes?.length) body.scopes = options.scopes;

    const { url } = await this.request<{ url: string }>('/api/v1/auth/sign-in/social', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    window.location.href = url;
  }

  /** Telegram Login Widget — POST body = auth fields from the widget (`id`, `hash`, `auth_date`, …). */
  async signInTelegramWidget(
      widgetAuth: Record<string, unknown>,
  ): Promise<{ user: SynapseaUser; token: string }> {
    return this.request('/api/v1/auth/sign-in/telegram/widget', {
      method: 'POST',
      body: JSON.stringify(widgetAuth),
    });
  }

  /** Telegram Mini App — pass `initData` from WebApp. */
  async signInTelegramMiniApp(
      initData: string,
  ): Promise<{ user: SynapseaUser; token: string }> {
    return this.request('/api/v1/auth/sign-in/telegram/miniapp', {
      method: 'POST',
      body: JSON.stringify({ initData }),
    });
  }

  /** Exchange one-time `sa_code` from OAuth redirect URL for a session token. */
  async exchangeCode(code: string): Promise<{ token: string; user: SynapseaUser }> {
    return this.request<{ token: string; user: SynapseaUser }>('/api/v1/auth/exchange-code', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  /**
   * Verify token (Google One Tap, VK silent_token, etc).
   * API returns `{ token, user }` — not `session_token`.
   */
  async verifyToken(
      provider: string,
      method: string,
      data: Record<string, unknown>,
  ): Promise<{ user: SynapseaUser; token: string }> {
    return this.request('/api/v1/auth/verify-token', {
      method: 'POST',
      body: JSON.stringify({ provider, method, ...data }),
    });
  }

  /** Get current session */
  async getSession(token: string): Promise<{ user: SynapseaUser; session: SynapseaSession }> {
    return this.request('/api/v1/auth/session', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
  }

  /** Sign out */
  async signOut(token: string): Promise<void> {
    await this.request('/api/v1/auth/sign-out', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    });
  }

  /** Send email OTP */
  async sendEmailOTP(email: string): Promise<{ success: boolean }> {
    return this.request('/api/v1/auth/sign-in/email-otp/send', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  /** Verify email OTP */
  async verifyEmailOTP(email: string, code: string): Promise<{ user: SynapseaUser; token: string }> {
    return this.request('/api/v1/auth/sign-in/email-otp/verify', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
  }

  /** Send SMS OTP */
  async sendSmsOTP(phone: string): Promise<{ success: boolean }> {
    return this.request('/api/v1/auth/sign-in/sms-otp/send', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  }

  /** Verify SMS OTP */
  async verifySmsOTP(phone: string, code: string): Promise<{ user: SynapseaUser; token: string }> {
    return this.request('/api/v1/auth/sign-in/sms-otp/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    });
  }
}
