"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bike, Loader, Store, Volume2, VolumeX, Wifi, WifiOff, X } from "lucide-react";
import { listOrders, ordersPendingCount, type Order, type OrderStatus } from "@/lib/bun-theory-api";
import {
  advanceLabel,
  BOARD_COLUMNS,
  expectedTotalCents,
  formatOrderClock,
  isTerminal,
  nextOrderStatus,
  orderRef,
} from "@/lib/bun-theory";
import { formatRM } from "@/lib/admin";
import { useOrdersSocket, type SocketState } from "@/lib/use-orders-socket";
import { klToday, klYmd } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { Banner, Skeleton } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useAdmin } from "@/components/admin/admin-context";
import { AdminPage, LoadError } from "@/components/admin/admin-page";
import { useAdminQuery } from "@/components/admin/use-admin-query";
import { LineExtras, OrderStatusChip, useOrderStatus } from "@/components/admin/bun-theory/order-parts";

/** Polling fallback, as the old board: the socket is the fast path, this catches anything it missed. */
const POLL_MS = 20_000;
/** How long a socket or local change wins over a list that was fetched before it. */
const TOUCH_MS = 30_000;
/** How long a new card keeps its ember outline. */
const FRESH_MS = 10_000;

type Touch = { order: Order; at: number };

/**
 * The kitchen board: today's active orders in four columns, live over the socket, with a beep on
 * each new order. Cards move one step per tap; cancel asks first.
 */
export function LiveBoardScreen() {
  const { token, run, refreshOrdersPending } = useAdmin();
  const list = useAdminQuery((t) => listOrders(t, { date: "today" }), []);
  const { reload } = list;
  const status = useOrderStatus();
  const chime = useChime();
  const [soundOn, setSoundOn] = useState(true);
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;

  // Orders changed by the socket or by a tap, newer than the list on screen. They win over the
  // list until they expire, so a poll that left before the change cannot move a card back.
  const [touched, setTouched] = useState<Record<string, Touch>>({});
  const touch = useCallback((order: Order) => {
    setTouched((cur) => ({ ...cur, [order.id]: { order, at: Date.now() } }));
  }, []);
  const untouch = (id: string) =>
    setTouched((cur) => {
      const { [id]: _gone, ...rest } = cur;
      return rest;
    });

  const [fresh, setFresh] = useState<Record<string, number>>({});
  const [latest, setLatest] = useState<Order | null>(null);
  const [cancelling, setCancelling] = useState<Order | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => {
      void reload();
      const now = Date.now();
      setTouched((cur) => {
        const keep = Object.entries(cur).filter(([, t]) => now - t.at < TOUCH_MS);
        return keep.length === Object.keys(cur).length ? cur : Object.fromEntries(keep);
      });
      setFresh((cur) => {
        const keep = Object.entries(cur).filter(([, at]) => now - at < FRESH_MS);
        return keep.length === Object.keys(cur).length ? cur : Object.fromEntries(keep);
      });
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [reload]);

  const connectedOnce = useRef(false);
  const socket = useOrdersSocket(token, {
    onCreated: (order) => {
      touch(order);
      setFresh((cur) => ({ ...cur, [order.id]: Date.now() }));
      setLatest(order);
      if (soundRef.current) chime.play();
      refreshOrdersPending();
    },
    onUpdated: (order) => {
      touch(order);
      refreshOrdersPending();
    },
    onConnect: () => {
      // The first connect follows the first load closely; refetch anyway to cover the gap.
      // After a drop, events may have been missed: forget local overrides and take the server's list.
      if (connectedOnce.current) setTouched({});
      connectedOnce.current = true;
      void reload();
      refreshOrdersPending();
    },
    // A refusal with a dead session must still log out: any call through run() does that.
    onRefused: () => void run(ordersPendingCount).catch(() => {}),
  });

  const merged = new Map((list.data ?? []).map((o) => [o.id, o]));
  // An event for an older order (moved back on the Orders screen) must not land on today's board.
  const today = klToday();
  for (const t of Object.values(touched)) {
    if (merged.has(t.order.id) || klYmd(t.order.createdAt) === today) merged.set(t.order.id, t.order);
  }
  const active = [...merged.values()].filter((o) => !isTerminal(o.status));

  const move = async (order: Order, next: OrderStatus) => {
    touch({ ...order, status: next });
    const updated = await status.change(order, next);
    if (updated) touch(updated);
    else {
      untouch(order.id);
      void reload();
    }
  };

  const advance = (order: Order) => {
    const next = nextOrderStatus(order.type, order.status);
    if (next) void move(order, next);
  };

  return (
    <AdminPage
      title="Live board"
      lead="Today's active orders, live. Tap a card's button to move it to the next step."
      actions={
        <>
          <ConnectionPill state={socket.state} onRetry={socket.retry} />
          <Button
            size="sm"
            variant="ghost"
            aria-pressed={soundOn}
            onClick={() => {
              chime.unlock();
              setSoundOn((s) => !s);
            }}
          >
            <span className="inline-flex items-center gap-2">
              {soundOn ? (
                <Volume2 aria-hidden size={16} strokeWidth={1.75} />
              ) : (
                <VolumeX aria-hidden size={16} strokeWidth={1.75} />
              )}
              {soundOn ? "Sound on" : "Sound off"}
            </span>
          </Button>
        </>
      }
    >
      {soundOn && chime.blocked && (
        <p className="type-admin-body m-0 text-cream-muted">Tap anywhere on the page so the browser lets the new-order sound play.</p>
      )}

      {latest && !isTerminal(merged.get(latest.id)?.status ?? latest.status) && (
        <Banner tone="ok" title={`New order from ${latest.customerName}`}>
          {orderRef(latest)} · {formatOrderClock(latest.createdAt)} · {latest.type === "DELIVERY" ? "Delivery" : "Pickup"}
        </Banner>
      )}

      {status.notice?.tone === "error" && (
        <Banner tone="error" title={status.notice.title}>
          {status.notice.help}
        </Banner>
      )}

      {list.data === undefined ? (
        list.error ? (
          <LoadError onRetry={list.reload} />
        ) : (
          <BoardSkeleton />
        )
      ) : (
        <>
          {list.error ? <LoadError onRetry={list.reload} /> : null}
          <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {BOARD_COLUMNS.map((col) => {
              const cards = active
                .filter((o) => col.statuses.includes(o.status))
                .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
              const headingId = `board-${col.key}`;
              return (
                <section
                  key={col.key}
                  aria-labelledby={headingId}
                  className="grid content-start gap-3 rounded-card-sm border border-ink-line p-3"
                >
                  <h2 id={headingId} className="type-admin-meta m-0 flex items-center justify-between gap-2 px-1 text-cream-faint">
                    {col.title}
                    <span className="min-w-6 rounded-full border border-cream-faint px-2 text-center text-xs font-bold leading-5 text-cream">
                      {cards.length}
                      <span className="sr-only"> orders</span>
                    </span>
                  </h2>
                  {cards.length ? (
                    <ul className="m-0 grid list-none gap-3 p-0">
                      {cards.map((order) => (
                        <BoardCard
                          key={order.id}
                          order={order}
                          fresh={!!fresh[order.id]}
                          saving={status.savingId === order.id}
                          onAdvance={() => advance(order)}
                          onCancel={() => setCancelling(order)}
                        />
                      ))}
                    </ul>
                  ) : (
                    <p className="m-0 px-1 py-6 text-center text-sm text-cream-faint">Nothing here</p>
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}

      <Dialog
        open={!!cancelling}
        onClose={() => setCancelling(null)}
        title="Cancel this order?"
        description={
          cancelling
            ? `${cancelling.customerName}, order ${orderRef(cancelling)}. It leaves the board. You can still find it under Orders.`
            : undefined
        }
        confirmLabel="Yes, cancel it"
        cancelLabel="Keep the order"
        onConfirm={() => {
          const order = cancelling;
          setCancelling(null);
          if (order) void move(order, "CANCELLED");
        }}
      />
    </AdminPage>
  );
}

function BoardCard({
  order,
  fresh,
  saving,
  onAdvance,
  onCancel,
}: {
  order: Order;
  fresh: boolean;
  saving: boolean;
  onAdvance: () => void;
  onCancel: () => void;
}) {
  const label = advanceLabel(order.type, order.status);
  const ref = orderRef(order);
  const delivery = order.type === "DELIVERY";
  return (
    <li
      className={cn(
        "grid gap-3 rounded-card-sm bg-ink-raised p-3",
        fresh && "shadow-[inset_0_0_0_2px_theme(colors.ember.DEFAULT)]",
      )}
    >
      <div className="grid min-w-0 gap-0.5">
        <b className="text-base [overflow-wrap:anywhere]">
          {order.customerName}
          {fresh && <span className="type-admin-meta ml-2 align-middle text-ember">Just in</span>}
        </b>
        <span className="text-[13px] text-cream-muted">
          <Link
            href={`/admin/bun-theory/orders/${order.id}`}
            className="whitespace-nowrap font-bold tracking-[0.04em] text-cream-muted underline-offset-2 hover:text-cream hover:underline"
          >
            {ref}
          </Link>{" "}
          · <span className="whitespace-nowrap">{formatOrderClock(order.createdAt)}</span>
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <OrderStatusChip status={order.status} />
        <span className="type-admin-meta inline-flex h-7 items-center gap-1.5 rounded-full border border-cream-faint px-2.5 leading-none text-cream">
          {delivery ? (
            <Bike aria-hidden size={14} strokeWidth={1.75} />
          ) : (
            <Store aria-hidden size={14} strokeWidth={1.75} />
          )}
          {delivery ? "Delivery" : "Pickup"}
        </span>
      </div>

      <ul className="m-0 grid list-none gap-1.5 p-0 text-sm">
        {order.orderItems.map((oi) => (
          <li key={oi.id}>
            <span className="font-semibold [overflow-wrap:anywhere]">
              <span className="text-ember">{oi.quantity}×</span> {oi.menu?.name ?? "Item"}
            </span>
            <LineExtras oi={oi} className="mt-0.5" />
          </li>
        ))}
      </ul>

      <p className="m-0 flex items-baseline justify-between gap-2 border-t border-ink-line pt-2.5 text-sm">
        <span className="text-cream-muted">Total</span>
        <b className="tabular-nums">{formatRM(expectedTotalCents(order))}</b>
      </p>

      <div className="flex items-center gap-2">
        {label && (
          <Button
            size="sm"
            variant="cream"
            className="min-w-0 flex-1"
            onClick={onAdvance}
            disabled={saving}
            loading={saving}
            aria-label={`${label}: order ${ref}`}
          >
            {label}
          </Button>
        )}
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          aria-label={`Cancel order ${ref}`}
          className="grid h-11 w-11 flex-none place-items-center rounded-full border border-cream-faint text-cream-muted transition-colors hover:border-cream hover:text-cream disabled:cursor-not-allowed disabled:border-ink-line disabled:text-cream-faint"
        >
          <X aria-hidden size={16} strokeWidth={1.75} />
        </button>
      </div>
    </li>
  );
}

const PILL: Record<Exclude<SocketState, "refused">, { label: string; live: boolean }> = {
  live: { label: "Live", live: true },
  connecting: { label: "Connecting", live: false },
  reconnecting: { label: "Reconnecting", live: false },
};

/** Connection state, by icon and word as well as colour. Refused needs a Retry: socket.io will not retry it. */
function ConnectionPill({ state, onRetry }: { state: SocketState; onRetry: () => void }) {
  if (state === "refused") {
    return (
      <span className="inline-flex items-center gap-2">
        <span role="status" className="type-admin-meta inline-flex h-11 items-center gap-2 rounded-full border-[1.5px] border-dashed border-cream-faint px-4 text-cream-muted">
          <WifiOff aria-hidden size={16} strokeWidth={1.75} />
          Live updates off
        </span>
        <Button size="sm" variant="cream" onClick={onRetry}>
          Retry
        </Button>
      </span>
    );
  }
  const { label, live } = PILL[state];
  return (
    <span
      role="status"
      className={cn(
        "type-admin-meta inline-flex h-11 items-center gap-2 rounded-full px-4",
        live ? "bg-ember text-ink" : "border-[1.5px] border-dashed border-cream-faint text-cream-muted",
      )}
    >
      {live ? (
        <Wifi aria-hidden size={16} strokeWidth={1.75} />
      ) : state === "connecting" ? (
        <Loader aria-hidden size={16} strokeWidth={1.75} className="animate-spin motion-reduce:animate-none" />
      ) : (
        <WifiOff aria-hidden size={16} strokeWidth={1.75} />
      )}
      {label}
    </span>
  );
}

type WithWebkit = Window & { webkitAudioContext?: typeof AudioContext };

/**
 * The new-order beep (the old board's 880Hz sine). Browsers block audio until the page has had a
 * tap or key press, so one context is made on the first gesture (or the sound button) and reused.
 * `blocked` says the browser has not allowed it yet.
 */
function useChime() {
  const ctx = useRef<AudioContext | null>(null);
  const [blocked, setBlocked] = useState(false);

  const unlock = useCallback(() => {
    try {
      if (!ctx.current) {
        const C = window.AudioContext || (window as WithWebkit).webkitAudioContext;
        if (!C) return null;
        ctx.current = new C();
      }
      if (ctx.current.state === "suspended") void ctx.current.resume().then(() => setBlocked(false), () => {});
      else setBlocked(false);
      return ctx.current;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    // A page reached by in-app navigation already has a gesture; a fresh load does not.
    const active = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive;
    if (active) unlock();
    else setBlocked(true);
    const onGesture = () => {
      unlock();
    };
    window.addEventListener("pointerdown", onGesture);
    window.addEventListener("keydown", onGesture);
    return () => {
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
      void ctx.current?.close().catch(() => {});
      ctx.current = null;
    };
  }, [unlock]);

  const play = useCallback(() => {
    const c = ctx.current;
    if (!c || c.state !== "running") {
      setBlocked(true);
      return;
    }
    try {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain);
      gain.connect(c.destination);
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.001, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.3, c.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4);
      osc.start();
      osc.stop(c.currentTime + 0.42);
    } catch {
      /* audio not available */
    }
  }, []);

  return { play, unlock, blocked };
}

function BoardSkeleton() {
  return (
    <div aria-busy="true" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {BOARD_COLUMNS.map((c) => (
        <Skeleton key={c.key} className="h-64" />
      ))}
    </div>
  );
}
