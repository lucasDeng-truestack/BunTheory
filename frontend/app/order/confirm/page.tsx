import { getCanOrder } from "@/lib/menu-data";
import { getPublicSettings } from "@/services/storefront-settings.service";
import { ConfirmPayView } from "@/components/order/confirm-pay-view";

export const dynamic = "force-dynamic";

export default async function ConfirmPage() {
  const [canOrder, settings] = await Promise.all([
    getCanOrder(),
    getPublicSettings().catch(() => null),
  ]);

  return (
    <ConfirmPayView
      settings={settings}
      minimumDeliveryAmount={canOrder.minimumDeliveryAmount}
    />
  );
}
