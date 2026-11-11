"use client";

import type { KeyboardEvent, ReactNode } from "react";
import type { CateringAvailability, CateringPackagePublic } from "@/lib/api";
import type { CateringRules } from "@/lib/catering-api";
import { bookingCopy, waLink } from "@/lib/content";
import { formatLong } from "@/lib/dates";
import { formatTime12, LIMITS, type DetailsField } from "@/lib/booking";
import { Field, TextareaField } from "@/components/ui/field";
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
  eventAddress: string;
  occasion: string;
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
}: {
  answers: Answers;
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
  const occasionErr = errors.occasion;
  return (
    <form
      noValidate
      onSubmit={(e) => e.preventDefault()}
      className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr))]"
    >
      <Field {...text("serviceTime")} label="Serving time" type="time" autoComplete="off" />
      <Field
        {...text("eventAddress")}
        label="Event address"
        placeholder="Street, area, city"
        autoComplete="street-address"
        maxLength={LIMITS.eventAddress}
      />
      <div className="col-span-full grid gap-2">
        <span id="bk-occasion-label" className="text-sm font-semibold text-cream">
          Occasion
        </span>
        <div
          role="radiogroup"
          aria-labelledby="bk-occasion-label"
          aria-describedby={occasionErr ? "bk-occasion-error" : undefined}
          aria-invalid={occasionErr ? true : undefined}
          onKeyDown={radioArrows}
          className="flex flex-wrap gap-2"
        >
          {bookingCopy.occasions.map((o, i) => {
            const chosen = answers.occasion === o;
            const stop = answers.occasion ? chosen : i === 0;
            return (
              <Pill
                key={o}
                id={i === 0 ? fieldId("occasion") : undefined}
                mode="radio"
                selected={chosen}
                tabIndex={stop ? 0 : -1}
                onClick={() => onChange("occasion", o)}
                onBlur={(e) => {
                  // Validate when focus leaves the whole group, not between pills.
                  if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) onBlur("occasion");
                }}
              >
                {o}
              </Pill>
            );
          })}
        </div>
        {occasionErr && (
          <p id="bk-occasion-error" className="type-small m-0 flex items-center gap-2 text-cream">
            <ErrorMark />
            {occasionErr}
          </p>
        )}
      </div>
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
        placeholder="Parking, power, surprises"
        maxLength={LIMITS.notes}
        value={answers.notes}
        onChange={(e) => onChange("notes", e.target.value)}
      />
      <div className="type-small col-span-full m-0 text-cream-muted">{contactNote ?? bookingCopy.contactNote}</div>
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

// ─── Step 4 ──────────────────────────────────────────────────────────────────

export function StepReview({
  answers,
  pkg,
  rules,
  onEdit,
}: {
  answers: Answers;
  pkg: CateringPackagePublic | null;
  rules: CateringRules;
  onEdit: (step: 1 | 2 | 3) => void;
}) {
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
          { label: "Guests", value: answers.guests },
        ]}
      />
      <SummaryCard
        title="Event"
        emptyText="None"
        action={edit(3, "event details")}
        rows={[
          { label: "Serving time", value: formatTime12(answers.serviceTime) },
          { label: "Where", value: answers.eventAddress.trim() },
          { label: "Occasion", value: answers.occasion },
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
