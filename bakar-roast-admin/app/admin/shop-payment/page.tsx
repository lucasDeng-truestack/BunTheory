import { redirect } from "next/navigation";

/** Payment and contact moved into Settings. Old links and bookmarks land there. */
export default function ShopPaymentPage() {
  redirect("/admin/settings?brand=bakar-roast&section=payment");
}
