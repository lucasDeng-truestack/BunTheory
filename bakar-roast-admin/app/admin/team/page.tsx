import { redirect } from "next/navigation";

/** Team moved into Settings. Old links and bookmarks land there. */
export default function AdminTeamPage() {
  redirect("/admin/settings?section=team");
}
