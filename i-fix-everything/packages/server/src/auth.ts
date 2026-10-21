import { createRemoteJWKSet, errors as joseErrors, jwtVerify, type JWTPayload } from 'jose';
import { getSql, type UserContext } from './db';
import { getEnv } from './env';
import { AppError } from './errors';

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function keySet() {
  if (!jwks) {
    const env = getEnv();
    jwks = createRemoteJWKSet(new URL(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`), {
      cooldownDuration: 30_000,
      cacheMaxAge: 10 * 60_000,
    });
  }
  return jwks;
}

interface SupabaseClaims extends JWTPayload {
  role?: string;
  email?: string;
  session_id?: string;
  is_anonymous?: boolean;
}

/**
 * Verify a Supabase access token (asymmetric, via JWKS) and confirm its
 * session still exists, so a signed-out or revoked session cannot keep using
 * an unexpired token. Identical for web, iOS and Android callers.
 */
export async function authenticate(authorization: string | null): Promise<UserContext> {
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!match?.[1]) throw new AppError('unauthenticated', 'Sign in to continue.');
  const env = getEnv();

  let claims: SupabaseClaims;
  try {
    const result = await jwtVerify<SupabaseClaims>(match[1], keySet(), {
      issuer: env.AUTH_JWT_ISSUER ?? `${env.SUPABASE_URL}/auth/v1`,
      audience: 'authenticated',
      algorithms: ['ES256', 'RS256', 'EdDSA'],
      clockTolerance: 30,
    });
    claims = result.payload;
  } catch (err) {
    if (err instanceof joseErrors.JWKSTimeout || !(err instanceof joseErrors.JOSEError)) {
      throw new AppError('service_unavailable', 'Sign-in could not be checked right now. Try again.');
    }
    throw new AppError('unauthenticated', 'Your session has expired. Sign in again.');
  }

  if (!claims.sub || claims.role !== 'authenticated' || claims.is_anonymous) {
    throw new AppError('unauthenticated', 'Sign in to continue.');
  }

  if (claims.session_id) {
    const rows = await getSql()`
      select 1 from auth.sessions
      where id = ${claims.session_id} and user_id = ${claims.sub}
        and (not_after is null or not_after > now())
      limit 1`;
    if (rows.length === 0) throw new AppError('unauthenticated', 'You were signed out. Sign in again.');
  } else {
    throw new AppError('unauthenticated', 'Sign in to continue.');
  }

  return { id: claims.sub, email: claims.email ?? null, sessionId: claims.session_id };
}
