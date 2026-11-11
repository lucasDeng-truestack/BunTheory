export function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

const DEFAULT_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3011',
  'http://localhost:3200',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3011',
  'http://127.0.0.1:3200',
] as const;

/** Browser origins allowed by CORS and trusted by Better Auth. */
export function getAllowedOrigins(): string[] {
  const configured = [process.env.FRONTEND_URL, process.env.FRONTEND_URLS]
    .filter(Boolean)
    .flatMap((value) => value!.split(','))
    .map((value) => normalizeOrigin(value))
    .filter(Boolean);

  /**
   * Always merge dev-origin defaults so localhost vs 127.0.0.1 mismatches don't break POS fetches (e.g. "Failed to load menu").
   * Production can still add explicit origins via FRONTEND_URL / FRONTEND_URLS.
   */
  return [...new Set([...DEFAULT_ORIGINS, ...configured])];
}
