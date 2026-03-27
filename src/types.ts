import type { UserProfile } from '@synapsea/auth-js';

/** Совпадает с полями user в GET /api/v1/auth/session (camelCase, как в auth-js). */
export type SynapseaUser = UserProfile;

export type SynapseaSession = { id: string; expiresAt: string };

// React-specific types stay here
export interface SynapseaAuthConfig {
  apiKey: string;
  baseURL?: string;
  callbackURL?: string;
  onSignIn?: (user: SynapseaUser) => void;
  onSignOut?: () => void;
}

export interface AuthState {
  user: SynapseaUser | null;
  session: SynapseaSession | null;
  loading: boolean;
  error: string | null;
}
