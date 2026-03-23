import { getSettings as fetchSettings } from "@/services/admin.service";
import {
  getOrders as fetchOrders,
  getTodayOrderCount as fetchTodayCount,
} from "@/services/orders.service";

export async function getOrders(token: string) {
  return fetchOrders(token);
}

export async function getSettings(token: string) {
  return fetchSettings(token);
}

export async function getTodayOrderCount() {
  return fetchTodayCount();
}
