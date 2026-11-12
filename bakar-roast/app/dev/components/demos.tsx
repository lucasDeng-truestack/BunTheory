"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { GuestStepper } from "@/components/ui/guest-stepper";
import { Pill } from "@/components/ui/pill";
import {
  ADMIN_DAY_LOOK,
  BookingCalendar,
  CalendarShell,
  dayCell,
  LegendItem,
  MonthGrid,
  type AdminDayLook,
} from "@/components/booking/calendar";
import { cn } from "@/lib/utils";
import type { CateringBookingMine } from "@/lib/api";
import { AccountLoading, BookingsView, CodeStep, EmailStep } from "@/components/account/account-screen";

const OCCASIONS = ["House gathering", "Celebration", "Community or church", "Corporate", "Something else"];
const PACKAGES = [
  { name: "The Gathering", min: 10, max: 40 },
  { name: "The Feast", min: 20, max: 80 },
];

export function PillDemo() {
  const [occasion, setOccasion] = useState("Celebration");
  const [filters, setFilters] = useState<string[]>(["Whole chicken"]);
  return (
    <div className="grid gap-4">
      <div role="radiogroup" aria-label="Occasion" className="flex flex-wrap gap-2">
        {OCCASIONS.map((o) => (
          <Pill key={o} mode="radio" selected={occasion === o} onClick={() => setOccasion(o)}>
            {o}
          </Pill>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {["Whole chicken", "Sides", "Tables"].map((f) => (
          <Pill
            key={f}
            selected={filters.includes(f)}
            onClick={() => setFilters((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]))}
          >
            {f}
          </Pill>
        ))}
        <Pill disabled>Disabled</Pill>
      </div>
    </div>
  );
}

export function StepperDemo() {
  const [pkg, setPkg] = useState(1);
  const [guests, setGuests] = useState(40);
  const p = PACKAGES[pkg];
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        {PACKAGES.map((x, i) => (
          <Pill key={x.name} selected={pkg === i} onClick={() => setPkg(i)}>
            {x.name}
          </Pill>
        ))}
      </div>
      <GuestStepper
        value={guests}
        onChange={setGuests}
        min={p.min}
        max={p.max}
        help={`${p.name} serves ${p.min} to ${p.max} guests.`}
      />
    </div>
  );
}

export function DialogDemo() {
  const [open, setOpen] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="cream" onClick={() => setOpen(true)}>
        Cancel booking
      </Button>
      <Button variant="ghost" onClick={() => setAdmin(true)}>
        Decline request
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Cancel this booking?"
        description="Saturday 12 December 2026 will open up for someone else. This cannot be undone."
        confirmLabel="Yes, cancel it"
        cancelLabel="Keep my booking"
        confirmLoading={busy}
        confirmLoadingLabel="Cancelling"
        onConfirm={() => {
          setBusy(true);
          setTimeout(() => {
            setBusy(false);
            setOpen(false);
          }, 1200);
        }}
      />
      <Dialog
        open={admin}
        onClose={() => setAdmin(false)}
        title="Decline this request?"
        description="Saturday 12 December 2026 opens up again. We email the customer."
        confirmLabel="Yes, decline it"
        cancelLabel="Keep it pending"
        onConfirm={() => setAdmin(false)}
      >
        <Field label="Reason" optional size="sm" placeholder="We are away that weekend" />
      </Dialog>
    </div>
  );
}

export function LoadingButtonDemo() {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      loading={loading}
      loadingLabel="Sending"
      onClick={() => {
        setLoading(true);
        setTimeout(() => setLoading(false), 1500);
      }}
    >
      Send request
    </Button>
  );
}

/** Calendar in every customer state: today 1 Dec (dot), 2 to 7 too soon (hatch), 12 picked,
 *  11 / 19 / 20 / 25 unavailable (strike), after 27 not open yet (ring), Nov and Jan days 40%. */
export function CalendarDemo() {
  const [picked, setPicked] = useState<string | null>("2026-12-12");
  return (
    <BookingCalendar
      today="2026-12-01"
      availability={{ minDate: "2026-12-08", maxDate: "2026-12-27", unavailable: ["2026-12-11", "2026-12-19", "2026-12-20", "2026-12-25"] }}
      selected={picked}
      onSelect={setPicked}
    />
  );
}

/** A month with no open dates: the grid stays, plus the line and the next-month action. */
export function CalendarEmptyDemo() {
  const taken = Array.from({ length: 24 }, (_, i) => `2026-12-${String(i + 8).padStart(2, "0")}`);
  return (
    <BookingCalendar
      today="2026-12-01"
      availability={{ minDate: "2026-12-08", maxDate: "2027-02-28", unavailable: taken }}
      selected={null}
      onSelect={() => {}}
    />
  );
}

/** Admin calendar looks with sample data (completed cannot be made through the API):
 *  today 10 Dec, 3 and 8 completed, 12 booked, 15 and 19 held, 24 to 26 blocked, earlier days past. */
export function AdminCalendarLooksDemo() {
  const sample: Record<string, AdminDayLook> = {
    "2026-12-03": "completed",
    "2026-12-08": "completed",
    "2026-12-12": "booked",
    "2026-12-15": "held",
    "2026-12-19": "held",
    "2026-12-24": "blocked",
    "2026-12-25": "blocked",
    "2026-12-26": "blocked",
  };
  const today = "2026-12-10";
  return (
    <CalendarShell
      title="December 2026"
      onPrev={() => {}}
      onNext={() => {}}
      legend={
        <>
          <LegendItem look={ADMIN_DAY_LOOK.held}>Held (pending)</LegendItem>
          <LegendItem look={ADMIN_DAY_LOOK.booked}>Booked (approved)</LegendItem>
          <LegendItem look={ADMIN_DAY_LOOK.completed}>Completed</LegendItem>
          <LegendItem look={ADMIN_DAY_LOOK.blocked}>Blocked</LegendItem>
          <LegendItem look={ADMIN_DAY_LOOK.free}>Free</LegendItem>
          <LegendItem look="cal-today bg-ink-raised">Today</LegendItem>
        </>
      }
    >
      <MonthGrid
        year={2026}
        month={11}
        renderDay={({ ymd }) => {
          const look = sample[ymd] ?? (ymd < today ? "past" : "free");
          return (
            <div className={cn(dayCell, ADMIN_DAY_LOOK[look], ymd === today && "cal-today")}>
              <span aria-hidden>{Number(ymd.slice(8))}</span>
              <span className="sr-only">{look}</span>
            </div>
          );
        }}
      />
    </CalendarShell>
  );
}

// ─── Customer account states (sample props, nothing is sent) ────────────────

const SAMPLE_MINE: CateringBookingMine[] = [
  {
    reference: "BR-7K2M9Q", status: "PENDING", eventDate: "2026-12-12", serviceTime: "19:00", packageName: "The Feast",
    guests: 40, occasion: "Celebration", totalAmount: "1800.00", amountDue: "900.00", paymentChoice: "DEPOSIT" as const, depositPaidAt: null, balancePaidAt: null, receipts: [], payment: { bankName: "Maybank", accountName: "Bakar & Roast", accountNumber: "5123 4567 8901", qrUrl: null }, customerName: "Aisha", eventAddress: "Petaling Jaya", declineReason: null,
    holdExpiresAt: null, createdAt: "2026-11-10T08:00:00Z", canCancel: true, cancelDeadline: "2026-12-05",
    accessToken: "sample-token", customerPhone: "012 345 6789",
  },
  {
    reference: "BR-3H8D2L", status: "COMPLETED", eventDate: "2026-06-20", serviceTime: "12:30", packageName: "The Gathering",
    guests: 1, occasion: "House gathering", totalAmount: "1800.00", amountDue: "900.00", paymentChoice: "DEPOSIT" as const, depositPaidAt: null, balancePaidAt: null, receipts: [], payment: { bankName: "Maybank", accountName: "Bakar & Roast", accountNumber: "5123 4567 8901", qrUrl: null }, customerName: "Aisha", eventAddress: "Subang Jaya", declineReason: null,
    holdExpiresAt: null, createdAt: "2026-05-01T08:00:00Z", canCancel: false, cancelDeadline: "2026-06-13",
    accessToken: "sample-token-2", customerPhone: "012 345 6789",
  },
];

export function AccountDemos() {
  const [email, setEmail] = useState("aisha@example.com");
  const [code, setCode] = useState("12345");
  const noop = () => {};
  const states: [string, ReactNode][] = [
    ["Sign in", <EmailStep key="e" email={email} onEmail={setEmail} onSubmit={noop} />],
    ["Sign in: session ended, sending", <EmailStep key="e2" email={email} onEmail={setEmail} onSubmit={noop} ended busy />],
    [
      "Enter code: error, resend countdown",
      <CodeStep key="c" email={email} code={code} onCode={setCode} onSubmit={noop} onChangeEmail={noop} onResend={noop}
        resendLeft={42} error="Enter the 6 digits from the email." />,
    ],
    ["My bookings: two bookings", <BookingsView key="l" email={email} bookings={SAMPLE_MINE} onRetry={noop} onSignOut={noop} />],
    ["My bookings: loading", <BookingsView key="l2" email={email} bookings={null} onRetry={noop} onSignOut={noop} />],
    ["My bookings: empty", <BookingsView key="l3" email={email} bookings={[]} onRetry={noop} onSignOut={noop} />],
    ["My bookings: load failed", <BookingsView key="l4" email={email} bookings={null} failed onRetry={noop} onSignOut={noop} />],
    ["Checking the sign-in", <AccountLoading key="s" />],
  ];
  return (
    <div className="grid gap-12">
      {states.map(([title, node]) => (
        <div key={title} className="grid gap-4 border-t border-ink-line pt-6">
          <h2 className="type-admin-meta m-0 opacity-70">{`Account: ${title} (sample props)`}</h2>
          {node}
        </div>
      ))}
    </div>
  );
}
