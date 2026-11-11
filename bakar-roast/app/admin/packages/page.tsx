import { Suspense } from "react";
import { PackagesScreen } from "@/components/admin/packages-list";

export default function AdminPackagesPage() {
  return (
    <Suspense>
      <PackagesScreen />
    </Suspense>
  );
}
