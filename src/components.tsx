import { useSynapseaAuth } from './provider';
import type { ReactNode } from 'react';

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

export function LoginButton({ provider, method, callbackURL, scopes, children, className, style }: LoginButtonProps) {
  const { signIn } = useSynapseaAuth();

  const options =
      method || callbackURL || scopes?.length
          ? { method, callbackURL, scopes }
          : undefined;

  return (
      <button
          onClick={() => signIn(provider, options)}
          className={className}
          style={style}
      >
        {children || `Sign in with ${provider}`}
      </button>
  );
}
