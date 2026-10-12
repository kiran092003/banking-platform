import type { AccessTokenClaims, AuthUser, Role } from '@/types/auth';

const VALID_ROLES: readonly string[] = ['USER', 'ADMIN', 'SUPPORT'];

/**
 * Decodes a JWT payload without verifying the signature.
 *
 * This is for UI affordances only (which nav to show, which route to allow).
 * The backend re-validates the signature and the role on every request, so a
 * tampered token buys nothing — the frontend is not the security boundary.
 */
export function decodeAccessToken(token: string): AccessTokenClaims | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;

    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');

    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    );

    const claims = JSON.parse(json) as Partial<AccessTokenClaims>;

    if (
      typeof claims.sub !== 'string' ||
      typeof claims.userId !== 'number' ||
      typeof claims.role !== 'string' ||
      !VALID_ROLES.includes(claims.role)
    ) {
      return null;
    }

    return claims as AccessTokenClaims;
  } catch {
    return null;
  }
}

export function userFromAccessToken(token: string): AuthUser | null {
  const claims = decodeAccessToken(token);
  if (!claims) return null;
  return {
    userId: claims.userId,
    username: claims.sub,
    role: claims.role as Role,
  };
}

/** `exp` is in seconds. `skewSeconds` treats nearly-expired tokens as expired. */
export function isTokenExpired(token: string, skewSeconds = 10): boolean {
  const claims = decodeAccessToken(token);
  if (!claims) return true;
  return claims.exp * 1000 <= Date.now() + skewSeconds * 1000;
}
