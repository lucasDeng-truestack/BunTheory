import { getMenu, getCanOrder } from "@/lib/menu-data";
import { getPublicSettings } from "@/services/storefront-settings.service";
import { MenuPageView } from "@/components/menu/menu-page-view";
import { FlyToCartProvider } from "@/components/menu/fly-to-cart";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const [menuItems, canOrder, settings] = await Promise.all([
    getMenu(false),
    getCanOrder(),
    getPublicSettings().catch(() => null),
  ]);

  return (
    <FlyToCartProvider>
      <MenuPageView menuItems={menuItems} canOrder={canOrder} settings={settings} />
    </FlyToCartProvider>
  );
}
