"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { getOrders, updateOrderStatus } from "@/services/orders.service";
import { useOrdersSocket } from "@/hooks/use-orders-socket";
import type { Order } from "@/types/order";
import {
  BOARD_COLUMNS,
  advanceLabel,
  isTerminal,
  nextOrderStatus,
} from "@/lib/order-workflow";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import { formatRM, toAmount } from "@/lib/money";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Truck,
  Store,
  Wifi,
  WifiOff,
  ArrowRight,
  X,
  Volume2,
  VolumeX,
} from "lucide-react";

function orderTotal(o: Order): number {
  if (o.total != null) return toAmount(o.total);
  return o.orderItems.reduce(
    (sum, i) => sum + toAmount(i.unitPrice) * i.quantity,
    0
  );
}

function playBeep() {
  if (typeof window === "undefined") return;
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.42);
    osc.onended = () => ctx.close();
  } catch {
    /* audio not available */
  }
}

export default function AdminBoardPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;

  const load = useCallback(async () => {
    const t = localStorage.getItem("admin_token");
    if (!t) {
      router.replace("/admin/login");
      return;
    }
    setToken(t);
    try {
      const o = await getOrders(t, { date: "today" });
      setOrders(o.filter((x) => !isTerminal(x.status)));
    } catch {
      router.replace("/admin/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
    const id = setInterval(load, 20_000); // polling fallback
    return () => clearInterval(id);
  }, [load]);

  const upsert = useCallback((order: Order) => {
    setOrders((prev) => {
      const without = prev.filter((o) => o.id !== order.id);
      return isTerminal(order.status) ? without : [order, ...without];
    });
  }, []);

  const { connected } = useOrdersSocket({
    onCreated: (order) => {
      upsert(order);
      if (soundRef.current) playBeep();
      toast.success("New order", {
        description: `${order.customerName} · ${order.slugId ?? ""}`,
      });
    },
    onUpdated: upsert,
  });

  const advance = async (order: Order) => {
    if (!token) return;
    const next = nextOrderStatus(order.type, order.status);
    if (!next) return;
    // Optimistic.
    setOrders((prev) =>
      isTerminal(next)
        ? prev.filter((o) => o.id !== order.id)
        : prev.map((o) => (o.id === order.id ? { ...o, status: next } : o))
    );
    try {
      await updateOrderStatus(order.id, next, token);
    } catch (err) {
      toast.error("Could not update", {
        description: err instanceof Error ? err.message : "Try again",
      });
      void load();
    }
  };

  const cancel = async (order: Order) => {
    if (!token) return;
    setOrders((prev) => prev.filter((o) => o.id !== order.id));
    try {
      await updateOrderStatus(order.id, "CANCELLED", token);
    } catch (err) {
      toast.error("Could not cancel", {
        description: err instanceof Error ? err.message : "Try again",
      });
      void load();
    }
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
        title="Live board"
        description="Active orders update in real time. Tap to advance through the kitchen flow."
        actions={
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
                connected
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-charcoal/10 text-charcoal/60"
              )}
            >
              {connected ? (
                <Wifi className="h-3.5 w-3.5" />
              ) : (
                <WifiOff className="h-3.5 w-3.5" />
              )}
              {connected ? "Live" : "Reconnecting"}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSoundOn((s) => !s)}
              aria-label={soundOn ? "Mute new-order sound" : "Unmute"}
            >
              {soundOn ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {BOARD_COLUMNS.map((col) => {
          const cards = orders
            .filter((o) => col.statuses.includes(o.status))
            .sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime()
            );
          return (
            <div
              key={col.key}
              className="flex min-h-[8rem] flex-col rounded-2xl border border-charcoal/10 bg-charcoal/[0.03] p-3"
            >
              <div className="mb-3 flex items-center justify-between px-1">
                <h2 className="font-display text-sm font-bold uppercase tracking-wide text-charcoal/70">
                  {col.title}
                </h2>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-charcoal/60 shadow-sm">
                  {cards.length}
                </span>
              </div>
              <div className="space-y-3">
                {cards.map((order) => (
                  <BoardCard
                    key={order.id}
                    order={order}
                    onAdvance={() => advance(order)}
                    onCancel={() => cancel(order)}
                  />
                ))}
                {cards.length === 0 ? (
                  <p className="px-1 py-6 text-center text-xs text-charcoal/35">
                    Nothing here
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BoardCard({
  order,
  onAdvance,
  onCancel,
}: {
  order: Order;
  onAdvance: () => void;
  onCancel: () => void;
}) {
  const label = advanceLabel(order.type, order.status);
  const next = nextOrderStatus(order.type, order.status);
  const time = new Date(order.createdAt).toLocaleTimeString("en-MY", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="rounded-xl border border-charcoal/10 bg-white p-3 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display font-semibold leading-snug text-charcoal">
            {order.customerName}
          </p>
          <p className="text-xs text-charcoal/55">
            {order.slugId ?? order.id.slice(0, 6)} · {time}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
            order.type === "DELIVERY"
              ? "bg-roast-red/10 text-roast-red"
              : "bg-mustard/20 text-burnt-brown"
          )}
        >
          {order.type === "DELIVERY" ? (
            <Truck className="h-3 w-3" />
          ) : (
            <Store className="h-3 w-3" />
          )}
          {order.type === "DELIVERY" ? "Delivery" : "Pickup"}
        </span>
      </div>

      <ul className="mt-2 space-y-0.5 text-sm text-charcoal/75">
        {order.orderItems.map((i) => (
          <li key={i.id} className="flex gap-1.5">
            <span className="font-semibold text-charcoal">{i.quantity}×</span>
            <span className="min-w-0 truncate">
              {i.menu?.name ?? "Item"}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-2 flex items-center justify-between">
        <span className="font-bold text-roast-red">{formatRM(orderTotal(order))}</span>
        <span className="text-xs text-charcoal/45">
          {ORDER_STATUS_LABELS[order.status] ?? order.status}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        {next && label ? (
          <Button size="sm" className="flex-1 gap-1.5 font-display" onClick={onAdvance}>
            {label}
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : null}
        <Button
          size="icon"
          variant="ghost"
          className="h-9 w-9 shrink-0 text-charcoal/50 hover:bg-red-50 hover:text-red-600"
          onClick={onCancel}
          aria-label="Cancel order"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
