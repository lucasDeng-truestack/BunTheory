"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { OrderTable } from "@/components/admin/order-table";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getOrders, type GetOrdersParams } from "@/services/orders.service";
import { getMenu } from "@/services/menu.service";
import type { Order } from "@/types/order";
import type { MenuItem } from "@/types/menu";
import { Loader2, RefreshCw, Search, UtensilsCrossed } from "lucide-react";

const DATE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "week", label: "Last 7 days" },
  { value: "month", label: "Last 30 days" },
  { value: "all", label: "All time" },
] as const;

export default function AdminOrdersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<GetOrdersParams["date"]>("today");
  const [customerInput, setCustomerInput] = useState("");
  const [appliedCustomer, setAppliedCustomer] = useState("");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [itemFilter, setItemFilter] = useState<string>("all");

  const fetchOrders = useCallback(async () => {
    const t = localStorage.getItem("admin_token");
    if (!t) {
      router.replace("/admin/login");
      return;
    }
    setToken(t);
    try {
      const params: GetOrdersParams = { date: dateFilter ?? "today" };
      if (appliedCustomer.trim()) params.customer = appliedCustomer.trim();
      if (itemFilter && itemFilter !== "all") params.menuId = itemFilter;
      const [o, menu] = await Promise.all([
        getOrders(t, params),
        getMenu(false),
      ]);
      setOrders(o);
      setMenuItems(menu);
    } catch {
      router.replace("/admin/login");
    } finally {
      setLoading(false);
    }
  }, [router, dateFilter, appliedCustomer, itemFilter]);

  useEffect(() => {
    setLoading(true);
    void fetchOrders();
  }, [fetchOrders]);

  const makeList = orders.reduce<Record<string, { name: string; qty: number }>>(
    (acc, order) => {
      for (const oi of order.orderItems) {
        const id = oi.menuId;
        const name = oi.menu?.name ?? "Unknown";
        if (!acc[id]) acc[id] = { name, qty: 0 };
        acc[id].qty += oi.quantity;
      }
      return acc;
    },
    {}
  );

  const handleApplyFilters = () => {
    setAppliedCustomer(customerInput);
    setLoading(true);
  };

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-roast-red" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Orders"
        description="Search, filter, update status, and prep your make list."
        actions={
          <Button variant="outline" size="sm" onClick={fetchOrders}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <div className="flex flex-col gap-4 rounded-2xl border border-charcoal/10 bg-white p-4 shadow-card sm:flex-row">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="flex-1 min-w-0">
            <label className="text-xs font-medium text-charcoal/70 mb-1 block">
              Date range
            </label>
            <Select
              value={dateFilter ?? "today"}
              onValueChange={(v) => {
                setDateFilter(v as GetOrdersParams["date"]);
                setLoading(true);
              }}
            >
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-0">
            <label className="text-xs font-medium text-charcoal/70 mb-1 block">
              Filter by item
            </label>
            <Select
              value={itemFilter}
              onValueChange={(v) => {
                setItemFilter(v);
                setLoading(true);
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All items" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All items</SelectItem>
                {menuItems.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-0">
            <label className="text-xs font-medium text-charcoal/70 mb-1 block">
              Filter by customer
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal/50" />
              <Input
                placeholder="Name or phone..."
                value={customerInput}
                onChange={(e) => setCustomerInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
                className="pl-9 w-full sm:w-[200px]"
              />
            </div>
          </div>
        </div>
        <div className="flex items-end gap-2">
          {itemFilter && itemFilter !== "all" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setItemFilter("all");
                setLoading(true);
              }}
            >
              Clear item
            </Button>
          )}
          {appliedCustomer && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCustomerInput("");
                setAppliedCustomer("");
                setLoading(true);
              }}
            >
              Clear
            </Button>
          )}
          <Button onClick={handleApplyFilters} size="sm">
            Apply filters
          </Button>
        </div>
      </div>

      {Object.keys(makeList).length > 0 && (
        <div className="rounded-xl border border-charcoal/10 bg-amber-50/50 p-4">
          <h3 className="font-semibold text-charcoal flex items-center gap-2 mb-3">
            <UtensilsCrossed className="h-4 w-4 text-roast-red" />
            Make list — total quantities
          </h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(makeList).map(([id, { name, qty }]) => (
              <div
                key={id}
                className="rounded-lg bg-white px-4 py-2 border border-charcoal/10"
              >
                <span className="font-medium text-charcoal">{name}</span>
                <span className="ml-2 font-bold text-roast-red">{qty}x</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {token && (
        <OrderTable orders={orders} token={token} onUpdate={fetchOrders} />
      )}
    </div>
  );
}
