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
import { getOrders, getTodayOrderCount } from "@/services/orders.service";
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
  const [orderCount, setOrderCount] = useState(0);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
    if (!t) {
      router.replace("/admin/login");
      return;
    }
    setToken(t);
    Promise.all([
      getOrders(t, { date: "today" }),
      getSettings(t),
      getTodayOrderCount(),
    ])
      .then(([o, s, c]) => {
        setOrders(o);
        setSettings(s);
        setOrderCount(c);
      })
      .catch(() => router.replace("/admin/login"))
      .finally(() => setLoading(false));
  }, [router]);

  const refresh = async () => {
    if (!token) return;
    const [o, s, c] = await Promise.all([
      getOrders(token, { date: "today" }),
      getSettings(token),
      getTodayOrderCount(),
    ]);
    setOrders(o);
    setSettings(s);
    setOrderCount(c);
  };

  if (loading) {
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
        description="Today’s orders, capacity, and storefront controls."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/orders">View all orders</Link>
          </Button>
        }
      />

      <DashboardStats
        orderCount={orderCount}
        maxOrders={settings.maxOrdersPerDay}
        orderingEnabled={settings.orderingEnabled}
      />

      <SettingsCard
        token={token!}
        maxOrdersPerDay={settings.maxOrdersPerDay}
        orderingEnabled={settings.orderingEnabled}
        onUpdate={refresh}
      />

      <div>
        <h2 className="text-lg font-semibold tracking-tight text-charcoal">
          Recent orders
        </h2>
        <p className="mt-1 text-sm text-charcoal/65">
          Latest activity for today (same filters as the orders page).
        </p>
      </div>

      <OrderTable orders={orders} token={token!} onUpdate={refresh} />
    </div>
  );
}
