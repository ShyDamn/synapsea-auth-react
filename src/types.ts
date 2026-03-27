export interface SynapseaAuthConfig {
  apiKey: string;
  baseURL?: string;
  callbackURL?: string;
  onSignIn?: (user: SynapseaUser) => void;
  onSignOut?: () => void;
}

/** Shapes align with GET /api/v1/auth/session (user may include metadata; provider/username often from linked accounts). */
export interface SynapseaUser {
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
export interface SynapseaSession {
  id: string;
  expiresAt: string;
  ip?: string;
  userAgent?: string;
}

export interface AuthState {
  user: SynapseaUser | null;
  session: SynapseaSession | null;
  loading: boolean;
  error: string | null;
}
