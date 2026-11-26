import { Suspense } from "react";
import { OrdersScreen } from "@/components/admin/bun-theory/orders-list";

export default function BunTheoryOrdersPage() {
  return (
    <Suspense>
      <OrdersScreen />
    </Suspense>
  );
}
