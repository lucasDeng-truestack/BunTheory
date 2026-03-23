import { getMenu as fetchMenu } from "@/services/menu.service";
import { getCanOrder as fetchCanOrder } from "@/services/orders.service";

export async function getMenu(availableOnly = false) {
  return fetchMenu(availableOnly);
}

export async function getCanOrder() {
  return fetchCanOrder();
}
