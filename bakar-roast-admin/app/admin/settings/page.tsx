import { Suspense } from "react";
import { SettingsScreen } from "@/components/admin/settings-screen";

/** The screen reads the brand and section from the query string, so it renders under Suspense. */
export default function AdminSettingsPage() {
  return (
    <Suspense>
      <SettingsScreen />
    </Suspense>
  );
}
