"use client";

import { useCallback, useEffect, useState } from "react";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import { useHydrated } from "@/hooks/use-hydrated";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { OrderStatusDisplay } from "@/components/order/order-status";
import { trackOrdersByPhone } from "@/services/orders.service";
import type { Order } from "@/types/order";
import { Loader2, PackageSearch, RefreshCw } from "lucide-react";
import { toast } from "sonner";

/** How often to refetch order status while this page is open (ms). */
const POLL_MS = 10_000;

export function TrackOrderView() {
  const hydrated = useHydrated();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  /** Phone used for live polling (set on successful submit only). */
  const [activePhone, setActivePhone] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchOrders = useCallback(
    async (forPhone: string, opts: { silent?: boolean } = {}) => {
      const silent = opts.silent ?? false;
      if (!forPhone || !isValidPhoneNumber(forPhone)) return;
      if (silent) setIsRefreshing(true);
      else setLoading(true);
      try {
        const list = await trackOrdersByPhone(forPhone);
        setOrders(list);
        setLastUpdated(new Date());
        if (!silent) {
          setHasSearched(true);
          setActivePhone(forPhone);
          if (list.length === 0) {
            toast.message("No active orders", {
              description:
                "We only show orders still in progress (not completed). Use the same phone you used when ordering.",
            });
          }
        }
      } catch (err) {
        if (!silent) {
          const msg = err instanceof Error ? err.message : "Something went wrong";
          toast.error("Could not load orders", { description: msg });
        }
      } finally {
        if (silent) setIsRefreshing(false);
        else setLoading(false);
      }
    },
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !isValidPhoneNumber(phone)) {
      toast.error("Invalid phone", {
        description: "Enter your number with country code (same as checkout).",
      });
      return;
    }
    await fetchOrders(phone, { silent: false });
  };

  useEffect(() => {
    if (!activePhone) return;

    const run = () => {
      void fetchOrders(activePhone, { silent: true });
    };

    const id = setInterval(run, POLL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        run();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [activePhone, fetchOrders]);

  const formatWhen = (createdAt: string) => {
    const d = new Date(createdAt);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatLastUpdated = () => {
    if (!lastUpdated) return null;
    return lastUpdated.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatItems = (order: Order) =>
    order.orderItems
      .map((oi) => {
        const name =
          oi.menuSnapshotItem?.name ?? oi.menu?.name ?? "Item";
        return `${oi.quantity}× ${name}`;
      })
      .join(" · ");

  if (!hydrated) {
    return (
      <div className="space-y-4" aria-busy>
        <div className="h-12 w-full rounded-xl bg-charcoal/5 animate-pulse" />
        <div className="h-12 w-full rounded-xl bg-charcoal/10 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="track-phone">Phone number</Label>
          <PhoneInput
            id="track-phone"
            international
            defaultCountry="MY"
            limitMaxLength
            placeholder="Same number you used at checkout"
            value={phone || undefined}
            onChange={(value) => setPhone(value ?? "")}
            className="order-form-phone"
            aria-invalid={Boolean(phone && !isValidPhoneNumber(phone))}
            numberInputProps={{ autoComplete: "tel" }}
          />
          <p className="text-caption">
            We match orders from the last 7 days that are still being prepared.
            Completed orders are not shown here. After you search, status
            refreshes about every {POLL_MS / 1000} seconds while you keep this tab
            open.
          </p>
        </div>
        <Button type="submit" size="lg" className="w-full min-h-12" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Looking up…
            </>
          ) : (
            <>
              <PackageSearch className="mr-2 h-5 w-5" />
              Find my orders
            </>
          )}
        </Button>
      </form>

      {activePhone && (
        <p
          className="text-caption flex flex-wrap items-center gap-2"
          aria-live="polite"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 shrink-0 ${isRefreshing ? "animate-spin text-roast-red" : ""}`}
            aria-hidden
          />
          <span>
            Live updates on · auto-refresh every {POLL_MS / 1000}s
            {formatLastUpdated() ? (
              <>
                {" "}
                · Last sync {formatLastUpdated()}
              </>
            ) : null}
          </span>
        </p>
      )}

      {hasSearched && orders.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight text-charcoal">
            Active orders
          </h2>
          <ul className="space-y-4">
            {orders.map((order) => (
              <li key={order.id}>
                <Card className="shadow-card">
                  <CardContent className="space-y-4 p-5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-mono text-base font-medium text-charcoal">
                        {order.slugId ? `#${order.slugId}` : order.id.slice(0, 8)}
                      </p>
                      <span className="text-sm text-charcoal/50">
                        {formatWhen(order.createdAt)}
                      </span>
                    </div>
                    <p className="text-base text-charcoal/70">
                      {order.customerName} ·{" "}
                      <span className="capitalize">{order.type.toLowerCase()}</span>
                    </p>
                    <p className="text-base font-medium text-charcoal">{formatItems(order)}</p>
                    <OrderStatusDisplay status={order.status} />
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasSearched && orders.length === 0 && !loading && (
        <div className="rounded-2xl border border-charcoal/10 bg-white p-6 text-center text-charcoal/70 shadow-card">
          <p className="font-medium text-charcoal">No active orders for this number</p>
          <p className="mt-2 text-base">
            If your order is already completed, it won&apos;t appear here. Check WhatsApp
            for your confirmation.
          </p>
          {lastUpdated && (
            <p className="text-fine-print mt-3">
              Last checked {formatLastUpdated()} — we&apos;ll keep checking while this page
              is open in case a new order appears.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
