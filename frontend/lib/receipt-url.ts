/** True when the stored receipt URL points at a PDF (saved with `.pdf` extension). */
export function isPdfReceiptUrl(url: string): boolean {
  const path = url.trim().split("?")[0] ?? "";
  return /\.pdf$/i.test(path);
}
