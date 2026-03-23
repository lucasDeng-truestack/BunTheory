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
import { getDraftMenu } from "@/services/menu.service";
import { listBatches, type OrderBatchListItem } from "@/services/batches.service";
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
  const [dateFilter, setDateFilter] = useState<GetOrdersParams["date"]>("week");
  const [batchFilter, setBatchFilter] = useState<string>("all");
  const [batches, setBatches] = useState<OrderBatchListItem[]>([]);
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
      const params: GetOrdersParams = {};
      if (batchFilter !== "all") {
        params.batchId = batchFilter;
      } else {
        params.date = dateFilter ?? "week";
      }
      if (appliedCustomer.trim()) params.customer = appliedCustomer.trim();
      if (itemFilter && itemFilter !== "all") params.menuId = itemFilter;
      const [o, menu, batchList] = await Promise.all([
        getOrders(t, params),
        getDraftMenu(false, t),
        listBatches(t),
      ]);
      setOrders(o);
      setMenuItems(menu);
      setBatches(batchList);
    } catch {
      router.replace("/admin/login");
    } finally {
      setLoading(false);
    }
  }, [router, dateFilter, batchFilter, appliedCustomer, itemFilter]);

  useEffect(() => {
    setLoading(true);
    void fetchOrders();
  }, [fetchOrders]);

  const makeList = orders.reduce<Record<string, { name: string; qty: number }>>(
    (acc, order) => {
      for (const oi of order.orderItems) {
        const id = oi.menuSnapshotItemId ?? oi.menuId ?? oi.id;
        const name =
          oi.menuSnapshotItem?.name ?? oi.menu?.name ?? "Unknown";
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
        description="Search, filter by batch or date, update status, and prep your make list."
        actions={
          <Button variant="outline" size="sm" onClick={fetchOrders}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <div className="flex flex-col gap-4 rounded-2xl border border-charcoal/10 bg-white p-4 shadow-card sm:flex-row">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="min-w-0 flex-1">
            <label className="mb-1 block text-sm font-medium text-charcoal/70">
              Batch
            </label>
            <Select
              value={batchFilter}
              onValueChange={(v) => {
                setBatchFilter(v);
                setLoading(true);
              }}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All batches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All batches (use date range)</SelectItem>
                {batches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.label?.trim() ||
                      new Date(b.fulfillmentDate).toLocaleDateString()}{" "}
                    ({b.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0 flex-1">
            <label className="mb-1 block text-sm font-medium text-charcoal/70">
              Date range
            </label>
            <Select
              value={dateFilter ?? "week"}
              disabled={batchFilter !== "all"}
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
          <div className="min-w-0 flex-1">
            <label className="mb-1 block text-sm font-medium text-charcoal/70">
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
          <div className="min-w-0 flex-1">
            <label className="mb-1 block text-sm font-medium text-charcoal/70">
              Filter by customer
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/50" />
              <Input
                placeholder="Name or phone..."
                value={customerInput}
                onChange={(e) => setCustomerInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
                className="w-full pl-9 sm:w-[200px]"
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
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-charcoal">
            <UtensilsCrossed className="h-4 w-4 text-roast-red" />
            Make list — total quantities
          </h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(makeList).map(([id, { name, qty }]) => (
              <div
                key={id}
                className="rounded-lg border border-charcoal/10 bg-white px-4 py-2"
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
