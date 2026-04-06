/** Pre-filled WhatsApp chat for sending payment proof (optional env). */
export function buildCustomerWhatsAppReceiptUrl(orderLabel: string): string | null {
  const raw = process.env.NEXT_PUBLIC_CUSTOMER_WHATSAPP_E164?.trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  const text = encodeURIComponent(
    `Hi! I placed order ${orderLabel}. I'm sending my payment receipt here.`
  );
  return `https://wa.me/${digits}?text=${text}`;
}
