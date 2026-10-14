/**
 * Mirrors auth-service DTOs exactly.
 * Source: http://localhost:8080/swagger/auth-api-docs
 */

export type Role = 'USER' | 'ADMIN' | 'SUPPORT';

/**
 * POST /auth/register request — RegisterDto
 *
 * Carries no role: registration always creates a USER. Granting ADMIN or
 * SUPPORT is an ADMIN-only action (PATCH /auth/users/{userId}/role), so the
 * public form cannot self-grant privilege.
 */
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

/** POST /auth/register response — RegisterResponseDto */
export interface RegisterResponse {
  id: number;
  username: string;
  email: string;
  role: string;
}

/** POST /auth/login request — LoginDto */
export interface LoginRequest {
  username: string;
  password: string;
}

/**
 * What the sign-in form submits: the credentials the backend wants, plus the
 * Remember me choice, which never leaves the browser.
 */
export interface LoginFormSubmission extends LoginRequest {
  remember: boolean;
}

/**
 * POST /auth/password request — ChangePasswordDto.
 *
 * No username: the backend takes the account from the access token, so this
 * can only change the caller's own password.
 */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * POST /auth/login and POST /auth/refresh response — LoginResponseDto.
 * Note: carries no user identity. `userId`/`role` come from the access token.
 */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

/**
 * What `credentialsReceived` applies: a token pair, and on a sign-in the
 * Remember me choice that decides which web storage holds it.
 */
export interface CredentialsReceivedPayload extends LoginResponse {
  remember?: boolean;
}

/** POST /auth/refresh and POST /auth/logout request — RefreshTokenRequestDto */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/** Claims carried by the access token, verified against auth-service JWTService. */
export interface AccessTokenClaims {
  sub: string;
  userId: number;
  role: Role;
  iat: number;
  exp: number;
}

/** The authenticated identity the UI works with, derived from the access token. */
export interface AuthUser {
  userId: number;
  username: string;
  role: Role;
}
