import { redirect } from "next/navigation";

/** The Bun Theory settings moved into Settings. Old links and bookmarks land there. */
export default function BunTheorySettingsPage() {
  redirect("/admin/settings?brand=bun-theory&section=ordering");
}
