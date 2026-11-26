"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, SelectField, TextareaField } from "@/components/ui/field";
import { Banner } from "@/components/ui/banner";
import { Container } from "@/components/ui/band";
import { Eyebrow } from "@/components/ui/headline";
import { cn } from "@/lib/utils";
import { MY_STATES } from "@/lib/booking";
import { ApiError } from "@/lib/api";
import {
  createShopOrder,
  getShopAvailability,
  type ShopAvailability,
  type ShopConfigPublic,
  type ShopFulfilmentType,
  type ShopPaymentChoice,
} from "@/lib/shop-api";
import {
  cartIdempotencyKey,
  cartTotal,
  clearDraftAfterOrder,
  depositOf,
  formatDateLabel,
  formatRm,
  loadDraft,
  orderPath,
  packageMap,
  saveDraft,
  slotLabel,
  type CartItem,
} from "@/lib/shop";

const PHONE_RE = /^\+?(?:[\s-]*\d){7,15}[\s-]*$/;

function Section({
  step,
  eyebrow,
  title,
  children,
}: {
  step: number;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-5 border-t border-ink-line py-8 first:border-t-0 first:pt-0">
      <div className="grid gap-1">
        <Eyebrow>
          {String(step).padStart(2, "0")} · {eyebrow}
        </Eyebrow>
        <h2 className="display-sm m-0 text-cream">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export function OrderFlow({
  config,
  availability,
}: {
  config: ShopConfigPublic;
  availability: ShopAvailability;
}) {
  const router = useRouter();
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

  const [type, setType] = useState<ShopFulfilmentType>("DELIVERY");
  const [addr, setAddr] = useState({ line1: "", line2: "", city: "", state: "Selangor", postcode: "" });
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [contact, setContact] = useState({ name: "", phone: "", email: "" });
  const [paymentChoice, setPaymentChoice] = useState<ShopPaymentChoice>("DEPOSIT");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // The whole draft survives a refresh before the order is saved. After the order exists, the
  // token page is the source of truth. Hydrate once, then persist on every change. A saved date
  // or slot that the owner has since closed or changed is dropped, so it never reaches submit.
  useEffect(() => {
    const d = loadDraft();
    if (d) {
      if (d.type) setType(d.type);
      if (d.addr) setAddr((a) => ({ ...a, ...d.addr }));
      if (d.deliveryNotes) setDeliveryNotes(d.deliveryNotes);
      if (Array.isArray(d.cart)) setCart(d.cart);
      const slots = d.date ? (slotsByDate.get(d.date) ?? []) : [];
      if (d.date && slots.length > 0) {
        setDate(d.date);
        if (d.slot && slots.includes(d.slot)) setSlot(d.slot);
      }
      if (d.contact) setContact((c) => ({ ...c, ...d.contact }));
      if (d.paymentChoice) setPaymentChoice(d.paymentChoice);
    }
    setHydrated(true);
    // Runs once on mount; slotsByDate is from the initial availability.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveDraft({ type, addr, deliveryNotes, cart, date, slot, contact, paymentChoice });
  }, [hydrated, type, addr, deliveryNotes, cart, date, slot, contact, paymentChoice]);

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

  const setQty = (key: string, quantity: number) =>
    setCart((c) => {
      const next = c.filter((i) => i.packageKey !== key);
      if (quantity > 0) next.push({ packageKey: key, quantity });
      return next.sort((a, b) => a.packageKey.localeCompare(b.packageKey));
    });
  const qtyOf = (key: string) => cart.find((i) => i.packageKey === key)?.quantity ?? 0;

  const total = cartTotal(cart, priceOf);
  const deposit = depositOf(total);
  const dueNow = paymentChoice === "FULL" ? total : deposit;

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (cart.length === 0) e.cart = "Add at least one package.";
    if (type === "DELIVERY") {
      if (!addr.line1.trim()) e.line1 = "Enter your address.";
      if (!addr.city.trim()) e.city = "Enter your city or town.";
      if (!addr.state.trim()) e.state = "Choose your state.";
      if (!/^\d{5}$/.test(addr.postcode.trim())) e.postcode = "Enter a 5-digit postcode.";
    }
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

  async function placeOrder() {
    if (!avail.ordersOpen || noOpenDays) return;
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) {
      setSubmitError(null);
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
        idempotencyKey: cartIdempotencyKey(),
      });
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
      } else {
        setSubmitError(err instanceof Error ? err.message : "Could not place the order. Please try again.");
      }
      setSubmitting(false);
    }
  }

  return (
    <Container className="grid max-w-[640px] gap-0 pb-36">
      {/* Ordering state, up top so it is seen before filling anything in. */}
      {!avail.ordersOpen && avail.ordersOpenDate ? (
        <Banner tone="ok" title={`Ordering opens ${formatDateLabel(avail.ordersOpenDate)}`} className="mb-6">
          Look through the packages now, then come back on that day to place your order.
        </Banner>
      ) : noOpenDays ? (
        <Banner tone="error" title="No dates are open right now" className="mb-6">
          We are not taking orders at the moment. Please check back soon or message us.
        </Banner>
      ) : null}

      {/* 1. Delivery or pickup */}
      <Section step={1} eyebrow="How to get it" title="Delivery or pickup?">
        <div className="grid grid-cols-2 gap-3">
          {(["DELIVERY", "PICKUP"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              aria-pressed={type === t}
              className={cn(
                "rounded-card-sm border px-5 py-4 text-left font-semibold transition-colors",
                type === t
                  ? "border-ember bg-ember/10 text-cream"
                  : "border-cream-faint text-cream-muted hover:text-cream",
              )}
            >
              {t === "DELIVERY" ? "Delivery" : "Pickup"}
              <span className="mt-1 block text-[13px] font-normal text-cream-muted">
                {t === "DELIVERY" ? "We bring it to you" : config.pickupArea}
              </span>
            </button>
          ))}
        </div>

        {type === "DELIVERY" ? (
          <div className="grid gap-4">
            <Field
              label="Address line 1"
              value={addr.line1}
              onChange={(e) => setAddr({ ...addr, line1: e.target.value })}
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
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="City"
                value={addr.city}
                onChange={(e) => setAddr({ ...addr, city: e.target.value })}
                error={errors.city}
                autoComplete="address-level2"
              />
              <Field
                label="Postcode"
                inputMode="numeric"
                maxLength={5}
                value={addr.postcode}
                onChange={(e) => setAddr({ ...addr, postcode: e.target.value.replace(/\D/g, "") })}
                error={errors.postcode}
                autoComplete="postal-code"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="State"
                value={addr.state}
                onChange={(e) => setAddr({ ...addr, state: e.target.value })}
                error={errors.state}
              >
                {MY_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </SelectField>
              <Field label="Country" value="Malaysia" readOnly disabled />
            </div>
            <TextareaField
              label="Delivery notes"
              optional
              placeholder="Gate, unit, landmarks"
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
            />
            <Banner tone="ok" title="Delivery fee">
              Arranged with you over WhatsApp. It is not added to the total here yet.
            </Banner>
          </div>
        ) : (
          <Banner tone="ok" title={`Pickup at ${config.pickupArea}`}>
            We will share the exact pickup address and details over WhatsApp.
          </Banner>
        )}
      </Section>

      {/* 2. Packages */}
      <Section step={2} eyebrow="The food" title="Choose your packages">
        <p className="m-0 text-[13px] text-cream-muted">
          The menu is still being finalised. Packages are placeholders for now.
        </p>
        <div className="grid gap-3">
          {config.packages.map((p) => {
            const qty = qtyOf(p.key);
            return (
              <div
                key={p.key}
                className="grid gap-3 rounded-card-sm border border-cream-faint p-5 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div className="grid gap-1">
                  <div className="flex items-baseline gap-3">
                    <b className="text-lg font-semibold text-cream">{p.name}</b>
                    <span className="text-ember">{formatRm(p.price)}</span>
                  </div>
                  <span className="text-[13px] text-cream-muted">{p.tagline}</span>
                </div>
                {qty === 0 ? (
                  <Button variant="cream" size="sm" onClick={() => setQty(p.key, 1)}>
                    Add to cart
                  </Button>
                ) : (
                  <div className="flex items-center gap-3 justify-self-start sm:justify-self-end">
                    <button
                      type="button"
                      aria-label={`Remove one ${p.name}`}
                      onClick={() => setQty(p.key, qty - 1)}
                      className="grid h-10 w-10 place-items-center rounded-full border border-cream-faint text-cream hover:border-ember"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="min-w-6 text-center font-semibold text-cream">{qty}</span>
                    <button
                      type="button"
                      aria-label={`Add one ${p.name}`}
                      onClick={() => setQty(p.key, qty + 1)}
                      className="grid h-10 w-10 place-items-center rounded-full border border-cream-faint text-cream hover:border-ember"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {errors.cart && (
          <Banner tone="error" title={errors.cart} />
        )}
      </Section>

      {/* 3. When */}
      <Section step={3} eyebrow="When" title="Date and time">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Date"
            type="date"
            min={avail.minDate}
            max={avail.maxDate}
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            error={errors.date}
            help={`We cook from ${formatDateLabel(avail.minDate)} onward.`}
          />
          <SelectField
            label="Time"
            value={slot}
            onChange={(e) => setSlot(e.target.value)}
            error={errors.slot}
            help="Malaysia time (GMT+8)."
            disabled={!date || slotsFor(date).length === 0}
          >
            <option value="">{date ? "Choose a time" : "Pick a date first"}</option>
            {slotsFor(date).map((s) => (
              <option key={s} value={s}>
                {slotLabel(s)}
              </option>
            ))}
          </SelectField>
        </div>
      </Section>

      {/* 4. Contact */}
      <Section step={4} eyebrow="You" title="Your details">
        <div className="grid gap-4">
          <Field
            label="Name"
            value={contact.name}
            onChange={(e) => setContact({ ...contact, name: e.target.value })}
            error={errors.name}
            autoComplete="name"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Phone"
              type="tel"
              inputMode="tel"
              value={contact.phone}
              onChange={(e) => setContact({ ...contact, phone: e.target.value })}
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
        </div>
      </Section>

      {/* 5. Pay */}
      <Section step={5} eyebrow="Payment" title="How much to pay now">
        {cart.length > 0 && (
          <div className="grid gap-2 rounded-card-sm border border-cream-faint p-5">
            <h3 className="type-eyebrow m-0 text-cream-faint">Your cart</h3>
            <ul className="m-0 grid list-none gap-1.5 p-0">
              {cart.map((it) => {
                const p = pm.get(it.packageKey);
                return (
                  <li key={it.packageKey} className="flex items-center justify-between gap-3 text-cream">
                    <span>
                      {it.quantity} × {p?.name ?? it.packageKey}
                    </span>
                    <span className="text-cream-muted">
                      {p ? formatRm((parseFloat(p.price) * it.quantity).toFixed(2)) : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="flex items-center justify-between border-t border-ink-line pt-2 font-semibold text-cream">
              <span>Total</span>
              <span>{formatRm(total)}</span>
            </div>
          </div>
        )}
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
                paymentChoice === o.v
                  ? "border-ember bg-ember/10"
                  : "border-cream-faint hover:border-cream",
              )}
            >
              <span className="block font-semibold text-cream">{o.label}</span>
              <span className="mt-1 block text-ember">{formatRm(o.amount)}</span>
            </button>
          ))}
        </div>
        <p className="m-0 text-[13px] text-cream-muted">
          Pay by bank transfer or QR after you place the order, then upload the receipt. We confirm
          once we receive it.
        </p>
      </Section>

      {submitError && (
        <Banner tone="error" title="We could not place the order" className="mt-2">
          {submitError}
        </Banner>
      )}

      {/* Sticky place-order bar with the live total. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-line bg-ink/95 backdrop-blur">
        <Container className="flex max-w-[640px] items-center justify-between gap-4 py-3.5">
          <div className="grid">
            <span className="text-[12px] uppercase tracking-wide text-cream-faint">
              Pay now · total {formatRm(total)}
            </span>
            <b className="text-lg font-semibold text-cream">{formatRm(dueNow)}</b>
          </div>
          <Button
            onClick={placeOrder}
            loading={submitting}
            loadingLabel="Placing order"
            disabled={submitting || !avail.ordersOpen || noOpenDays}
          >
            {avail.ordersOpen ? "Place order" : "Opens soon"}
          </Button>
        </Container>
      </div>
    </Container>
  );
}
