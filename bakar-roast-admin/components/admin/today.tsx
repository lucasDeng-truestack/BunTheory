"use client";

import { useState } from "react";
import Link from "next/link";
import type { CateringBookingAdmin } from "@/lib/api";
import { adminListBookings } from "@/lib/catering-api";
import { bookingPayHeadline, greeting, holdEndsSoon, holdLeft, toCents, waitingSentence } from "@/lib/admin";
import { plural, formatTime12 } from "@/lib/booking";
import { addDaysYmd, formatLong, formatShort, klHour, klToday } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { Banner, EmptyState, Skeleton } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { useAdmin } from "@/components/admin/admin-context";
import { AdminPage, describeError, LoadError } from "@/components/admin/admin-page";
import { DateBlock } from "@/components/admin/date-block";
import { Tile } from "@/components/admin/tile";
import { BookingActionDialog, doneMessage } from "@/components/admin/booking-actions";
import { useAdminQuery } from "@/components/admin/use-admin-query";

const detailHref = (b: CateringBookingAdmin) => `/admin/requests/${b.id}?from=today`;

/** Today: fetches pending and approved, then hands them to the view. */
export function TodayScreen() {
  const { admin } = useAdmin();
  const q = useAdminQuery(
    (t) =>
      Promise.all([adminListBookings(t, { status: "PENDING", take: 200 }), adminListBookings(t, { status: "APPROVED", take: 200 })]),
    [],
  );
  const [approving, setApproving] = useState<CateringBookingAdmin | null>(null);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; title: string; help?: string } | null>(null);

  const now = new Date();
  const name = admin.displayName || null;
  const head = { title: greeting(klHour(now), name), eyebrow: formatLong(klToday(now)) };

  if (q.data === undefined) {
    return (
      <AdminPage title={head.title} eyebrow={head.eyebrow} titleOnPhone>
        {q.error ? <LoadError onRetry={q.reload} /> : <TodaySkeleton />}
      </AdminPage>
    );
  }

  const [pending, approved] = q.data;
  return (
    <>
      <TodayView
        pending={pending}
        approved={approved}
        now={now.getTime()}
        today={klToday(now)}
        title={head.title}
        eyebrow={head.eyebrow}
        notice={
          notice && (
            <Banner tone={notice.tone} title={notice.title}>
              {notice.help}
            </Banner>
          )
        }
        refreshError={q.error ? <LoadError onRetry={q.reload} /> : null}
        onApprove={(b) => {
          setApproving(b);
          setOpen(true);
        }}
      />
      <BookingActionDialog
        booking={approving}
        kind={open ? "approve" : null}
        onClose={() => setOpen(false)}
        onDone={(b, kind) => {
          setOpen(false);
          setNotice({ tone: "ok", title: doneMessage(kind, b) });
          void q.reload();
        }}
        onFailed={(err) => {
          setNotice({ tone: "error", ...describeError(err) });
          void q.reload();
        }}
      />
    </>
  );
}

/** The Today screen from data. Pure props, so sample states render without the API. */
export function TodayView({
  pending,
  approved,
  now,
  today,
  title,
  eyebrow,
  notice,
  refreshError,
  onApprove,
}: {
  pending: CateringBookingAdmin[];
  approved: CateringBookingAdmin[];
  now: number;
  today: string;
  title: string;
  eyebrow: string;
  notice?: React.ReactNode;
  refreshError?: React.ReactNode;
  onApprove: (b: CateringBookingAdmin) => void;
}) {
  const byHold = [...pending].sort((a, b) => (a.holdExpiresAt ?? "9").localeCompare(b.holdExpiresAt ?? "9"));
  const soon = pending.filter((b) => holdEndsSoon(b, now));
  const upcoming = approved.filter((b) => b.eventDate >= today).sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  const weekEnd = addDaysYmd(today, 7);
  const week = upcoming.filter((b) => b.eventDate < weekEnd);
  const owed = upcoming.filter((b) => (toCents(b.depositAmount) ?? 0) > 0 && !b.depositPaidAt && !b.balancePaidAt);

  return (
    <AdminPage title={title} eyebrow={eyebrow} lead={waitingSentence(pending.length, soon.length)} titleOnPhone>
      {notice}
      {refreshError}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        <Tile
          label="Waiting on you"
          value={pending.length}
          sub={pending.length ? "Open requests" : "All answered"}
          hot={pending.length > 0}
          href="/admin/requests?tab=pending"
        />
        <Tile
          label="Holds ending in 24h"
          value={soon.length}
          sub={soon.length ? "Call before they expire" : "Nothing urgent"}
          hot={soon.length > 0}
        />
        <Tile label="Events this week" value={week.length} sub={week[0] ? `Next: ${formatShort(week[0].eventDate)}` : "A quiet week"} />
        <Tile label="Deposits to collect" value={owed.length} sub={`of ${plural(upcoming.length, "upcoming booking")}`} />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <section className="grid min-w-0 content-start gap-4" aria-labelledby="needs-now">
          <SectionHead id="needs-now" title="Needs you now" link={{ href: "/admin/requests", label: "All requests" }} />
          {byHold.length ? (
            <ul className="m-0 grid list-none gap-2 p-0">
              {byHold.map((b) => {
                const hold = holdLeft(b, now);
                return (
                  <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded-card-sm bg-ink-raised p-3">
                    <Link href={detailHref(b)} className="flex min-w-0 flex-[1_1_220px] items-center gap-3 text-cream no-underline">
                      <DateBlock ymd={b.eventDate} />
                      <span className="grid min-w-0 gap-0.5">
                        <b className="text-base [overflow-wrap:anywhere]">{b.customerName}</b>
                        <span className="text-[13px] text-cream-muted [overflow-wrap:anywhere]">
                          {b.packageName} · {b.guests} pax · {formatTime12(b.serviceTime)}
                        </span>
                        <span className={cn("text-[13px] font-semibold", hold.urgent ? "text-ember" : "text-cream")}>
                          Hold: {hold.text.toLowerCase()}
                        </span>
                      </span>
                    </Link>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button size="sm" variant="cream" href={`tel:${b.customerPhone.replace(/\s/g, "")}`}>
                        Call
                      </Button>
                      <Button size="sm" variant="ember" onClick={() => onApprove(b)}>
                        Approve
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState title="All answered.">New requests show here the moment they come in.</EmptyState>
          )}
        </section>

        <section className="grid min-w-0 content-start gap-4" aria-labelledby="next-seven">
          <SectionHead id="next-seven" title="Next 7 days" link={{ href: "/admin/calendar", label: "Calendar" }} />
          {week.length ? (
            <ul className="m-0 grid list-none gap-2 p-0">
              {week.map((b) => {
                const pay = bookingPayHeadline(b);
                return (
                  <li key={b.id}>
                    <Link
                      href={detailHref(b)}
                      className="flex min-w-0 items-center gap-3 rounded-card-sm bg-ink-raised p-3 text-cream no-underline transition-shadow hover:shadow-[inset_0_0_0_1px_theme(colors.cream.faint)]"
                    >
                      <DateBlock ymd={b.eventDate} />
                      <span className="grid min-w-0 gap-0.5">
                        <b className="text-base [overflow-wrap:anywhere]">{b.customerName}</b>
                        <span className="text-[13px] text-cream-muted">
                          {formatTime12(b.serviceTime)} · {plural(b.guests, "guest")} · {b.packageName}
                        </span>
                        <span className="text-[13px] text-cream-muted [overflow-wrap:anywhere]">{b.eventAddress}</span>
                        <span className={cn("text-[13px] font-semibold", pay.hot ? "text-ember" : "text-cream")}>{pay.title}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState title="No events in the next 7 days.">Approved bookings appear here as they get close.</EmptyState>
          )}
        </section>
      </div>
    </AdminPage>
  );
}

function SectionHead({ id, title, link }: { id: string; title: string; link: { href: string; label: string } }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id={id} className="m-0 text-lg font-bold">
        {title}
      </h2>
      <Link href={link.href} className="inline-flex min-h-11 items-center font-semibold text-cream-muted underline">
        {link.label}
      </Link>
    </div>
  );
}

function TodaySkeleton() {
  return (
    <div aria-busy="true" className="grid gap-5">
      <Skeleton className="h-5 w-72 max-w-full" />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[118px]" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="grid gap-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-[88px]" />
            <Skeleton className="h-[88px]" />
          </div>
        ))}
      </div>
    </div>
  );
}
