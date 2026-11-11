import { Suspense } from "react";
import { OrderDetailScreen } from "@/components/admin/bun-theory/order-detail";

export default async function BunTheoryOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense>
      <OrderDetailScreen id={id} />
    </Suspense>
  );
}
