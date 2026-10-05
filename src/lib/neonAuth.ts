/**
 * Browser side of Neon Auth (Managed Better Auth).
 *
 * Switched on by VITE_NEON_AUTH_URL (the "Auth URL" from the Neon console). When it is not set
 * the app uses its own cookie login and none of this runs. The SDK is loaded on demand, so the
 * password-login build never downloads it.
 *
 * Neon Auth keeps the session; the API receives a short-lived (15 min) signed token as
 * `Authorization: Bearer ...` and verifies it on every request (see netlify/functions/api.mts).
 */

const AUTH_URL = ((import.meta.env.VITE_NEON_AUTH_URL as string | undefined) || '').trim().replace(/\/+$/, '');

export const neonAuthEnabled = AUTH_URL.length > 0;

type AuthClient = ReturnType<typeof import('@neondatabase/neon-js/auth').createAuthClient>;
let clientPromise: Promise<AuthClient> | null = null;

export const getAuthClient = (): Promise<AuthClient> => {
  if (!neonAuthEnabled) return Promise.reject(new Error('Neon Auth is not configured.'));
  if (!clientPromise) {
    clientPromise = import('@neondatabase/neon-js/auth').then((m) => m.createAuthClient(AUTH_URL));
  }
  return clientPromise;
};

// ---------------------------------------------------------------------------
// Access token (cached until a minute before it expires)
// ---------------------------------------------------------------------------

let cached: { token: string; expiresAt: number } | null = null;

/** Expiry (ms) read from the token's own payload. Only used to decide when to fetch a new one; the server does the real verification. */
export const tokenExpiryMs = (token: string): number => {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '=')));
    return typeof json.exp === 'number' ? json.exp * 1000 : 0;
  } catch {
    return 0;
  }
};

export const clearTokenCache = () => {
  cached = null;
};

/** A valid access token for the signed-in person, or null when signed out. */
export async function getAccessToken(forceRefresh = false): Promise<string | null> {
  if (!neonAuthEnabled) return null;
  if (!forceRefresh && cached && cached.expiresAt - 60_000 > Date.now()) return cached.token;
  try {
    const client = await getAuthClient();
    const res: any = await (client as any).token();
    const token: unknown = res?.data?.token ?? res?.token;
    if (typeof token !== 'string' || !token) {
      cached = null;
      return null;
    }
    cached = { token, expiresAt: tokenExpiryMs(token) };
    return token;
  } catch {
    cached = null;
    return null;
  }
}

// ---------------------------------------------------------------------------
// Errors the screens react to
// ---------------------------------------------------------------------------

/** Signed up (or signed in) but the email address still has to be confirmed with the emailed code. */
export class VerificationRequiredError extends Error {
  constructor(public email: string) {
    super('Please confirm your email address with the code we sent you.');
    this.name = 'VerificationRequiredError';
  }
}

/** Signed in and verified, but not part of a workspace yet (needs to create or join one). */
export class ProfileRequiredError extends Error {
  constructor(public identity: { email: string; name: string }) {
    super('Finish setting up your workspace profile.');
    this.name = 'ProfileRequiredError';
  }
}

/** Plain-language text for the errors Neon Auth returns. */
export function friendlyAuthError(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const e = err as { code?: string; message?: string; status?: number } | null;
  const code = String(e?.code || '').toUpperCase();
  const message = String(e?.message || '');
  if (code.includes('INVALID_EMAIL_OR_PASSWORD') || /invalid email or password/i.test(message)) {
    return 'Incorrect email or password.';
  }
  if (code.includes('USER_ALREADY_EXISTS') || /already exists/i.test(message)) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (code.includes('EMAIL_NOT_VERIFIED') || /not verified/i.test(message)) {
    return 'Please confirm your email address first.';
  }
  if (code.includes('INVALID_OTP') || /invalid (otp|code)/i.test(message)) {
    return 'That code is not right. Check it and try again.';
  }
  if (code.includes('OTP_EXPIRED') || /expired/i.test(message)) {
    return 'That code has expired. Request a new one.';
  }
  if (code.includes('TOO_MANY') || e?.status === 429) {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }
  if (code.includes('PASSWORD_TOO_SHORT') || code.includes('PASSWORD_TOO_LONG')) {
    return 'That password does not meet the length requirements.';
  }
  return message && message.length < 200 ? message : fallback;
}

/** True when the error means "this email is not confirmed yet". */
export const isUnverifiedEmailError = (err: unknown): boolean => {
  const e = err as { code?: string; message?: string; status?: number } | null;
  return /EMAIL_NOT_VERIFIED/i.test(String(e?.code || '')) || /not verified|verify your email/i.test(String(e?.message || ''));
};
