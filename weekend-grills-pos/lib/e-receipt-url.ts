/** Public origin for QR codes (guest phones vs POS host). */
export function getReceiptSiteOrigin(): string {
  const trimmed = process.env.NEXT_PUBLIC_POS_PUBLIC_URL?.trim().replace(/\/+$/, '');
  if (trimmed && trimmed.length > 0) return trimmed;
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

export function buildEReceiptPath(
  receiptToken: string,
  options?: { staffPreview?: boolean },
): string {
  const params = new URLSearchParams();
  params.set('token', receiptToken.trim());
  if (options?.staffPreview) params.set('preview', 'staff');
  return `/e-receipt?${params.toString()}`;
}

/** Absolute URL encoded in the guest QR code (no staff preview flag). */
export function buildEReceiptAbsoluteUrl(receiptToken: string): string {
  return `${getReceiptSiteOrigin()}${buildEReceiptPath(receiptToken)}`;
}
