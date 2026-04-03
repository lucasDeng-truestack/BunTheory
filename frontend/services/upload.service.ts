const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function uploadImage(file: File, token: string): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/uploads/image`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || "Upload failed");
  }
  return res.json();
}

/** Public — payment receipt before placing order (images or PDF; no admin token). */
export async function uploadPaymentReceipt(
  file: File
): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/uploads/payment-receipt`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    const raw = err?.message ?? err?.error;
    const message = Array.isArray(raw) ? raw.join(" ") : String(raw || res.statusText);
    throw new Error(message || "Upload failed");
  }
  return res.json();
}
