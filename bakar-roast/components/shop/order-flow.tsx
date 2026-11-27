"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLenis } from "lenis/react";
import { ArrowLeft, Minus, Plus, Store, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Field, SelectField, TextareaField } from "@/components/ui/field";
import { Banner } from "@/components/ui/banner";
import { Container } from "@/components/ui/band";
import { PhotoSlot } from "@/components/ui/photo-slot";
import { Modal } from "@/components/shop/modal";
import { OrderSteps } from "@/components/shop/order-steps";
import { WhenPicker } from "@/components/shop/when-picker";
import { cn } from "@/lib/utils";
import { MY_STATES } from "@/lib/booking";
import { ApiError } from "@/lib/api";
import {
  createShopOrder,
  getShopAvailability,
  type ShopAvailability,
  type ShopConfigPublic,
  type ShopFulfilmentType,
  type ShopPackagePublic,
  type ShopPaymentChoice,
} from "@/lib/shop-api";
import {
  cartIdempotencyKey,
  cartTotal,
  clearDraftAfterOrder,
  depositOf,
  forgetCustomer,
  formatDateLabel,
  formatRm,
  lineTotal,
  loadDraft,
  loadSavedCustomer,
  orderPath,
  packageMap,
  saveCustomer,
  saveDraft,
  type CartItem,
} from "@/lib/shop";

/** Only the fields that hold something, so an empty draft field never wipes a remembered one. */
const filled = <T extends Record<string, string>>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => typeof v === "string" && v.trim() !== "")) as Partial<T>;

const PHONE_RE = /^\+?(?:[\s-]*\d){7,15}[\s-]*$/;

/**
 * The page is a menu first, like a takeaway site: delivery or pickup is asked up front in a modal
 * (with the address, for delivery), then the customer browses the packages freely with their
 * order beside them, and goes to checkout when ready. Two views, no numbered steps.
 */
type View = "menu" | "checkout";

/** The two ways to get the food, as large tap targets. */
function MethodChoice({
  value,
  onChoose,
}: {
  value: ShopFulfilmentType | null;
  onChoose: (t: ShopFulfilmentType) => void;
}) {
  const options = [
    { t: "DELIVERY" as const, label: "Delivery", sub: "Sent to your address. We confirm the delivery fee on WhatsApp.", Icon: Truck },
    { t: "PICKUP" as const, label: "Pickup", sub: "We WhatsApp you the pickup location once your order is confirmed.", Icon: Store },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {options.map(({ t, label, sub, Icon }) => (
        <button
          key={t}
          type="button"
          onClick={() => onChoose(t)}
          aria-pressed={value === t}
          className={cn(
            "grid gap-3 rounded-card-sm border px-5 py-5 text-left transition-colors",
            value === t ? "border-ember bg-ember/10" : "border-cream-faint hover:border-cream",
          )}
        >
          <Icon aria-hidden size={24} strokeWidth={1.5} className="text-ember" />
          <span className="grid gap-1">
            <span className="text-lg font-semibold text-cream">{label}</span>
            <span className="text-[13px] text-cream-muted">{sub}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

/** Add button until there is one in the order, then a minus / count / plus stepper. */
function Quantity({
  name,
  qty,
  onChange,
  small = false,
}: {
  name: string;
  qty: number;
  onChange: (next: number) => void;
  small?: boolean;
}) {
  if (qty === 0) {
    return (
      <Button variant="cream" size="sm" onClick={() => onChange(1)}>
        Add
      </Button>
    );
  }
  const round = cn(
    "grid place-items-center rounded-full border border-cream-faint text-cream hover:border-ember",
    small ? "h-9 w-9" : "h-11 w-11",
  );
  return (
    <div className={cn("flex items-center", small ? "gap-2" : "gap-3")}>
      <button type="button" aria-label={`Remove one ${name}`} onClick={() => onChange(qty - 1)} className={round}>
        <Minus aria-hidden size={small ? 14 : 16} />
      </button>
      <span aria-live="polite" className="min-w-6 text-center font-semibold text-cream">
        {qty}
      </span>
      <button type="button" aria-label={`Add one ${name}`} onClick={() => onChange(qty + 1)} className={round}>
        <Plus aria-hidden size={small ? 14 : 16} />
      </button>
    </div>
  );
}

const linkButton = "min-h-11 font-semibold text-cream underline underline-offset-4 hover:text-ember";

export function OrderFlow({
  config,
  availability,
}: {
  config: ShopConfigPublic;
  availability: ShopAvailability;
}) {
  const router = useRouter();
  const lenis = useLenis();
  const top = useRef<HTMLDivElement>(null);
  const pm = useMemo(() => packageMap(config.packages), [config.packages]);
  const priceOf = (key: string) => pm.get(key)?.price;

  // Availability is live state so a stale-date error can refetch and heal the picker in place.
  const [avail, setAvail] = useState(availability);
  const slotsByDate = useMemo(
    () => new Map(avail.days.map((d) => [d.date, d.slots])),
    [avail.days],
  );
  const slotsFor = (d: string): string[] => slotsByDate.get(d) ?? [];
  const noOpenDays = avail.days.length === 0;

  const [view, setView] = useState<View>("menu");
  const [type, setType] = useState<ShopFulfilmentType>("DELIVERY");
  // Delivery or pickup is asked first, in a modal. The menu can still be browsed without it.
  const [methodChosen, setMethodChosen] = useState(false);
  const [methodOpen, setMethodOpen] = useState(false);
  const [methodStage, setMethodStage] = useState<"method" | "address">("method");
  // Checkout was pressed before the method was settled: carry on once it is.
  const checkoutAfterMethod = useRef(false);
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const [addr, setAddr] = useState({ line1: "", line2: "", city: "", state: "Selangor", postcode: "" });
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [contact, setContact] = useState({ name: "", phone: "", email: "" });
  const [paymentChoice, setPaymentChoice] = useState<ShopPaymentChoice>("DEPOSIT");
  /** Keep name, phone, email and address on this device for the next order. */
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  /** Shown above the menu after a package was dropped from the order. */
  const [menuNotice, setMenuNotice] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  /** Editing a field clears its error at once, so a fixed field never stays flagged red. */
  const clearError = (key: string) =>
    setErrors((e) => {
      if (!(key in e)) return e;
      const { [key]: _gone, ...rest } = e;
      return rest;
    });

  // The whole draft survives a refresh before the order is saved. After the order exists, the
  // token page is the source of truth. Hydrate once, then persist on every change. A saved date
  // or slot that the owner has since closed or changed is dropped, so it never reaches submit.
  useEffect(() => {
    const d = loadDraft();
    // Packages the owner has since hidden or deleted are dropped from a saved order.
    const kept = Array.isArray(d?.cart) ? d.cart.filter((i) => pm.has(i.packageKey)) : null;
    // Details remembered from an earlier order fill the form first; the draft in progress wins.
    const saved = loadSavedCustomer();
    if (saved?.contact) setContact((c) => ({ ...c, ...saved.contact }));
    if (saved?.addr) setAddr((a) => ({ ...a, ...saved.addr }));
    if (d) {
      if (d.type) setType(d.type);
      const draftAddr = d.addr ? filled(d.addr) : null;
      if (draftAddr) setAddr((a) => ({ ...a, ...draftAddr }));
      if (d.deliveryNotes) setDeliveryNotes(d.deliveryNotes);
      if (kept) setCart(kept);
      const slots = d.date ? (slotsByDate.get(d.date) ?? []) : [];
      if (d.date && slots.length > 0) {
        setDate(d.date);
        if (d.slot && slots.includes(d.slot)) setSlot(d.slot);
      }
      const draftContact = d.contact ? filled(d.contact) : null;
      if (draftContact) setContact((c) => ({ ...c, ...draftContact }));
      if (d.paymentChoice) setPaymentChoice(d.paymentChoice);
    }
    if (d?.methodChosen) {
      setMethodChosen(true);
      if (d.step === "checkout" && kept && kept.length > 0) setView("checkout");
    } else {
      setMethodOpen(true);
    }
    setHydrated(true);
    // Runs once on mount; slotsByDate is from the initial availability.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The menu can change under a saved order (the owner hides or deletes a package): drop what
  // is no longer sold, so it is never shown without a price or sent to the server.
  useEffect(() => {
    setCart((c) => (c.every((i) => pm.has(i.packageKey)) ? c : c.filter((i) => pm.has(i.packageKey))));
  }, [pm]);

  useEffect(() => {
    if (!hydrated) return;
    saveDraft({ type, addr, deliveryNotes, cart, date, slot, contact, paymentChoice, methodChosen, step: view });
  }, [hydrated, type, addr, deliveryNotes, cart, date, slot, contact, paymentChoice, methodChosen, view]);

  // Moving between the menu and checkout starts the new view at its top.
  const settled = useRef(false);
  useEffect(() => {
    if (!hydrated) return;
    if (!settled.current) {
      settled.current = true;
      return;
    }
    const el = top.current;
    if (!el) return;
    // force: the view can change while a modal still has page scroll paused.
    if (lenis) lenis.scrollTo(el, { offset: -110, force: true });
    else el.scrollIntoView({ block: "start" });
    // Only a view change scrolls; lenis is read, not watched.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, hydrated]);

  function addressErrors(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!addr.line1.trim()) e.line1 = "Enter your address.";
    if (!addr.city.trim()) e.city = "Enter your city or town.";
    if (!addr.state.trim()) e.state = "Choose your state.";
    if (!/^\d{5}$/.test(addr.postcode.trim())) e.postcode = "Enter a 5-digit postcode.";
    return e;
  }

  function openMethod(stage: "method" | "address" = "method") {
    setMethodStage(stage);
    setMethodOpen(true);
  }

  function closeMethod() {
    checkoutAfterMethod.current = false;
    setMethodOpen(false);
  }

  /** Delivery or pickup is settled (and the address, for delivery). */
  function commitMethod(t: ShopFulfilmentType) {
    setType(t);
    setMethodChosen(true);
    setMethodOpen(false);
    setErrors(({ line1: _1, city: _2, state: _3, postcode: _4, ...rest }) => rest);
    if (checkoutAfterMethod.current && cart.length > 0) setView("checkout");
    checkoutAfterMethod.current = false;
  }

  function pickMethod(t: ShopFulfilmentType) {
    if (t === "PICKUP") commitMethod("PICKUP");
    else setMethodStage("address");
  }

  function saveAddress() {
    const e = addressErrors();
    setErrors((prev) => {
      const { line1: _1, city: _2, state: _3, postcode: _4, ...rest } = prev;
      return { ...rest, ...e };
    });
    if (Object.keys(e).length === 0) commitMethod("DELIVERY");
  }

  // Picking a date resets a time that day does not offer and flags a day we are not serving,
  // so the slot select never shows a stale pick and a closed day says why at once.
  function onDateChange(next: string) {
    setDate(next);
    const s = slotsFor(next);
    if (slot && !s.includes(slot)) setSlot("");
    setErrors((e) => {
      const n = { ...e };
      if (next && s.length === 0) n.date = "We are not taking orders for that day. Please pick another.";
      else delete n.date;
      return n;
    });
  }

  const setQty = (key: string, quantity: number) => {
    setCart((c) => {
      const next = c.filter((i) => i.packageKey !== key);
      if (quantity > 0) next.push({ packageKey: key, quantity });
      return next.sort((a, b) => a.packageKey.localeCompare(b.packageKey));
    });
    if (quantity > 0) setErrors(({ cart: _cart, ...rest }) => rest);
  };
  const qtyOf = (key: string) => cart.find((i) => i.packageKey === key)?.quantity ?? 0;
  const cartCount = cart.reduce((n, i) => n + i.quantity, 0);

  const total = cartTotal(cart, priceOf);
  const deposit = depositOf(total);
  const dueNow = paymentChoice === "FULL" ? total : deposit;

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (cart.length === 0) e.cart = "Add at least one package.";
    if (type === "DELIVERY") Object.assign(e, addressErrors());
    // iOS Safari ignores the date input min/max, so range-check here too.
    const daySlots = date ? slotsFor(date) : [];
    if (!date) e.date = "Pick a date.";
    else if (date < avail.minDate || date > avail.maxDate)
      e.date = `Pick a date between ${avail.minDate} and ${avail.maxDate}.`;
    else if (daySlots.length === 0)
      e.date = "We are not taking orders for that day. Please pick another.";
    if (!slot) e.slot = "Pick a time.";
    else if (date && daySlots.length > 0 && !daySlots.includes(slot))
      e.slot = "That time is not available for the date you picked.";
    if (!contact.name.trim()) e.name = "Enter your name.";
    if (!PHONE_RE.test(contact.phone.trim())) e.phone = "Enter a valid phone number.";
    return e;
  }

  /** From the menu to checkout. Needs something in the order and a settled delivery or pickup. */
  function goCheckout() {
    setSubmitError(null);
    if (cart.length === 0) {
      setErrors({ cart: "Add at least one package first." });
      return;
    }
    if (!methodChosen) {
      checkoutAfterMethod.current = true;
      openMethod("method");
      return;
    }
    if (type === "DELIVERY") {
      const e = addressErrors();
      if (Object.keys(e).length > 0) {
        setErrors(e);
        checkoutAfterMethod.current = true;
        openMethod("address");
        return;
      }
    }
    setErrors({});
    setView("checkout");
  }

  async function placeOrder() {
    if (!avail.ordersOpen || noOpenDays) return;
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) {
      setSubmitError(null);
      // An empty order belongs on the menu; a missing address in the delivery modal.
      if (e.cart) setView("menu");
      else if (e.line1 || e.city || e.state || e.postcode) openMethod("address");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const created = await createShopOrder({
        type,
        ...(type === "DELIVERY"
          ? {
              addressLine1: addr.line1,
              addressLine2: addr.line2 || undefined,
              city: addr.city,
              state: addr.state,
              postcode: addr.postcode,
            }
          : {}),
        deliveryNotes: deliveryNotes || undefined,
        fulfilmentDate: date,
        timeSlot: slot,
        items: cart,
        paymentChoice,
        customerName: contact.name,
        customerPhone: contact.phone,
        customerEmail: contact.email || undefined,
        expectedTotal: total,
        idempotencyKey: cartIdempotencyKey(),
      });
      if (remember) saveCustomer({ contact, addr: type === "DELIVERY" ? addr : (loadSavedCustomer()?.addr ?? addr) });
      else forgetCustomer();
      clearDraftAfterOrder(created.accessToken);
      router.push(orderPath(created.accessToken));
    } catch (err) {
      // A date/slot the owner changed between page load and submit: refresh the picker so the
      // customer sees the new options, and point the error at the field that is now wrong.
      const code = err instanceof ApiError ? err.code : undefined;
      if (code === "DATE_CLOSED" || code === "SLOT_UNAVAILABLE" || code === "DATE_OUT_OF_RANGE") {
        const fresh = await getShopAvailability().catch(() => null);
        if (fresh) setAvail(fresh);
        // The chosen time no longer applies to a date that was closed or moved: force a re-pick.
        if (code !== "SLOT_UNAVAILABLE") setSlot("");
        setErrors((prev) => ({
          ...prev,
          [code === "SLOT_UNAVAILABLE" ? "slot" : "date"]:
            err instanceof Error ? err.message : "That is no longer available. Please pick again.",
        }));
        setSubmitError(null);
      } else if (code === "PRICE_CHANGED") {
        // The owner changed a price after this page loaded: reload the menu so the order shows
        // the live prices, and let the customer look before placing it again.
        router.refresh();
        setView("menu");
        setMenuNotice("A price changed while you were ordering. Your order now shows the new total. Please check it and continue.");
        setSubmitError(null);
      } else if (code === "PACKAGE_UNAVAILABLE") {
        // The owner hid or deleted a package after this page loaded: reload the menu, which also
        // drops it from the order (see the effect on `pm`), and send the customer back to it.
        router.refresh();
        setView("menu");
        setMenuNotice("One of your packages is no longer on the menu, so we took it out of your order. Please check your order and try again.");
        setSubmitError(null);
      } else {
        setSubmitError(err instanceof Error ? err.message : "Could not place the order. Please try again.");
      }
      setSubmitting(false);
    }
  }

  const detail: ShopPackagePublic | undefined = detailKey ? pm.get(detailKey) : undefined;
  const methodLine = !methodChosen
    ? "Delivery or pickup?"
    : type === "DELIVERY"
      ? `Delivery to ${[addr.line1, addr.city].filter((s) => s.trim()).join(", ")}`
      : "Pickup, location sent on WhatsApp";
  const canPlace = avail.ordersOpen && !noOpenDays;

  const placeButton = (block: boolean) => (
    <Button
      onClick={placeOrder}
      loading={submitting}
      loadingLabel="One moment"
      disabled={submitting || !canPlace}
      block={block}
    >
      {avail.ordersOpen ? "Continue to payment" : "Opens soon"}
    </Button>
  );

  /* Your order: beside the menu on a wide screen, and the summary at checkout. */
  const orderPanel = (
    <aside
      aria-label="Your order"
      className={cn(
        "grid content-start gap-4 rounded-card-md border border-cream-faint p-5 lg:sticky lg:top-28",
        view === "menu" && "max-lg:hidden",
      )}
    >
      <h2 className="m-0 text-lg font-semibold text-cream">Your order</h2>
      <p className="m-0 flex flex-wrap items-center gap-x-3 border-b border-ink-line pb-3 text-[15px] text-cream-muted">
        <span>{methodLine}</span>
        <button type="button" onClick={() => openMethod("method")} className={cn(linkButton, "text-[15px]")}>
          {methodChosen ? "Change" : "Choose"}
        </button>
      </p>
      {cart.length === 0 ? (
        <p className="m-0 text-cream-muted">Nothing here yet. Add a package to start your order.</p>
      ) : (
        <ul className="m-0 grid list-none gap-4 p-0">
          {cart.map((it) => {
            const p = pm.get(it.packageKey);
            const name = p?.name ?? it.packageKey;
            return (
              <li key={it.packageKey} className="grid gap-2">
                <div className="flex items-baseline justify-between gap-3 text-cream">
                  <span className="font-semibold">{name}</span>
                  <span>{p ? formatRm(lineTotal(p.price, it.quantity)) : ""}</span>
                </div>
                <Quantity small name={name} qty={it.quantity} onChange={(n) => setQty(it.packageKey, n)} />
              </li>
            );
          })}
        </ul>
      )}
      {errors.cart && <Banner tone="error" title={errors.cart} />}
      <div className="flex items-center justify-between border-t border-ink-line pt-3 font-semibold text-cream">
        <span>Total</span>
        <span>{formatRm(total)}</span>
      </div>
      {view === "checkout" && (
        <div className="flex items-center justify-between text-cream">
          <span>Pay now</span>
          <span className="text-lg font-semibold text-ember">{formatRm(dueNow)}</span>
        </div>
      )}
      <div className="max-lg:hidden">
        {view === "menu" ? (
          <Button onClick={goCheckout} block>
            Checkout
          </Button>
        ) : (
          placeButton(true)
        )}
      </div>
    </aside>
  );

  return (
    <Container className="pb-36 lg:pb-0">
      {/* Ordering state, up top so it is seen before filling anything in. */}
      {!avail.ordersOpen && avail.ordersOpenDate ? (
        <Banner tone="ok" title={`Ordering opens ${formatDateLabel(avail.ordersOpenDate)}`} className="mb-8">
          Look through the packages now, then come back on that day to place your order.
        </Banner>
      ) : noOpenDays ? (
        <Banner tone="error" title="No dates are open right now" className="mb-8">
          We are not taking orders at the moment. Please check back soon or message us.
        </Banner>
      ) : null}

      <div ref={top} className="grid gap-8">
        {hydrated && <OrderSteps current={view === "menu" ? 1 : 2} />}
        {!hydrated ? (
          /* The saved draft decides what shows, so hold the space until it has been read. */
          <div aria-hidden className="min-h-[420px]" />
        ) : (
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10">
            {view === "menu" ? (
              <div className="grid gap-6">
                <div className="grid gap-2">
                  <h2 className="display-sm m-0 text-cream">The menu</h2>
                  {/* On a phone the order panel is hidden, so the method shows here. */}
                  <p className="m-0 flex flex-wrap items-center gap-x-3 text-[15px] text-cream-muted lg:hidden">
                    <span>{methodLine}</span>
                    <button type="button" onClick={() => openMethod("method")} className={cn(linkButton, "text-[15px]")}>
                      {methodChosen ? "Change" : "Choose"}
                    </button>
                  </p>
                </div>
                {menuNotice && (
                  <Banner tone="error" title="Your order changed">
                    {menuNotice}
                  </Banner>
                )}
                {config.packages.length === 0 && (
                  <p className="m-0 rounded-card-md border border-dashed border-cream-faint p-6 text-cream-muted">
                    The menu is being updated and nothing is on it right now. Please check back soon, or message us on
                    WhatsApp to order.
                  </p>
                )}
                <div className="grid items-start gap-4 sm:grid-cols-2">
                  {config.packages.map((p) => {
                    const qty = qtyOf(p.key);
                    return (
                      <article
                        key={p.key}
                        className={cn(
                          "grid content-start gap-4 rounded-card-md border p-3 pb-5 transition-colors",
                          qty > 0 ? "border-ember" : "border-cream-faint",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => setDetailKey(p.key)}
                          aria-label={`View ${p.name} details`}
                          className="block rounded-card-sm text-left"
                        >
                          <PhotoSlot
                            src={p.images[0]}
                            alt={p.name}
                            note={`Photo: ${p.name}`}
                            radius="sm"
                            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                            className="aspect-[4/3] min-h-0"
                          />
                        </button>
                        <div className="grid gap-1 px-2">
                          <div className="flex items-baseline justify-between gap-3">
                            <b className="text-lg font-semibold text-cream">{p.name}</b>
                            <span className="text-ember">{formatRm(p.price)}</span>
                          </div>
                          <span className="text-[13px] text-cream-muted">{p.tagline}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 px-2">
                          <button type="button" onClick={() => setDetailKey(p.key)} className={cn(linkButton, "text-[15px]")}>
                            View details
                          </button>
                          <Quantity name={p.name} qty={qty} onChange={(n) => setQty(p.key, n)} />
                        </div>
                      </article>
                    );
                  })}
                </div>
                {/* The order panel shows this on a wide screen. */}
                {errors.cart && <Banner tone="error" title={errors.cart} className="lg:hidden" />}
              </div>
            ) : (
              <div className="grid gap-8">
                <div className="grid gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setErrors({});
                      setSubmitError(null);
                      setView("menu");
                    }}
                    className="inline-flex min-h-11 w-fit items-center gap-2 text-[15px] font-semibold text-cream-muted hover:text-cream"
                  >
                    <ArrowLeft aria-hidden size={16} strokeWidth={1.75} />
                    Back to the menu
                  </button>
                  <h2 className="display-sm m-0 text-cream">Checkout</h2>
                </div>

                <section className="grid gap-4">
                  <h3 className="m-0 text-lg font-semibold text-cream">
                    {type === "DELIVERY" ? "When should we deliver?" : "When will you pick up?"}
                  </h3>
                  <WhenPicker
                    avail={avail}
                    date={date}
                    slot={slot}
                    onDate={onDateChange}
                    onSlot={(s) => {
                      setSlot(s);
                      setErrors(({ slot: _slot, ...rest }) => rest);
                    }}
                    dateError={errors.date}
                    slotError={errors.slot}
                  />
                </section>

                <section className="grid gap-4 border-t border-ink-line pt-8">
                  <h3 className="m-0 text-lg font-semibold text-cream">Your details</h3>
                  <Field
                    label="Name"
                    value={contact.name}
                    onChange={(e) => {
                      setContact({ ...contact, name: e.target.value });
                      clearError("name");
                    }}
                    error={errors.name}
                    autoComplete="name"
                  />
                  <div className="grid items-start gap-4 sm:grid-cols-2">
                    <Field
                      label="Phone"
                      type="tel"
                      inputMode="tel"
                      value={contact.phone}
                      onChange={(e) => {
                      setContact({ ...contact, phone: e.target.value });
                      clearError("phone");
                    }}
                      error={errors.phone}
                      help="We reach you on WhatsApp."
                      autoComplete="tel"
                    />
                    <Field
                      label="Email"
                      optional
                      type="email"
                      value={contact.email}
                      onChange={(e) => setContact({ ...contact, email: e.target.value })}
                      autoComplete="email"
                    />
                  </div>
                  <Toggle
                    label="Remember my details on this device"
                    onText="On"
                    offText="Off"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  <p className="-mt-2 m-0 text-[13px] text-cream-muted">
                    Saves your name, phone, email and address in this browser, so your next order is quicker. Switch
                    it off on a shared device.
                  </p>
                </section>

                <section className="grid gap-4 border-t border-ink-line pt-8">
                  <h3 className="m-0 text-lg font-semibold text-cream">How much to pay now</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {(
                      [
                        { v: "DEPOSIT", label: "Pay half now", amount: deposit },
                        { v: "FULL", label: "Pay in full", amount: total },
                      ] as const
                    ).map((o) => (
                      <button
                        key={o.v}
                        type="button"
                        onClick={() => setPaymentChoice(o.v)}
                        aria-pressed={paymentChoice === o.v}
                        className={cn(
                          "rounded-card-sm border px-5 py-4 text-left transition-colors",
                          paymentChoice === o.v ? "border-ember bg-ember/10" : "border-cream-faint hover:border-cream",
                        )}
                      >
                        <span className="block font-semibold text-cream">{o.label}</span>
                        <span className="mt-1 block text-ember">{formatRm(o.amount)}</span>
                      </button>
                    ))}
                  </div>
                  <p className="m-0 text-[13px] text-cream-muted">
                    Payment is the next step: bank transfer or QR, then upload your receipt. Your order is
                    placed once you have paid.
                  </p>
                </section>

                {submitError && (
                  <Banner tone="error" title="We could not continue to payment">
                    {submitError}
                  </Banner>
                )}
              </div>
            )}

            {orderPanel}
          </div>
        )}
      </div>

      {/* Phone and tablet: the order total and the one action, always in reach. */}
      {hydrated && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-line bg-ink/95 backdrop-blur lg:hidden">
          <Container className="flex items-center justify-between gap-4 py-3.5">
            <div className="grid">
              <span className="text-[12px] uppercase tracking-wide text-cream-faint">
                {view === "checkout"
                  ? `Pay now · total ${formatRm(total)}`
                  : `${cartCount} ${cartCount === 1 ? "package" : "packages"}`}
              </span>
              <b className="text-lg font-semibold text-cream">{formatRm(view === "checkout" ? dueNow : total)}</b>
            </div>
            {view === "checkout" ? placeButton(false) : <Button onClick={goCheckout}>Checkout</Button>}
          </Container>
        </div>
      )}

      <Modal
        open={methodOpen}
        onClose={closeMethod}
        eyebrow="Order now"
        title={methodStage === "address" ? "Where should we deliver?" : "Delivery or pickup?"}
      >
        {methodStage === "method" ? (
          <>
            <MethodChoice value={methodChosen ? type : null} onChoose={pickMethod} />
            <p className="m-0 text-[13px] text-cream-muted">
              You can change this any time before you place the order.
            </p>
          </>
        ) : (
          <>
            <div className="grid gap-4">
              <Field
                label="Address line 1"
                value={addr.line1}
                onChange={(e) => {
                  setAddr({ ...addr, line1: e.target.value });
                  clearError("line1");
                }}
                error={errors.line1}
                autoComplete="address-line1"
              />
              <Field
                label="Address line 2"
                optional
                value={addr.line2}
                onChange={(e) => setAddr({ ...addr, line2: e.target.value })}
                autoComplete="address-line2"
              />
              <div className="grid items-start gap-4 sm:grid-cols-2">
                <Field
                  label="City"
                  value={addr.city}
                  onChange={(e) => {
                  setAddr({ ...addr, city: e.target.value });
                  clearError("city");
                }}
                  error={errors.city}
                  autoComplete="address-level2"
                />
                <Field
                  label="Postcode"
                  inputMode="numeric"
                  maxLength={5}
                  value={addr.postcode}
                  onChange={(e) => {
                    setAddr({ ...addr, postcode: e.target.value.replace(/\D/g, "") });
                    clearError("postcode");
                  }}
                  error={errors.postcode}
                  autoComplete="postal-code"
                />
              </div>
              <SelectField
                label="State"
                value={addr.state}
                onChange={(e) => {
                  setAddr({ ...addr, state: e.target.value });
                  clearError("state");
                }}
                error={errors.state}
              >
                {MY_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </SelectField>
              <TextareaField
                label="Delivery notes"
                optional
                placeholder="Gate, unit, landmarks"
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
              />
              <p className="m-0 text-[13px] text-cream-muted">
                Delivery is charged separately. After you order, we WhatsApp you the delivery fee.
                It is not part of the total shown here.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="cream" chip={false} onClick={saveAddress}>
                Deliver here
              </Button>
              <Button variant="ghost" onClick={() => setMethodStage("method")}>
                Back
              </Button>
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={!!detail}
        onClose={() => setDetailKey(null)}
        eyebrow={detail?.tagline}
        title={detail?.name ?? ""}
        wide
      >
        {detail && (
          <>
            {detail.images.length > 1 ? (
              <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1">
                {detail.images.map((src, i) => (
                  <PhotoSlot
                    key={src}
                    src={src}
                    alt={`${detail.name}, photo ${i + 1}`}
                    radius="sm"
                    sizes="(min-width: 640px) 560px, 85vw"
                    className="aspect-[4/3] min-h-0 w-[85%] shrink-0 snap-center"
                  />
                ))}
              </div>
            ) : (
              <PhotoSlot
                src={detail.images[0]}
                alt={detail.name}
                note={`Photo: ${detail.name}`}
                radius="sm"
                sizes="(min-width: 640px) 660px, 100vw"
                className="aspect-[16/9] min-h-0"
              />
            )}
            <p className="m-0 text-cream-muted">{detail.description}</p>
            {detail.includes.length > 0 && (
              <div className="grid gap-2">
                <h3 className="type-eyebrow m-0 text-cream-faint">What is inside</h3>
                <ul className="m-0 grid list-none gap-1.5 p-0 text-cream">
                  {detail.includes.map((item, i) => (
                    <li key={i} className="flex gap-3">
                      <span aria-hidden className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-ember" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-ink-line pt-5">
              <span className="text-lg font-semibold text-ember">{formatRm(detail.price)}</span>
              <div className="flex items-center gap-4">
                <Quantity name={detail.name} qty={qtyOf(detail.key)} onChange={(n) => setQty(detail.key, n)} />
                <Button variant="ghost" size="sm" onClick={() => setDetailKey(null)}>
                  Done
                </Button>
              </div>
            </div>
          </>
        )}
      </Modal>
    </Container>
  );
}
