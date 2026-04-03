import { redirect } from "next/navigation";

/** Legacy route: payment/receipt context now lives on Orders and order detail. */
export default function AdminPaymentsRedirectPage() {
  redirect("/admin/orders");
}
