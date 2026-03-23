"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardStats } from "@/components/admin/dashboard-stats";
import { SettingsCard } from "@/components/admin/settings-card";
import { OrderTable } from "@/components/admin/order-table";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { getSettings } from "@/services/admin.service";
import { getOrders, getCanOrder } from "@/services/orders.service";
import { formatBatchLabel } from "@/lib/batch-display";
import type { Order } from "@/types/order";
import { Loader2 } from "lucide-react";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState({
    maxOrdersPerDay: 15,
    orderingEnabled: true,
  });
  const [batchCtx, setBatchCtx] = useState<Awaited<
    ReturnType<typeof getCanOrder>
  > | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
    if (!t) {
      router.replace("/admin/login");
      return;
    }
    setToken(t);
    Promise.all([getCanOrder(), getSettings(t)])
      .then(async ([co, s]) => {
        setBatchCtx(co);
        setSettings(s);
        const o = await getOrders(t, co.batchId ? { batchId: co.batchId } : { date: "week" });
        setOrders(o);
      })
      .catch(() => router.replace("/admin/login"))
      .finally(() => setLoading(false));
  }, [router]);

  const refresh = async () => {
    if (!token) return;
    const [co, s] = await Promise.all([getCanOrder(), getSettings(token)]);
    setBatchCtx(co);
    setSettings(s);
    const o = await getOrders(token, co.batchId ? { batchId: co.batchId } : { date: "week" });
    setOrders(o);
  };

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
        description="Current batch capacity, emergency controls, and recent orders."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/batches">Manage batches</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/orders">View all orders</Link>
            </Button>
          </div>
        }
      />

      <DashboardStats
        current={batchCtx.current}
        max={batchCtx.max}
        canOrder={batchCtx.canOrder}
        batchLabel={formatBatchLabel(batchCtx)}
      />

      <SettingsCard
        token={token!}
        orderingEnabled={settings.orderingEnabled}
        onUpdate={refresh}
      />

      <div>
        <h2 className="text-lg font-semibold tracking-tight text-charcoal">
          Recent orders
        </h2>
        <p className="mt-1 text-sm text-charcoal/65">
          {batchCtx.batchId
            ? "Orders for the selected active batch (or last week if none)."
            : "Latest orders from the last 7 days."}
        </p>
      </div>

      <OrderTable orders={orders} token={token!} onUpdate={refresh} />
    </div>
  );
}
