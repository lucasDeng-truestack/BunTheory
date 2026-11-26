import { Suspense } from "react";
import { ShopPackagesScreen } from "@/components/admin/shop-packages";

export default function AdminShopPackagesPage() {
  return (
    <Suspense>
      <ShopPackagesScreen />
    </Suspense>
  );
}
