import { Suspense } from "react";
import { ShopOrdersScreen } from "@/components/admin/shop-orders";

export default function AdminShopOrdersPage() {
  return (
    <Suspense>
      <ShopOrdersScreen />
    </Suspense>
  );
}
