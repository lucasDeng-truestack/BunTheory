/** Best-effort client expiry check — the API still validates the signature. */
export function isJwtExpired(token: string, leewaySec = 30): boolean {
  try {
    const part = token.split('.')[1];
    if (!part) return true;
    const payload = JSON.parse(
      atob(part.replace(/-/g, '+').replace(/_/g, '/')),
    ) as { exp?: number };
    if (typeof payload.exp !== 'number') return false;
    return payload.exp * 1000 < Date.now() - leewaySec * 1000;
  } catch {
    return true;
  }
}
