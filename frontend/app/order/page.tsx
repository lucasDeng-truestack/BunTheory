import { getPublicSettings } from "@/services/storefront-settings.service";
import { OrderCartView } from "@/components/order/order-cart-view";

export const dynamic = "force-dynamic";

export default async function OrderPage() {
  const settings = await getPublicSettings().catch(() => null);
  return <OrderCartView settings={settings} />;
}
