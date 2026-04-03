"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardStats } from "@/components/admin/dashboard-stats";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { DashboardKpiCards } from "@/components/admin/dashboard/dashboard-kpi-cards";
import { DashboardRevenueChart } from "@/components/admin/dashboard/dashboard-revenue-chart";
import { DashboardBusinessStats } from "@/components/admin/dashboard/dashboard-business-stats";
import { DashboardRecentActivity } from "@/components/admin/dashboard/dashboard-recent-activity";
import { DashboardTopItems } from "@/components/admin/dashboard/dashboard-top-items";
import { getOrders, getCanOrder } from "@/services/orders.service";
import { formatBatchLabel } from "@/lib/batch-display";
import {
  countByStatus,
  orderTotal,
  uniqueCustomers,
  type DateRangeFilter,
} from "@/lib/dashboard-metrics";
import type { Order } from "@/types/order";
import { Bell, Loader2, Settings } from "lucide-react";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [dateRange, setDateRange] = useState<DateRangeFilter>("week");
  const [batchCtx, setBatchCtx] = useState<Awaited<
    ReturnType<typeof getCanOrder>
  > | null>(null);

  useEffect(() => {
    const t =
      typeof window !== "undefined"
        ? localStorage.getItem("admin_token")
        : null;
    if (!t) {
      router.replace("/admin/login");
      return;
    }
    setLoading(true);
    Promise.all([getCanOrder(), getOrders(t, { date: dateRange })])
      .then(([co, o]) => {
        setBatchCtx(co);
        setOrders(o);
      })
      .catch(() => router.replace("/admin/login"))
      .finally(() => setLoading(false));
  }, [router, dateRange]);

  const totalRevenue = orders.reduce((s, o) => s + orderTotal(o), 0);

  if (loading || !batchCtx) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-roast-red" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Dashboard"
        description="Welcome back! Here's your kitchen at a glance."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="font-display" asChild>
              <Link href="/admin/orders">View all orders</Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-charcoal/70 hover:text-charcoal"
              asChild
              aria-label="Orders — notifications"
            >
              <Link href="/admin/orders">
                <Bell className="h-5 w-5" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-charcoal/70 hover:text-charcoal"
              asChild
              aria-label="Settings"
            >
              <Link href="/admin/settings">
                <Settings className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        }
      />

      <DashboardKpiCards
        pending={countByStatus(orders, "RECEIVED")}
        preparing={countByStatus(orders, "PREPARING")}
        capacityCurrent={batchCtx.current}
        capacityMax={batchCtx.max}
      />

      <div className="grid gap-6 lg:grid-cols-3 lg:items-stretch">
        <div className="lg:col-span-2">
          <DashboardRevenueChart
            orders={orders}
            range={dateRange}
            onRangeChange={setDateRange}
          />
        </div>
        <div className="lg:col-span-1">
          <DashboardBusinessStats
            uniqueCustomers={uniqueCustomers(orders)}
            orderCount={orders.length}
            totalRevenue={totalRevenue}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <DashboardRecentActivity orders={orders} />
        <DashboardTopItems orders={orders} range={dateRange} />
      </div>

      <DashboardStats
        current={batchCtx.current}
        max={batchCtx.max}
        canOrder={batchCtx.canOrder}
        batchLabel={formatBatchLabel(batchCtx)}
      />
    </div>
  );
}
