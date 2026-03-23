import { getOrder as fetchOrder } from "@/services/orders.service";

export async function getOrder(id: string) {
  return fetchOrder(id);
}
