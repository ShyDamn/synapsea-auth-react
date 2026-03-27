import * as react_jsx_runtime from 'react/jsx-runtime';
import { ReactNode } from 'react';

interface SynapseaAuthConfig {
    apiKey: string;
    baseURL?: string;
    callbackURL?: string;
    onSignIn?: (user: SynapseaUser) => void;
    onSignOut?: () => void;
}
/** Shapes align with GET /api/v1/auth/session (user may include metadata; provider/username often from linked accounts). */
interface SynapseaUser {
    id: string;
    email: string | null;
    emailVerified: boolean;
    name: string | null;
    avatarUrl: string | null;
    phone: string | null;
    username?: string | null;
    provider?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
    lastSignIn?: string;
}
/** API returns only id + expiresAt on /session; ip/userAgent are not exposed in this response. */
interface SynapseaSession {
    id: string;
    expiresAt: string;
    ip?: string;
    userAgent?: string;
}
interface AuthState {
    user: SynapseaUser | null;
    session: SynapseaSession | null;
    loading: boolean;
    error: string | null;
}

declare class SynapseaAuthClient {
    private apiKey;
    private baseURL;
    private callbackURL;
    constructor(config: SynapseaAuthConfig);
    private request;
    /** Get list of configured providers for this project (matches GET /api/v1/auth/providers) */
    getProviders(): Promise<{
        providers: Array<{
            id: string;
            name: string;
            configured: boolean;
            methods: Array<{
                id: string;
                type: string;
            }>;
        }>;
    }>;
    /**
     * Start OAuth redirect flow (`oauth_redirect` methods: oauth, oidc, …).
     * For Telegram OIDC use `method: 'oidc'` (or `'oauth'` — API maps it to oidc).
     * Telegram Login Widget / Mini App: use `signInTelegramWidget` / `signInTelegramMiniApp` instead.
     */
    signIn(provider: string, options?: {
        method?: string;
        callbackURL?: string;
        scopes?: string[];
    }): Promise<void>;
    /** Telegram Login Widget — POST body = auth fields from the widget (`id`, `hash`, `auth_date`, …). */
    signInTelegramWidget(widgetAuth: Record<string, unknown>): Promise<{
        user: SynapseaUser;
        token: string;
    }>;
    /** Telegram Mini App — pass `initData` from WebApp. */
    signInTelegramMiniApp(initData: string): Promise<{
        user: SynapseaUser;
        token: string;
    }>;
    /** Exchange one-time `sa_code` from OAuth redirect URL for a session token. */
    exchangeCode(code: string): Promise<{
        token: string;
        user: SynapseaUser;
    }>;
    /**
     * Verify token (Google One Tap, VK silent_token, etc).
     * API returns `{ token, user }` — not `session_token`.
     */
    verifyToken(provider: string, method: string, data: Record<string, unknown>): Promise<{
        user: SynapseaUser;
        token: string;
    }>;
    /** Get current session */
    getSession(token: string): Promise<{
        user: SynapseaUser;
        session: SynapseaSession;
    }>;
    /** Sign out */
    signOut(token: string): Promise<void>;
    /** Send email OTP */
    sendEmailOTP(email: string): Promise<{
        success: boolean;
    }>;
    /** Verify email OTP */
    verifyEmailOTP(email: string, code: string): Promise<{
        user: SynapseaUser;
        token: string;
    }>;
    /** Send SMS OTP */
    sendSmsOTP(phone: string): Promise<{
        success: boolean;
    }>;
    /** Verify SMS OTP */
    verifySmsOTP(phone: string, code: string): Promise<{
        user: SynapseaUser;
        token: string;
    }>;
}

type SignInOptions = {
    method?: string;
    callbackURL?: string;
    scopes?: string[];
};
interface AuthContextValue extends AuthState {
    client: SynapseaAuthClient;
    signIn: (provider: string, options?: SignInOptions) => Promise<void>;
    signOut: () => Promise<void>;
    getToken: () => string | null;
}
declare function SynapseaAuthProvider({ config, children }: {
    config: SynapseaAuthConfig;
    children: ReactNode;
}): react_jsx_runtime.JSX.Element;
declare function useSynapseaAuth(): AuthContextValue;

interface LoginButtonProps {
    provider: string;
    method?: string;
    /** Override callback URL for this button (defaults to `SynapseaAuthClient` / provider config). */
    callbackURL?: string;
    /** OAuth scopes (e.g. Telegram OIDC: `['openid', 'profile']`). */
    scopes?: string[];
    children?: ReactNode;
    className?: string;
    style?: React.CSSProperties;
}
declare function LoginButton({ provider, method, callbackURL, scopes, children, className, style }: LoginButtonProps): react_jsx_runtime.JSX.Element;

export { type AuthState, LoginButton, SynapseaAuthClient, type SynapseaAuthConfig, SynapseaAuthProvider, type SynapseaSession, type SynapseaUser, useSynapseaAuth };
