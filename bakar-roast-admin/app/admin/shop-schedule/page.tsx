import { Suspense } from "react";
import { ShopScheduleScreen } from "@/components/admin/shop-schedule";

export default function AdminShopSchedulePage() {
  return (
    <Suspense>
      <ShopScheduleScreen />
    </Suspense>
  );
}
