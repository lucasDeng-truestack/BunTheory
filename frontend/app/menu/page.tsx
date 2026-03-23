import { getMenu, getCanOrder } from "@/lib/menu-data";
import { MenuPageView } from "@/components/menu/menu-page-view";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const [menuItems, canOrder] = await Promise.all([
    getMenu(false),
    getCanOrder(),
  ]);

  return <MenuPageView menuItems={menuItems} canOrder={canOrder} />;
}
