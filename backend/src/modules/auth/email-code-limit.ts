/**
 * Per-email caps on sign-in codes, on top of the per-IP limits. Each new code resets Better
 * Auth's 3-attempts-per-code count, so without a per-email cap someone could keep asking for
 * codes from many IPs and guess, and every staff code is an admin login. In memory (one API
 * instance); a restart clears it, which only gives back one hour's allowance.
 */
const HOUR = 60 * 60 * 1000;
export const CODE_SENDS_PER_HOUR = 5;
export const CODE_TRIES_PER_HOUR = 10;

const sends = new Map<string, number[]>();
const tries = new Map<string, number[]>();

/** Records one use and says whether it is still inside the cap. */
function take(map: Map<string, number[]>, email: string, max: number): boolean {
  const key = email.trim().toLowerCase();
  const now = Date.now();
  const recent = (map.get(key) ?? []).filter((t) => now - t < HOUR);
  if (recent.length >= max) {
    map.set(key, recent);
    return false;
  }
  recent.push(now);
  map.set(key, recent);
  // Keep the maps small: drop emails with nothing in the last hour.
  if (map.size > 5000) for (const [k, v] of map) if (!v.some((t) => now - t < HOUR)) map.delete(k);
  return true;
}

export const takeCodeSend = (email: string) => take(sends, email, CODE_SENDS_PER_HOUR);
export const takeCodeTry = (email: string) => take(tries, email, CODE_TRIES_PER_HOUR);
