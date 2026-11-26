"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
import type { CateringAvailability, CateringPackagePublic } from "@/lib/api";
import type { CateringRules } from "@/lib/catering-api";
import { bookingCopy, waLink } from "@/lib/content";
import { formatLong } from "@/lib/dates";
import {
  deliveryPeriods,
  formatRm,
  formatTime12,
  joinAddress,
  LIMITS,
  MY_STATES,
  orderAmounts,
  priceLabel,
  type DetailsField,
} from "@/lib/booking";
import { cn } from "@/lib/utils";
import { Field, SelectField, TextareaField } from "@/components/ui/field";
import { Pill } from "@/components/ui/pill";
import { GuestStepper } from "@/components/ui/guest-stepper";
import { Banner, ErrorMark } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { PackageCard } from "@/components/sections/package-card";
import { accent } from "@/components/sections/accent";
import { BookingCalendar, CalendarSkeleton } from "@/components/booking/calendar";
import { SummaryCard } from "@/components/booking/booking-summary";

/** Everything the customer has answered. Going back never clears any of it. */
export type Answers = {
  date: string | null;
  packageId: string | null;
  guests: number | null;
  serviceTime: string;
  addressLine1: string;
  addressLine2: string;
  postcode: string;
  city: string;
  state: string;
  /** Pay half now, or everything. */
  paymentChoice: "DEPOSIT" | "FULL";
  dietaryNotes: string;
  notes: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  /** Honeypot. Humans leave it empty. */
  website: string;
};

export const fieldId = (f: DetailsField | "dietaryNotes" | "notes") => `bk-${f}`;

const linkClass = "font-semibold text-cream underline decoration-ember underline-offset-4";

/**
 * Arrow keys inside a role="radiogroup": move to the previous or next radio and pick it,
 * as native radios do. Pair with a roving tabIndex (only the chosen radio is a tab stop).
 */
export function radioArrows(e: KeyboardEvent<HTMLElement>) {
  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
  if (!step) return;
  const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]'));
  const i = items.indexOf(document.activeElement as HTMLElement);
  if (i < 0) return;
  e.preventDefault();
  const next = items[(i + step + items.length) % items.length];
  next.focus();
  next.click();
}

// ─── Step 1 ──────────────────────────────────────────────────────────────────

export function StepDate({
  rules,
  availability,
  today,
  failed,
  onRetry,
  selected,
  onSelect,
}: {
  rules: CateringRules;
  availability: CateringAvailability | null;
  today: string | null;
  failed: boolean;
  onRetry: () => void;
  selected: string | null;
  onSelect: (ymd: string) => void;
}) {
  return (
    <div className="grid gap-6">
      <p className="type-body-lg m-0 text-cream-muted">{bookingCopy.dateIntro(rules)}</p>
      {failed ? (
        <Banner tone="error" title={bookingCopy.calendarFailed}>
          <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
            Check your connection and try again.
            <button type="button" onClick={onRetry} className={`${linkClass} min-h-11`}>
              Try again
            </button>
            <a href={waLink(bookingCopy.whatsappMessage)} target="_blank" rel="noopener noreferrer" className={`${linkClass} inline-flex min-h-11 items-center`}>
              Message us
            </a>
          </span>
        </Banner>
      ) : availability && today ? (
        <BookingCalendar availability={availability} today={today} selected={selected} onSelect={onSelect} />
      ) : (
        <CalendarSkeleton />
      )}
    </div>
  );
}

// ─── Step 2 ──────────────────────────────────────────────────────────────────

export function StepPackage({
  packages,
  packageId,
  guests,
  guestNote,
  onPackage,
  onGuests,
}: {
  packages: CateringPackagePublic[];
  packageId: string | null;
  guests: number | null;
  guestNote: string;
  onPackage: (id: string) => void;
  onGuests: (n: number) => void;
}) {
  const pkg = packages.find((p) => p.id === packageId) ?? null;
  const stop = pkg ? pkg.id : packages[0]?.id;
  return (
    <div className="grid gap-8">
      <div role="radiogroup" aria-label="Package" onKeyDown={radioArrows} className="grid gap-5">
        {packages.map((p, i) => (
          <PackageCard
            key={p.id}
            pkg={p}
            index={i}
            mode="select"
            selected={p.id === packageId}
            onSelect={() => onPackage(p.id)}
            tabIndex={p.id === stop ? 0 : -1}
          />
        ))}
      </div>
      {pkg && guests != null && (
        <GuestStepper
          value={guests}
          onChange={onGuests}
          min={pkg.minGuests}
          max={pkg.maxGuests}
          help={bookingCopy.guestHelp(pkg.name, pkg.minGuests, pkg.maxGuests) + guestNote}
        />
      )}
      <p className="type-small m-0 text-cream-muted">{bookingCopy.quote}</p>
    </div>
  );
}

// ─── Step 3 ──────────────────────────────────────────────────────────────────

export function StepDetails({
  answers,
  errors,
  onChange,
  onBlur,
  contactNote,
  hours,
}: {
  answers: Answers;
  /** Delivery hours on the chosen date. */
  hours: { start: string; end: string };
  errors: Partial<Record<DetailsField, string>>;
  onChange: (field: keyof Answers, value: string) => void;
  onBlur: (field: DetailsField) => void;
  /** Slot above the contact fields ("Signed in as ..." for signed-in customers). */
  contactNote?: ReactNode;
}) {
  const text = (field: DetailsField) => ({
    id: fieldId(field),
    name: field,
    value: answers[field],
    error: errors[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(field, e.target.value),
    onBlur: () => onBlur(field),
  });
  const select = (field: DetailsField) => ({
    id: fieldId(field),
    name: field,
    value: answers[field],
    error: errors[field],
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onChange(field, e.target.value),
    onBlur: () => onBlur(field),
  });
  const heading = "type-eyebrow m-0 text-cream-muted";
  return (
    <form noValidate onSubmit={(e) => e.preventDefault()} className="grid gap-10">
      <section aria-labelledby="bk-delivery-h" className="grid gap-5">
        <h2 id="bk-delivery-h" className={heading}>
          Delivery
        </h2>
        <DeliveryTimePicker
          value={answers.serviceTime}
          error={errors.serviceTime}
          hours={hours}
          onChange={(t) => {
            onChange("serviceTime", t);
            onBlur("serviceTime");
          }}
        />
        <Field
          {...text("addressLine1")}
          label="Address line 1"
          placeholder="House number and street"
          autoComplete="address-line1"
          maxLength={150}
        />
        <Field
          {...text("addressLine2")}
          label="Address line 2"
          optional
          placeholder="Apartment, unit, taman"
          autoComplete="address-line2"
          maxLength={150}
        />
        <div className="grid items-start gap-5 sm:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)_minmax(0,1fr)]">
          <Field
            {...text("postcode")}
            label="Postcode"
            inputMode="numeric"
            placeholder="47300"
            autoComplete="postal-code"
            maxLength={5}
          />
          <Field {...text("city")} label="City" placeholder="Petaling Jaya" autoComplete="address-level2" maxLength={60} />
          <SelectField {...select("state")} label="State" autoComplete="address-level1">
            <option value="" disabled>
              Pick a state
            </option>
            {MY_STATES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </SelectField>
        </div>
      </section>

      <section aria-labelledby="bk-notes-h" className="grid gap-5">
        <h2 id="bk-notes-h" className={heading}>
          Notes
        </h2>
        <div className="grid items-start gap-5 sm:grid-cols-2">
          <TextareaField
            id={fieldId("dietaryNotes")}
            name="dietaryNotes"
            label="Dietary notes"
            optional
            placeholder="Allergies, no beef, vegetarian guests"
            maxLength={LIMITS.dietaryNotes}
            value={answers.dietaryNotes}
            onChange={(e) => onChange("dietaryNotes", e.target.value)}
          />
          <TextareaField
            id={fieldId("notes")}
            name="notes"
            label="Anything else"
            optional
            placeholder="Gate code, where to leave it, call on arrival"
            maxLength={LIMITS.notes}
            value={answers.notes}
            onChange={(e) => onChange("notes", e.target.value)}
          />
        </div>
      </section>

      <section aria-labelledby="bk-contact-h" className="grid gap-5">
        <div className="grid gap-1">
          <h2 id="bk-contact-h" className={heading}>
            Contact
          </h2>
          <div className="type-small m-0 text-cream-muted">{contactNote ?? bookingCopy.contactNote}</div>
        </div>
        <div className="grid items-start gap-5 sm:grid-cols-3">
          <Field {...text("customerName")} label="Your name" placeholder="Full name" autoComplete="name" maxLength={LIMITS.customerName} />
          <Field {...text("customerPhone")} label="Phone" type="tel" inputMode="tel" placeholder="012 345 6789" autoComplete="tel" />
          <Field
            {...text("customerEmail")}
            label="Email"
            type="email"
            inputMode="email"
            placeholder="you@example.com"
            autoComplete="email"
            maxLength={LIMITS.customerEmail}
          />
        </div>
      </section>

      {/* Honeypot: hidden from people and assistive tech; bots that fill every field get rejected. */}
      <input
        type="text"
        name="br-hp-field"
        tabIndex={-1}
        autoComplete="new-password"
        aria-hidden
        value={answers.website}
        onChange={(e) => onChange("website", e.target.value)}
        className="absolute -left-[10000px] h-px w-px overflow-hidden opacity-0"
      />
    </form>
  );
}

/**
 * Delivery time in two taps: a part of the day, then one of its few slots. No long list,
 * so it stays easy on a phone. The first pill carries the field id for error focus.
 */
function DeliveryTimePicker({
  value,
  error,
  hours,
  onChange,
}: {
  value: string;
  error?: string;
  hours: { start: string; end: string };
  onChange: (time: string) => void;
}) {
  const DELIVERY_PERIODS = deliveryPeriods(hours.start, hours.end);
  const fromValue = DELIVERY_PERIODS.find((p) => p.slots.includes(value))?.key ?? null;
  const [period, setPeriod] = useState<string | null>(fromValue);
  const current = DELIVERY_PERIODS.find((p) => p.key === (period ?? fromValue));
  const errorId = "bk-serviceTime-error";
  return (
    <div className="grid gap-3">
      <span id="bk-time-label" className="text-sm font-semibold text-cream">
        Delivery time
        {value && <span className="font-normal text-cream-muted">: {formatTime12(value)}</span>}
      </span>
      <div
        role="radiogroup"
        aria-labelledby="bk-time-label"
        aria-describedby={error ? errorId : undefined}
        onKeyDown={radioArrows}
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        {DELIVERY_PERIODS.map((p, i) => {
          const chosen = current?.key === p.key;
          return (
            <Pill
              key={p.key}
              id={i === 0 ? fieldId("serviceTime") : undefined}
              mode="radio"
              selected={chosen}
              tabIndex={chosen || (!current && i === 0) ? 0 : -1}
              onClick={() => setPeriod(p.key)}
              className="justify-center"
            >
              <span className="grid leading-tight">
                <span>{p.label}</span>
                <span className="text-xs font-normal opacity-75">{p.range}</span>
              </span>
            </Pill>
          );
        })}
      </div>
      {current && (
        <div
          role="radiogroup"
          aria-label={`${current.label} times`}
          onKeyDown={radioArrows}
          className="grid grid-cols-3 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(112px,1fr))]"
        >
          {current.slots.map((t, i) => {
            const chosen = value === t;
            return (
              <Pill
                key={t}
                mode="radio"
                selected={chosen}
                tabIndex={chosen || (!current.slots.includes(value) && i === 0) ? 0 : -1}
                onClick={() => onChange(t)}
                className="justify-center whitespace-nowrap px-3"
              >
                {formatTime12(t)}
              </Pill>
            );
          })}
        </div>
      )}
      {error ? (
        <p id={errorId} className="type-small m-0 flex items-center gap-2 text-cream">
          <ErrorMark />
          {error}
        </p>
      ) : (
        <p className="type-small m-0 text-cream-muted">When the food should reach you.</p>
      )}
    </div>
  );
}

// ─── Step 4 ──────────────────────────────────────────────────────────────────

export function StepReview({
  answers,
  pkg,
  rules,
  onEdit,
  onPaymentChoice,
}: {
  answers: Answers;
  pkg: CateringPackagePublic | null;
  rules: CateringRules;
  onEdit: (step: 1 | 2 | 3) => void;
  onPaymentChoice: (c: "DEPOSIT" | "FULL") => void;
}) {
  const amounts = orderAmounts(pkg, answers.guests);
  const edit = (step: 1 | 2 | 3, what: string) => (
    <button type="button" onClick={() => onEdit(step)} aria-label={`Edit ${what}`} className={`${linkClass} min-h-11 text-sm`}>
      Edit
    </button>
  );
  return (
    <div className="grid gap-3">
      <SummaryCard title="Date" emptyText="None" action={edit(1, "date")} rows={[{ label: "Date", value: answers.date && formatLong(answers.date) }]} />
      <SummaryCard
        title="Package"
        emptyText="None"
        action={edit(2, "package")}
        rows={[
          { label: "Package", value: pkg?.name },
          { label: "Guests (pax)", value: answers.guests },
          { label: "Price", value: pkg ? priceLabel(pkg) : null },
        ]}
      />
      <SummaryCard
        title="Delivery"
        emptyText="None"
        action={edit(3, "delivery details")}
        rows={[
          { label: "Delivery time", value: formatTime12(answers.serviceTime) },
          { label: "Deliver to", value: joinAddress(answers) },
          { label: "Dietary notes", value: answers.dietaryNotes.trim() },
          { label: "Anything else", value: answers.notes.trim() },
        ]}
      />
      <SummaryCard
        title="Contact"
        emptyText="None"
        action={edit(3, "contact details")}
        rows={[
          { label: "Name", value: answers.customerName.trim() },
          { label: "Phone", value: answers.customerPhone.trim() },
          { label: "Email", value: answers.customerEmail.trim() },
        ]}
      />
      {amounts ? (
        <fieldset className="m-0 mt-3 grid gap-3 border-0 p-0">
          <legend className="mb-1 text-base font-semibold text-cream">
            Total {formatRm(amounts.total)}. How would you like to pay?
          </legend>
          {(
            [
              { v: "DEPOSIT", title: `Pay half now: ${formatRm(amounts.half)}`, text: "The rest before delivery." },
              { v: "FULL", title: `Pay in full: ${formatRm(amounts.total)}`, text: "Nothing left to pay later." },
            ] as const
          ).map((o) => (
            <label
              key={o.v}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-card-sm bg-ink-raised p-4 shadow-[inset_0_0_0_1px_theme(colors.ink.line)]",
                answers.paymentChoice === o.v && "shadow-[inset_0_0_0_2px_theme(colors.ember.DEFAULT)]",
              )}
            >
              <input
                type="radio"
                name="bk-payment"
                checked={answers.paymentChoice === o.v}
                onChange={() => onPaymentChoice(o.v)}
                className="mt-1 h-4 w-4 accent-[rgb(var(--ember))]"
              />
              <span className="grid gap-0.5">
                <b>{o.title}</b>
                <span className="type-small text-cream-muted">{o.text}</span>
              </span>
            </label>
          ))}
          <p className="type-small m-0 text-cream-muted">
            After you send this, your booking page shows how to pay and lets you upload the receipt.
          </p>
        </fieldset>
      ) : (
        <p className="type-body m-0 mt-3 text-cream-muted">{bookingCopy.quote}</p>
      )}
      <p className="type-body m-0 mt-3 text-cream-muted">{bookingCopy.hold(rules)}</p>
    </div>
  );
}

// ─── Done ────────────────────────────────────────────────────────────────────

export function DoneScreen({
  headingRef,
  reference,
  accessToken,
  phone,
  heldUntil,
  account,
}: {
  headingRef: React.Ref<HTMLHeadingElement>;
  reference: string;
  accessToken: string;
  phone: string;
  /** "Friday 13 November", or null when there is no hold time. */
  heldUntil: string | null;
  /** Account seam: "Want every booking in one place?" or "Saved to your bookings.". */
  account?: ReactNode;
}) {
  const c = bookingCopy.done;
  return (
    <div className="grid justify-items-start gap-5">
      <p className="type-eyebrow m-0 inline-flex items-center gap-2.5 text-cream-muted">
        <span aria-hidden className="h-2 w-2 rounded-full bg-ember" />
        {c.eyebrow}
      </p>
      <h1 ref={headingRef} tabIndex={-1} className="display-lg m-0 text-balance focus:outline-none">
        {accent(c.headline)}
      </h1>
      <p className="m-0">
        <span className="sr-only">Your reference is </span>
        <span className="display-lg block">{reference}</span>
      </p>
      <p className="type-body-lg m-0">
        {c.callLine(phone)}
        {heldUntil && c.heldLine(heldUntil)}
      </p>
      {account}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Button href={`/booking/${encodeURIComponent(accessToken)}`}>{c.action}</Button>
        <a href={waLink(`Hi Bakar & Roast, about my booking ${reference}.`)} target="_blank" rel="noopener noreferrer" className={`${linkClass} inline-flex min-h-11 items-center`}>
          Message us
        </a>
      </div>
    </div>
  );
}
