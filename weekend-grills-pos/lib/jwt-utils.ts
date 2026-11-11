/**
 * Best-effort client expiry check for JWT-shaped tokens. Login now returns an opaque
 * Better Auth session token, which has no readable expiry: treat it as not expired and
 * let the API's 401 decide.
 */
export function isJwtExpired(token: string, leewaySec = 30): boolean {
  try {
    const part = token.split('.')[1];
    if (!part) return false;
    const payload = JSON.parse(
      atob(part.replace(/-/g, '+').replace(/_/g, '/')),
    ) as { exp?: number };
    if (typeof payload.exp !== 'number') return false;
    return payload.exp * 1000 < Date.now() - leewaySec * 1000;
  } catch {
    return false;
  }
}
