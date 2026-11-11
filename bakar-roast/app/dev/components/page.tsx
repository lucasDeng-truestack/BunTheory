import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Band, Container } from "@/components/ui/band";
import { Button } from "@/components/ui/button";
import { Headline, Eyebrow } from "@/components/ui/headline";
import { PhotoSlot } from "@/components/ui/photo-slot";
import { Chip } from "@/components/ui/pill";
import { StatusChip } from "@/components/ui/status-chip";
import { Field, SelectField, TextareaField } from "@/components/ui/field";
import { Banner, EmptyState, Skeleton } from "@/components/ui/banner";
import { AccordionItem, TipCard } from "@/components/ui/accordion";
import { Stamp } from "@/components/ui/stamp";
import { Marquee } from "@/components/ui/marquee";
import { Stat } from "@/components/ui/stat";
import { Toggle } from "@/components/ui/toggle";
import { BookingProgress } from "@/components/ui/booking-progress";
import { CtaBand } from "@/components/ui/cta-band";
import { Magnetic } from "@/components/magnetic";
import type { CateringBookingStatus } from "@/lib/api";
import type { CateringBookingPublic } from "@/lib/api";
import { CalendarSkeleton } from "@/components/booking/calendar";
import { StickyBar, SummaryCard } from "@/components/booking/booking-summary";
import { StatusTimeline } from "@/components/booking/status-timeline";
import { AccountDemos, AdminCalendarLooksDemo, CalendarDemo, CalendarEmptyDemo, DialogDemo, LoadingButtonDemo, PillDemo, StepperDemo } from "./demos";

export const metadata: Metadata = {
  title: "Components",
  robots: { index: false },
};

const STATUSES: CateringBookingStatus[] = ["PENDING", "APPROVED", "COMPLETED", "DECLINED", "CANCELLED", "EXPIRED"];

// Sample bookings for the StatusTimeline states (not real data).
const SAMPLE: CateringBookingPublic = {
  reference: "BR-7K2M9Q",
  status: "PENDING",
  eventDate: "2026-12-12",
  serviceTime: "19:00",
  packageName: "The Feast",
  guests: 40,
  occasion: "Celebration",
  customerName: "Aisha Rahman",
  eventAddress: "12 Jalan SS 2/24, Petaling Jaya",
  declineReason: null,
  holdExpiresAt: "2026-11-13T04:00:00.000Z",
  createdAt: "2026-11-10T04:00:00.000Z",
  canCancel: true,
  cancelDeadline: "2026-12-09",
};
const SAMPLE_STATES: { title: string; booking: CateringBookingPublic }[] = [
  { title: "Pending", booking: SAMPLE },
  { title: "Approved", booking: { ...SAMPLE, status: "APPROVED", holdExpiresAt: null } },
  { title: "Approved, deadline passed (canCancel false)", booking: { ...SAMPLE, status: "APPROVED", holdExpiresAt: null, canCancel: false } },
  { title: "Declined, with a reason", booking: { ...SAMPLE, status: "DECLINED", canCancel: false, declineReason: "We are away that weekend." } },
  { title: "Cancelled", booking: { ...SAMPLE, status: "CANCELLED", canCancel: false } },
  { title: "Expired", booking: { ...SAMPLE, status: "EXPIRED", canCancel: false } },
  { title: "Completed", booking: { ...SAMPLE, status: "COMPLETED", canCancel: false, eventDate: "2026-10-24" } },
];

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="grid gap-4 border-t border-ink-line pt-6 [[data-tone=cream]_&]:border-ink/20">
      <h2 className="type-admin-meta m-0 opacity-70">{title}</h2>
      {children}
    </div>
  );
}

function Buttons() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Button href="/catering/book">Check a date</Button>
      <Button href="/story" variant="cream">
        Book this
      </Button>
      <Button href="/story" variant="ink">
        Read our story
      </Button>
      <Button variant="ghost">Keep my booking</Button>
      <Button loading loadingLabel="Sending">
        Send request
      </Button>
      <Button disabled>Send request</Button>
      <Button size="md">Header size</Button>
      <Button size="sm" variant="cream">
        Approve
      </Button>
      <Magnetic>
        <Button href="/catering/book">Magnetic</Button>
      </Magnetic>
    </div>
  );
}

export default function ComponentsPage() {
  return (
    <div className="pt-24">
      <Band tone="base" className="!pt-16">
        <Container className="grid gap-12">
          <Headline as="h1" size="hero" eyebrow="Wood-fire catering, Petaling Jaya">
            <span className="block">We bring</span>
            <span className="block">the fire</span>
            <span className="block">
              <em>to you.</em>
            </span>
          </Headline>
          <Block title="Headline sizes">
            <Headline size="xl" eyebrow="How it works">
              Four steps to a <em>full</em> table.
            </Headline>
            <Headline size="lg">
              Tell us about your <em>table.</em>
            </Headline>
            <Headline size="md">
              BR-<em>7K2M9Q</em>
            </Headline>
            <Headline size="sm">
              Pick a <em>date</em>
            </Headline>
            <Eyebrow>Standalone eyebrow</Eyebrow>
            <p className="type-lead m-0 max-w-[24em]">Wood fire, apple-wood smoke, served warm.</p>
            <p className="type-body-lg m-0 max-w-[60ch] text-cream-muted">
              Whole chickens over apple wood. Sides off the coals. Cooked at your place, served warm.
            </p>
          </Block>
          <Block title="Button">
            <Buttons />
            <LoadingButtonDemo />
          </Block>
          <Block title="PhotoSlot, Chip, Stamp">
            <div className="relative">
              <PhotoSlot note="Photo: whole chickens over the wood fire, embers glowing, shot wide at dusk." className="min-h-[clamp(300px,46vw,640px)]">
                <Chip>Now booking</Chip>
                <Chip tone="cream">Next open date: Sat 12 Dec</Chip>
              </PhotoSlot>
              <Stamp
                text="Fire • Feast • Family • Fire • Feast • Family • "
                label="Fire. Feast. Family. Check a date"
                href="/catering/book"
                className="absolute -bottom-12 right-[clamp(16px,4vw,56px)]"
              />
            </div>
            <div className="mt-16 grid gap-4 sm:grid-cols-3">
              <PhotoSlot radius="md" note="Photo: John carving at a buffet table." />
              <PhotoSlot radius="sm" note="Photo: guests at a long table, hands reaching." />
              <PhotoSlot
                radius="md"
                src="https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1000&q=80"
                note="Photo: grilled meat on the fire."
                sizes="(min-width: 640px) 33vw, 100vw"
              />
            </div>
            <div className="flex flex-wrap gap-6">
              <Stamp text="Now booking • Check a date • Now booking • " label="Now booking" tone="cream" size="lg" />
              <Stamp text="Fire • Feast • Family • Fire • Feast • Family • " label="Fire. Feast. Family." size="sm" />
            </div>
          </Block>
          <Block title="Pill (radio group, filters)">
            <PillDemo />
          </Block>
          <Block title="StatusChip">
            <div className="flex flex-wrap gap-3">
              {STATUSES.map((s) => (
                <StatusChip key={s} status={s} />
              ))}
            </div>
          </Block>
          <Block title="Field (md)">
            <div className="grid items-start gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Your name" placeholder="Full name" autoComplete="name" help="Empty" />
              <Field label="Event address" defaultValue="12 Jalan SS 2/24, Petaling Jaya" help="Filled" />
              <Field
                label="Phone"
                type="tel"
                inputMode="tel"
                defaultValue="012 345"
                error="Enter a full phone number so we can call you."
              />
              <Field label="Email" type="email" defaultValue="sending@example.com" disabled help="Locked while submitting" />
              <TextareaField label="Dietary notes" optional placeholder="Allergies, no beef, vegetarian guests" />
              <SelectField label="Serving time" defaultValue="19:00">
                <option value="12:00">12:00 pm</option>
                <option value="19:00">7:00 pm</option>
              </SelectField>
            </div>
          </Block>
          <Block title="Field (sm, admin) and Toggle">
            <div className="grid items-start gap-4 sm:grid-cols-3">
              <Field size="sm" label="Quote (RM)" inputMode="numeric" placeholder="0" />
              <Field size="sm" label="Deposit (RM)" inputMode="numeric" error="Enter an amount." />
            </div>
            <div className="flex flex-wrap gap-8">
              <Toggle label="Deposit paid" defaultChecked />
              <Toggle label="Balance paid" />
              <Toggle label="Show on site" onText="Shown" offText="Hidden" defaultChecked />
              <Toggle label="Disabled" disabled />
            </div>
          </Block>
          <Block title="Banner, EmptyState, Skeleton">
            <div className="grid max-w-[640px] gap-4">
              <Banner tone="error" title="That date was just taken. Pick another.">
                Your package and details are still here.
              </Banner>
              <Banner tone="error" title="Something went wrong on our side.">
                Nothing was sent. Try again, or <a className="font-semibold text-cream underline decoration-ember underline-offset-4" href="https://wa.me/60146856433">message us</a>.
              </Banner>
              <Banner tone="ok" title="Saved.">
                Your changes are live.
              </Banner>
              <EmptyState title="No pending requests." action={<Button size="sm" variant="cream">Refresh</Button>}>
                New requests land here the moment they come in.
              </EmptyState>
              <div aria-busy="true" aria-label="Loading" className="grid gap-3">
                <Skeleton className="h-5 w-2/5" />
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
              </div>
            </div>
          </Block>
          <Block title="Dialog">
            <DialogDemo />
          </Block>
        </Container>
      </Band>

      <Marquee />

      <Band tone="raised">
        <Container className="grid gap-12">
          <Headline eyebrow="Raised band">
            Good to <em>know.</em>
          </Headline>
          <Block title="Accordion and TipCard">
            <div className="grid items-start gap-6 md:grid-cols-[1fr_320px]">
              <div>
                <AccordionItem question="How long is my date held?" defaultOpen>
                  For 3 days while we confirm. We usually call or WhatsApp well before that.
                </AccordionItem>
                <AccordionItem question="When do I see a price?">On the call. We agree the menu and the quote together.</AccordionItem>
                <AccordionItem question="Can I cancel?">Yes, from your status page, until 7 days before the event.</AccordionItem>
              </div>
              <TipCard>
                <p>We take one event a day. Dates open 7 days ahead and up to 6 months out.</p>
              </TipCard>
            </div>
          </Block>
          <Block title="BookingProgress">
            <BookingProgress current={2} backLabel="Back to date" backHref="/dev/components" />
            <BookingProgress current={4} backLabel="Back to details" backHref="/dev/components" />
          </Block>
          <Block title="Calendar (booking step 1): every day state, keyboard: arrows, Page Up / Down, Home / End">
            <CalendarDemo />
          </Block>
          <Block title="Calendar: loading and a month with no open dates">
            <div className="grid items-start gap-6 lg:grid-cols-2">
              <CalendarSkeleton />
              <CalendarEmptyDemo />
            </div>
          </Block>
          <Block title="Calendar (admin): held, booked, completed, blocked, free, past, today">
            <AdminCalendarLooksDemo />
          </Block>
          <Block title="BookingSummary: side panel, phone sticky bar">
            <div className="grid items-start gap-6 lg:grid-cols-2">
              <SummaryCard
                title="Your table"
                note="Your date is held for 3 days while we confirm. No payment now."
                rows={[
                  { label: "Date", value: "Saturday 12 December 2026" },
                  { label: "Package", value: "The Feast" },
                  { label: "Guests", value: 40 },
                  { label: "Serving time", value: null },
                  { label: "Where", value: null },
                ]}
              />
              <StickyBar
                className="static p-0 lg:block"
                summary="Sat 12 Dec · The Feast · 40 guests"
                step="Step 2 of 4"
                action={<Button>Add details</Button>}
              />
            </div>
          </Block>
          <Block title="GuestStepper (switch package to see the clamp)">
            <StepperDemo />
          </Block>
          <Block title="Stat (sample figures)">
            <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
              <Stat value={120} unit="+" label="Events catered" />
              <Stat value={8400} unit="+" label="Guests fed" />
              <Stat value={4.9} decimals={1} unit="/5" label="Client rating" />
              <Stat value={2020} group={false} unit="since" label="Cooking over fire" />
            </div>
          </Block>
        </Container>
      </Band>

      <Band tone="base">
        <Container className="grid gap-12">
          <Headline eyebrow="Status page samples">
            Every <em>status.</em>
          </Headline>
          {SAMPLE_STATES.map((x, i) => (
            <Block key={x.title} title={`StatusTimeline: ${x.title} (sample props)`}>
              <StatusTimeline
                booking={x.booking}
                token="sample-token"
                headingId={`status-heading-${i}`}
                back={{ label: "Back to components", href: "/dev/components" }}
              />
            </Block>
          ))}
        </Container>
      </Band>

      <Band tone="base">
        <Container className="grid gap-12">
          <Headline eyebrow="Customer account samples">
            Every <em>sign-in</em> state.
          </Headline>
          <AccountDemos />
        </Container>
      </Band>

      <Band tone="cream">
        <Container className="grid gap-12">
          <Headline eyebrow="Cream band">
            Four steps to a <em>full</em> table.
          </Headline>
          <Block title="Buttons on cream">
            <div className="flex flex-wrap gap-4">
              <Button href="/story" variant="ink">
                Read our story
              </Button>
              <Button href="/catering/book">Check a date</Button>
            </div>
          </Block>
          <Block title="Stat on cream">
            <div className="grid grid-cols-2 gap-6">
              <Stat value={120} unit="+" label="Events catered" />
              <Stat value={2020} group={false} unit="since" label="Cooking over fire" />
            </div>
          </Block>
        </Container>
      </Band>

      <Band tone="soft">
        <Container className="grid gap-12">
          <Headline eyebrow="Soft band, CtaBand">
            Closing <em>band.</em>
          </Headline>
          <CtaBand />
          <CtaBand src="https://images.unsplash.com/photo-1475650522725-015d35677789?auto=format&fit=crop&w=1600&q=80" alt="Embers glowing at night." />
        </Container>
      </Band>
    </div>
  );
}
