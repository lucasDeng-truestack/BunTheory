import { NextResponse, type NextRequest } from "next/server";
import { brand } from "@/lib/content";
import { getShopContact } from "@/lib/shop-api";

/**
 * /wa?text=… sends the visitor to a WhatsApp chat with the business number. Every "message us"
 * link on the site (and in our emails) points here, so the owner can change the number in the
 * admin without a code change. The number is read from the API (cached for a minute); if the API
 * cannot be reached, the built-in number is used so the link never breaks.
 */
export async function GET(request: NextRequest) {
  let number = brand.whatsappNumber;
  try {
    const contact = await getShopContact();
    if (/^\d{9,15}$/.test(contact.whatsappNumber)) number = contact.whatsappNumber;
  } catch {
    /* keep the built-in number */
  }
  const text = (request.nextUrl.searchParams.get("text") ?? "").slice(0, 1000);
  const target = new URL(`https://wa.me/${number}`);
  if (text) target.searchParams.set("text", text);
  return NextResponse.redirect(target, 302);
}
