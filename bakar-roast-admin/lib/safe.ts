/**
 * Resolve a backend call, or `fallback` if it fails (API down, timeout, bad response).
 * Pages use this so a dead backend degrades a section instead of crashing the render.
 * Pass `null` as the fallback when the UI must tell "failed" apart from "empty".
 */
export async function safe<T, F = T>(promise: Promise<T>, fallback: F): Promise<T | F> {
  try {
    return await promise;
  } catch (err) {
    console.warn(`[safe] backend call failed, using fallback: ${(err as Error)?.message ?? err}`);
    return fallback;
  }
}
