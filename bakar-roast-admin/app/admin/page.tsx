import { redirect } from "next/navigation";

// The admin home is the Bakar & Roast shop orders list.
export default function AdminHome() {
  redirect("/admin/shop-orders");
}
