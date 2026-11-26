import { Suspense } from "react";
import { RequestsScreen } from "@/components/admin/requests-list";

export default function AdminRequestsPage() {
  return (
    <Suspense>
      <RequestsScreen />
    </Suspense>
  );
}
