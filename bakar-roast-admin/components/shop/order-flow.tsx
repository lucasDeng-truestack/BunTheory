"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLenis } from "lenis/react";
import { ArrowLeft, Minus, Plus, Store, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, SelectField, TextareaField } from "@/components/ui/field";
import { Banner } from "@/components/ui/banner";
import { Container } from "@/components/ui/band";
import { PhotoSlot } from "@/components/ui/photo-slot";
import { Modal } from "@/components/shop/modal";
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
  formatDateLabel,
  formatRm,
  lineTotal,
  loadDraft,
  orderPath,
  packageMap,
  saveDraft,
  slotLabel,
  type CartItem,
} from "@/lib/shop";

const PHONE_RE = /^\+?(?:[\s-]*\d){7,15}[\s-]*$/;

/**
 * One step on screen at a time, so the page stays short. Delivery asks for the address first;
 * pickup skips straight to the packages.
 */
type StepKey = "address" | "packages" | "details" | "review";

const STEP_LABEL: Record<StepKey, string> = {
  address: "Address",
  packages: "Packages",
  details: "Date and details",
  review: "Review",
};

const STEP_TITLE: Record<StepKey, string> = {
  address: "Where should we deliver?",
  packages: "Choose your packages",
  details: "When, and who is it for?",
  review: "Check your order",
};

const stepsFor = (type: ShopFulfilmentType): StepKey[] =>
  type === "DELIVERY" ? ["address", "packages", "details", "review"] : ["packages", "details", "review"];

/** Which step owns each validation error, so a failed check can take the customer there. */
const STEP_OF_ERROR: Record<string, StepKey> = {
  line1: "address",
  city: "address",
  state: "address",
  postcode: "address",
  cart: "packages",
  date: "details",
  slot: "details",
  name: "details",
  phone: "details",
};

/** The two ways to get the food, as large tap targets. Used in the opening modal and on the page. */
function MethodChoice({
  value,
  pickupArea,
  onChoose,
}: {
  value: ShopFulfilmentType | null;
  pickupArea: string;
  onChoose: (t: ShopFulfilmentType) => void;
}) {
  const options = [
    { t: "DELIVERY" as const, label: "Delivery", sub: "We bring it to you", Icon: Truck },
    { t: "PICKUP" as const, label: "Pickup", sub: pickupArea, Icon: Store },
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

/** Add button until there is one in the cart, then a minus / count / plus stepper. */
function Quantity({
  name,
  qty,
  onChange,
}: {
  name: string;
  qty: number;
  onChange: (next: number) => void;
}) {
  if (qty === 0) {
    return (
      <Button variant="cream" size="sm" onClick={() => onChange(1)}>
        Add
      </Button>
    );
  }
  const round =
    "grid h-11 w-11 place-items-center rounded-full border border-cream-faint text-cream hover:border-ember";
  return (
    <div className="flex items-center gap-3">
      <button type="button" aria-label={`Remove one ${name}`} onClick={() => onChange(qty - 1)} className={round}>
        <Minus aria-hidden size={16} />
      </button>
      <span aria-live="polite" className="min-w-6 text-center font-semibold text-cream">
        {qty}
      </span>
      <button type="button" aria-label={`Add one ${name}`} onClick={() => onChange(qty + 1)} className={round}>
        <Plus aria-hidden size={16} />
      </button>
    </div>
  );
}

/** One block of the review step: a label, what was chosen, and a way back to change it. */
function ReviewRow({
  label,
  onEdit,
  children,
}: {
  label: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5 border-b border-ink-line py-4 first:pt-0 last:border-b-0 last:pb-0">
      <div className="flex items-center justify-between gap-3">
        <h3 className="type-eyebrow m-0 text-cream-faint">{label}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="-my-2 min-h-11 text-[13px] font-semibold text-cream-muted underline underline-offset-4 hover:text-cream"
        >
          Change
        </button>
      </div>
      <div className="grid gap-0.5 text-cream">{children}</div>
    </div>
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

  const [type, setType] = useState<ShopFulfilmentType>("DELIVERY");
  // Delivery or pickup is asked first, in a modal. Until it is answered there are no steps.
  const [methodChosen, setMethodChosen] = useState(false);
  const [methodOpen, setMethodOpen] = useState(false);
  const [step, setStep] = useState<StepKey>("packages");
  const [detailKey, setDetailKey] = useState<string | null>(null);
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

  const steps = stepsFor(type);
  const stepIndex = Math.max(0, steps.indexOf(step));

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
    if (d?.methodChosen) {
      const list = stepsFor(d.type ?? "DELIVERY");
      setMethodChosen(true);
      setStep(list.find((s) => s === d.step) ?? list[0]);
    } else {
      setMethodOpen(true);
    }
    setHydrated(true);
    // Runs once on mount; slotsByDate is from the initial availability.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveDraft({ type, addr, deliveryNotes, cart, date, slot, contact, paymentChoice, methodChosen, step });
  }, [hydrated, type, addr, deliveryNotes, cart, date, slot, contact, paymentChoice, methodChosen, step]);

  // A new step starts at its own top, not wherever the last one was scrolled to.
  const settled = useRef(false);
  useEffect(() => {
    if (!hydrated) return;
    if (!settled.current) {
      settled.current = true;
      return;
    }
    const el = top.current;
    if (!el) return;
    // force: a step can change while a modal still has page scroll paused.
    if (lenis) lenis.scrollTo(el, { offset: -110, force: true });
    else el.scrollIntoView({ block: "start" });
    // Only a step change scrolls; lenis is read, not watched.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, hydrated]);

  function chooseMethod(t: ShopFulfilmentType) {
    const list = stepsFor(t);
    if (!methodChosen) setStep(list[0]);
    // Switching to delivery needs an address before anything else.
    else if (t === "DELIVERY" && type !== "DELIVERY") setStep("address");
    else if (!list.includes(step)) setStep(list[0]);
    setType(t);
    setMethodChosen(true);
    setMethodOpen(false);
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

  /** Continue: check only what this step asks for, then move on. */
  function next() {
    const all = validate();
    const mine = Object.fromEntries(Object.entries(all).filter(([k]) => STEP_OF_ERROR[k] === step));
    setErrors(mine);
    setSubmitError(null);
    if (Object.keys(mine).length > 0) return;
    const after = steps[stepIndex + 1];
    if (after) setStep(after);
  }

  function back() {
    const before = steps[stepIndex - 1];
    if (before) {
      setErrors({});
      setSubmitError(null);
      setStep(before);
    }
  }

  async function placeOrder() {
    if (!avail.ordersOpen || noOpenDays) return;
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) {
      // Something earlier is missing: go to the first step that needs fixing.
      const broken = steps.find((s) => Object.keys(e).some((k) => STEP_OF_ERROR[k] === s));
      if (broken) setStep(broken);
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
      // customer sees the new options, and take them back to the field that is now wrong.
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
        setStep("details");
      } else {
        setSubmitError(err instanceof Error ? err.message : "Could not place the order. Please try again.");
      }
      setSubmitting(false);
    }
  }

  const detail: ShopPackagePublic | undefined = detailKey ? pm.get(detailKey) : undefined;
  const methodLine =
    type === "DELIVERY"
      ? addr.line1.trim()
        ? `Delivery to ${[addr.line1, addr.city].filter((s) => s.trim()).join(", ")}`
        : "Delivery"
      : `Pickup at ${config.pickupArea}`;

  return (
    <Container className="pb-36">
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
        {!hydrated ? (
          /* The saved draft decides what shows, so hold the space until it has been read. */
          <div aria-hidden className="min-h-[320px]" />
        ) : !methodChosen ? (
          /* The opening question, also here on the page in case the modal was closed. */
          <section className="grid max-w-[640px] gap-5">
            <h2 className="display-sm m-0 text-cream">Delivery or pickup?</h2>
            <MethodChoice value={null} pickupArea={config.pickupArea} onChoose={chooseMethod} />
          </section>
        ) : (
          <>
            {/* Where we are: back, the chosen method, and the steps. */}
            <div className="grid gap-4">
              <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
                {stepIndex > 0 ? (
                  <button
                    type="button"
                    onClick={back}
                    className="inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold text-cream-muted hover:text-cream"
                  >
                    <ArrowLeft aria-hidden size={16} strokeWidth={1.75} />
                    Back to {STEP_LABEL[steps[stepIndex - 1]].toLowerCase()}
                  </button>
                ) : (
                  <span />
                )}
                <p className="m-0 flex min-h-11 items-center gap-3 text-[15px] text-cream-muted">
                  <span>{methodLine}</span>
                  <button
                    type="button"
                    onClick={() => setMethodOpen(true)}
                    className="min-h-11 font-semibold text-cream underline underline-offset-4 hover:text-ember"
                  >
                    Change
                  </button>
                </p>
              </div>
              <ol aria-label="Order progress" className="m-0 flex list-none gap-2 p-0">
                {steps.map((s, i) => {
                  const state = i < stepIndex ? "done" : i === stepIndex ? "current" : "ahead";
                  return (
                    <li
                      key={s}
                      aria-current={state === "current" ? "step" : undefined}
                      className={cn(
                        "grid flex-1 gap-2 text-[13px] font-semibold transition-colors duration-300",
                        state === "done" && "text-cream-muted",
                        state === "current" && "text-cream",
                        state === "ahead" && "text-cream-faint",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "h-1 rounded-sm",
                          state === "done" && "bg-cream-muted",
                          state === "current" && "bg-ember",
                          state === "ahead" && "bg-ink-line",
                        )}
                      />
                      <span className={cn(state !== "current" && "max-sm:sr-only")}>
                        {i + 1}. {STEP_LABEL[s]}
                        {state === "done" && <span className="sr-only"> (done)</span>}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>

            <h2 className="display-sm m-0 text-cream">{STEP_TITLE[step]}</h2>

            {step === "address" && (
              <div className="grid max-w-[640px] gap-4">
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
                <TextareaField
                  label="Delivery notes"
                  optional
                  placeholder="Gate, unit, landmarks"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                />
                <p className="m-0 text-[13px] text-cream-muted">
                  We deliver within Malaysia. The delivery fee is arranged with you over WhatsApp
                  and is not added to the total here yet.
                </p>
              </div>
            )}

            {step === "packages" && (
              <div className="grid gap-5">
                <p className="m-0 text-[13px] text-cream-muted">
                  The menu is still being finalised. Packages are placeholders for now.
                </p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                          <button
                            type="button"
                            onClick={() => setDetailKey(p.key)}
                            className="min-h-11 text-[15px] font-semibold text-cream underline underline-offset-4 hover:text-ember"
                          >
                            View details
                          </button>
                          <Quantity name={p.name} qty={qty} onChange={(n) => setQty(p.key, n)} />
                        </div>
                      </article>
                    );
                  })}
                </div>
                {errors.cart && <Banner tone="error" title={errors.cart} />}
              </div>
            )}

            {step === "details" && (
              <div className="grid max-w-[640px] gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label={type === "DELIVERY" ? "Delivery date" : "Pickup date"}
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
            )}

            {step === "review" && (
              <div className="grid max-w-[640px] gap-6">
                <div className="rounded-card-sm border border-cream-faint p-5">
                  <ReviewRow label="How" onEdit={() => (type === "DELIVERY" ? setStep("address") : setMethodOpen(true))}>
                    {type === "DELIVERY" ? (
                      <>
                        <span>Delivery</span>
                        <span className="text-cream-muted">
                          {[addr.line1, addr.line2, `${addr.postcode} ${addr.city}`, addr.state]
                            .filter((s) => s.trim())
                            .join(", ")}
                        </span>
                      </>
                    ) : (
                      <>
                        <span>Pickup at {config.pickupArea}</span>
                        <span className="text-cream-muted">We share the exact address over WhatsApp.</span>
                      </>
                    )}
                  </ReviewRow>
                  <ReviewRow label="When" onEdit={() => setStep("details")}>
                    <span>
                      {date ? formatDateLabel(date) : "No date yet"}
                      {slot ? `, ${slotLabel(slot)}` : ""}
                    </span>
                  </ReviewRow>
                  <ReviewRow label="Contact" onEdit={() => setStep("details")}>
                    <span>{contact.name}</span>
                    <span className="text-cream-muted">
                      {[contact.phone, contact.email].filter((s) => s.trim()).join(" · ")}
                    </span>
                  </ReviewRow>
                  <ReviewRow label="Packages" onEdit={() => setStep("packages")}>
                    <ul className="m-0 grid list-none gap-1.5 p-0">
                      {cart.map((it) => {
                        const p = pm.get(it.packageKey);
                        return (
                          <li key={it.packageKey} className="flex items-center justify-between gap-3">
                            <span>
                              {it.quantity} × {p?.name ?? it.packageKey}
                            </span>
                            <span className="text-cream-muted">
                              {p ? formatRm(lineTotal(p.price, it.quantity)) : ""}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                    <div className="mt-2 flex items-center justify-between border-t border-ink-line pt-2 font-semibold">
                      <span>Total</span>
                      <span>{formatRm(total)}</span>
                    </div>
                  </ReviewRow>
                </div>

                <div className="grid gap-3">
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
                    Pay by bank transfer or QR after you place the order, then upload the receipt.
                    We confirm once we receive it.
                  </p>
                </div>

                {submitError && (
                  <Banner tone="error" title="We could not place the order">
                    {submitError}
                  </Banner>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Sticky bar: the running total and the one action for this step. */}
      {methodChosen && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-line bg-ink/95 backdrop-blur">
          <Container className="flex items-center justify-between gap-4 py-3.5">
            <div className="grid">
              <span className="text-[12px] uppercase tracking-wide text-cream-faint">
                {step === "review"
                  ? `Pay now · total ${formatRm(total)}`
                  : cartCount > 0
                    ? `${cartCount} ${cartCount === 1 ? "package" : "packages"}`
                    : `Step ${stepIndex + 1} of ${steps.length}`}
              </span>
              <b className="text-lg font-semibold text-cream">
                {step === "review" ? formatRm(dueNow) : cartCount > 0 ? formatRm(total) : STEP_LABEL[step]}
              </b>
            </div>
            {step === "review" ? (
              <Button
                onClick={placeOrder}
                loading={submitting}
                loadingLabel="Placing order"
                disabled={submitting || !avail.ordersOpen || noOpenDays}
              >
                {avail.ordersOpen ? "Place order" : "Opens soon"}
              </Button>
            ) : (
              <Button onClick={next}>Continue</Button>
            )}
          </Container>
        </div>
      )}

      <Modal open={methodOpen} onClose={() => setMethodOpen(false)} eyebrow="Order now" title="Delivery or pickup?">
        <MethodChoice value={methodChosen ? type : null} pickupArea={config.pickupArea} onChoose={chooseMethod} />
        <p className="m-0 text-[13px] text-cream-muted">You can change this any time before you place the order.</p>
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
