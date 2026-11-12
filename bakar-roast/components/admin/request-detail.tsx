"use client";

import { imageSrc } from "@/lib/catering-api";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ApiError, type CateringBookingAdmin } from "@/lib/api";
import { adminGetBooking, adminUpdateBooking } from "@/lib/catering-api";
import {
  activityLog,
  amountsError,
  centsToAmount,
  firstName,
  holdLeft,
  nextStep,
  payHeadline,
  toCents,
  waNumber,
} from "@/lib/admin";
import { formatTime12, plural } from "@/lib/booking";
import { formatLong, formatStamp } from "@/lib/dates";
import { adminCopy } from "@/lib/content";
import { cn } from "@/lib/utils";
import { Banner, EmptyState, Skeleton } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Field, TextareaField } from "@/components/ui/field";
import { StatusChip } from "@/components/ui/status-chip";
import { Toggle } from "@/components/ui/toggle";
import { useAdmin, useAdminTopBar } from "@/components/admin/admin-context";
import { ADMIN_TITLE, AdminActionBar, describeError, LoadError } from "@/components/admin/admin-page";
import { DateBlock } from "@/components/admin/date-block";
import {
  ACTION_LABEL,
  actionsFor,
  BookingActionDialog,
  canCompleteYet,
  doneMessage,
  type BookingAction,
} from "@/components/admin/booking-actions";
import { useAdminQuery } from "@/components/admin/use-admin-query";

type Notice = { tone: "ok" | "error"; title: string; help?: string } | null;

/** Back goes to the list or calendar view the owner came from (its query rides along), or to Today. */
function useBack() {
  const params = useSearchParams();
  const from = params.get("from");
  if (from === "today") return { href: "/admin", label: "Today" };
  const rest = new URLSearchParams(params);
  rest.delete("from");
  const qs = rest.toString();
  if (from === "calendar") return { href: `/admin/calendar${qs ? `?${qs}` : ""}`, label: "Calendar" };
  return { href: `/admin/requests${qs ? `?${qs}` : ""}`, label: "All requests" };
}

export function RequestDetailScreen({ id }: { id: string }) {
  const back = useBack();
  const q = useAdminQuery((t) => adminGetBooking(t, id), [id]);
  const notFound = q.error instanceof ApiError && q.error.status === 404;
  useAdminTopBar({ title: q.data && !notFound ? q.data.reference : "Request", back: back.href, status: notFound ? undefined : q.data?.status });

  if (notFound) {
    return (
      <div className="grid animate-fade-in gap-5">
        <h1 className={cn(ADMIN_TITLE, "max-lg:sr-only")}>Request</h1>
        <EmptyState
          title="We could not find that request."
          action={
            <Button size="sm" variant="cream" href="/admin/requests">
              All requests
            </Button>
          }
        >
          The link may be old or mistyped.
        </EmptyState>
      </div>
    );
  }
  if (q.data === undefined) return q.error ? <LoadError onRetry={q.reload} /> : <DetailSkeleton />;
  return (
    <RequestDetailView
      booking={q.data}
      back={back}
      onUpdated={(b) => q.setData(b)}
      onReload={() => void q.reload()}
      reloadError={q.error ? <LoadError onRetry={q.reload} /> : null}
    />
  );
}

export function RequestDetailView({
  booking: b,
  back,
  onUpdated,
  onReload,
  reloadError,
}: {
  booking: CateringBookingAdmin;
  back: { href: string; label: string };
  onUpdated: (b: CateringBookingAdmin) => void;
  onReload: () => void;
  reloadError?: ReactNode;
}) {
  const { run } = useAdmin();
  const [notice, setNotice] = useState<Notice>(null);
  const [dialog, setDialog] = useState<BookingAction | null>(null);
  const hintId = useId();

  const acts = actionsFor(b);
  const completeLocked = b.status === "APPROVED" && !canCompleteYet(b);
  const hold = holdLeft(b);

  /** One place for failed writes: role, race, gone, or a plain save failure. */
  const failed = (err: unknown) => {
    if (err instanceof ApiError && (err.code === "INVALID_STATE" || err.status === 404)) onReload();
    setNotice({ tone: "error", ...describeError(err) });
  };

  // Saves run one at a time, so an older response can never land after a newer one.
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const save = (body: Parameters<typeof adminUpdateBooking>[2]) => {
    const next = queue.current.then(async () => {
      try {
        onUpdated(await run((t) => adminUpdateBooking(t, b.id, body)));
        return true;
      } catch (err) {
        failed(err);
        return false;
      }
    });
    queue.current = next;
    return next;
  };

  const actionButton = (kind: BookingAction, bar: boolean) => (
    <Button
      key={kind}
      size="sm"
      variant={kind === "approve" || kind === "complete" ? "ember" : "ghost"}
      disabled={kind === "complete" && completeLocked}
      aria-describedby={kind === "complete" && completeLocked ? hintId : undefined}
      onClick={() => {
        setNotice(null);
        setDialog(kind);
      }}
      className={cn(bar && "h-[52px] flex-1 px-3", bar && (kind === "approve" || kind === "complete") && "flex-[2]")}
    >
      {ACTION_LABEL[kind]}
    </Button>
  );

  const wa = `https://wa.me/${waNumber(b.customerPhone)}?text=${encodeURIComponent(
    adminCopy.waMessage(firstName(b.customerName), b.reference, formatLong(b.eventDate)),
  )}`;

  return (
    <div className="grid animate-fade-in content-start gap-5">
      <Link
        href={back.href}
        className="inline-flex min-h-11 w-fit items-center gap-2 font-semibold text-cream-muted no-underline hover:text-cream max-lg:hidden"
      >
        <ArrowLeft aria-hidden size={16} strokeWidth={1.75} />
        {back.label}
      </Link>

      <div className="flex items-center gap-4">
        <DateBlock ymd={b.eventDate} size="lg" className="bg-ink-raised" />
        <div className="min-w-0">
          <h1 className={cn(ADMIN_TITLE, "max-lg:text-[30px] [overflow-wrap:anywhere]")}>{b.customerName}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            <span className="font-bold tracking-[0.04em]">{b.reference}</span>
            <StatusChip status={b.status} />
            {b.status === "PENDING" && (
              <span className={cn("font-semibold", hold.urgent && "font-bold text-ember")}>Hold: {hold.text.toLowerCase()}</span>
            )}
          </div>
        </div>
      </div>

      {reloadError}
      {notice && (
        <Banner tone={notice.tone} title={notice.title}>
          {notice.help}
        </Banner>
      )}

      <div
        className={cn(
          "grid gap-3 rounded-card-sm bg-ink-raised p-4 text-base",
          acts.length ? "shadow-[inset_0_0_0_1.5px_theme(colors.ember.DEFAULT)]" : "text-cream-muted",
        )}
      >
        <b>{nextStep(b)}</b>
        {completeLocked && (
          <p id={hintId} className="type-admin-body m-0 text-cream-muted">
            You can mark it completed on or after {formatLong(b.eventDate)}.
          </p>
        )}
        {acts.length > 0 && <div className="flex flex-wrap gap-2 max-lg:hidden">{acts.map((k) => actionButton(k, false))}</div>}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid min-w-0 content-start gap-4">
          <Block title="Customer">
            <p className="m-0 [overflow-wrap:anywhere]">
              <span className="select-all">{b.customerPhone}</span>
              <br />
              <span className="select-all">{b.customerEmail}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="cream" href={`tel:${b.customerPhone.replace(/\s/g, "")}`}>
                Call
              </Button>
              <Button size="sm" variant="ghost" href={wa} target="_blank" rel="noopener noreferrer">
                WhatsApp
              </Button>
              <Button size="sm" variant="ghost" href={`mailto:${b.customerEmail}?subject=${encodeURIComponent(`Your booking ${b.reference}`)}`}>
                Email
              </Button>
            </div>
          </Block>
          <Block title="Delivery">
            <Rows
              rows={[
                ["Date", formatLong(b.eventDate)],
                ["Delivery time", formatTime12(b.serviceTime)],
                ["Deliver to", b.eventAddress],
                ["Occasion", b.occasion],
                ["Dietary", b.dietaryNotes],
                ["Notes", b.notes],
              ]}
            />
          </Block>
          <Block title="Package">
            <Rows
              rows={[
                ["Package", b.packageName],
                ["Guests", `${b.guests} pax`],
                ["Customer chose", b.paymentChoice === "FULL" ? "Pay in full" : "Pay half first"],
                ["Reason", b.status === "DECLINED" ? b.declineReason : null],
              ]}
            />
          </Block>
          <NotesBlock booking={b} save={save} />
        </div>
        <div className="grid min-w-0 content-start gap-4">
          <ReceiptsBlock booking={b} />
          <PaymentBlock booking={b} save={save} onError={(n) => setNotice(n)} />
          <Block title="Activity">
            <ol className="m-0 grid list-none gap-2.5 p-0">
              {activityLog(b).map((item, i) => (
                <li key={item.label + item.at} className="grid grid-cols-[10px_1fr] items-start gap-2.5">
                  <span aria-hidden className={cn("mt-1.5 h-2 w-2 rounded-full", i === 0 ? "bg-ember" : "bg-cream-faint")} />
                  <span className="[overflow-wrap:anywhere]">
                    {item.label}
                    <small className="block text-cream-muted">{formatStamp(item.at)}</small>
                  </span>
                </li>
              ))}
            </ol>
          </Block>
        </div>
      </div>

      {acts.length > 0 && <AdminActionBar>{acts.map((k) => actionButton(k, true))}</AdminActionBar>}

      <BookingActionDialog
        booking={b}
        kind={dialog}
        onClose={() => setDialog(null)}
        onDone={(updated, kind) => {
          setDialog(null);
          onUpdated(updated);
          setNotice({ tone: "ok", title: doneMessage(kind, updated) });
        }}
        onFailed={failed}
      />
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid content-start gap-2.5 rounded-card-sm bg-ink-raised p-4">
      <h2 className="type-admin-meta m-0 text-cream-faint">{title}</h2>
      {children}
    </section>
  );
}

function Rows({ rows }: { rows: [string, string | null][] }) {
  return (
    <dl className="m-0 grid">
      {rows
        .filter(([, v]) => v)
        .map(([k, v], i) => (
          <div
            key={k}
            className={cn("grid grid-cols-[96px_minmax(0,1fr)] gap-3 py-2", i === 0 ? "pt-0" : "border-t border-ink-line")}
          >
            <dt className="text-cream-muted">{k}</dt>
            <dd className="m-0 font-semibold [overflow-wrap:anywhere]">{v}</dd>
          </div>
        ))}
    </dl>
  );
}

type Save = (body: Parameters<typeof adminUpdateBooking>[2]) => Promise<boolean>;

const amountText = (v: string | null) => {
  const c = toCents(v);
  return c === null || Number.isNaN(c) ? "" : String(c / 100);
};

/** Quote and deposit save when the owner leaves a field; the toggles save at once. */
function PaymentBlock({ booking: b, save, onError }: { booking: CateringBookingAdmin; save: Save; onError: (n: Notice) => void }) {
  const [quote, setQuote] = useState(amountText(b.quoteAmount));
  const [deposit, setDeposit] = useState(amountText(b.depositAmount));
  const [errs, setErrs] = useState({ quote: "", deposit: "" });
  const [flip, setFlip] = useState<{ depositPaid?: boolean; balancePaid?: boolean }>({});
  const [saved, setSaved] = useState(false);
  // A field the owner has typed in is theirs until it saves: server updates never overwrite it.
  const dirty = useRef({ quote: false, deposit: false });
  // While a save is in flight, "same as the booking" is not proof the server agrees: always send.
  const busy = useRef(0);

  useEffect(() => {
    if (!dirty.current.quote) setQuote(amountText(b.quoteAmount));
  }, [b.quoteAmount]);
  useEffect(() => {
    if (!dirty.current.deposit) setDeposit(amountText(b.depositAmount));
  }, [b.depositAmount]);

  const depositPaid = flip.depositPaid ?? !!b.depositPaidAt;
  const balancePaid = flip.balancePaid ?? !!b.balancePaidAt;
  const head = payHeadline({ quote: toCents(quote), deposit: toCents(deposit), depositPaid, balancePaid });

  const saveAmounts = async () => {
    const q = toCents(quote);
    const d = toCents(deposit);
    const e = amountsError(q, d);
    setErrs(e);
    if (e.quote || e.deposit) return;
    // Send only what changed, so saving one field never touches the other.
    const body: { quoteAmount?: number | null; depositAmount?: number | null } = {};
    const force = busy.current > 0;
    if (force || q !== toCents(b.quoteAmount)) body.quoteAmount = q === null ? null : centsToAmount(q);
    if (force || d !== toCents(b.depositAmount)) body.depositAmount = d === null ? null : centsToAmount(d);
    if (!Object.keys(body).length) {
      dirty.current = { quote: false, deposit: false };
      return;
    }
    const sent = { quote, deposit };
    setSaved(false);
    busy.current++;
    const ok = await save(body).finally(() => busy.current--);
    if (ok) {
      // Still showing what was sent: back in sync with the server.
      setQuote((cur) => {
        if (cur === sent.quote) dirty.current.quote = false;
        return cur;
      });
      setDeposit((cur) => {
        if (cur === sent.deposit) dirty.current.deposit = false;
        return cur;
      });
    }
    setSaved(ok);
  };

  const toggle = async (key: "depositPaid" | "balancePaid", on: boolean) => {
    setSaved(false);
    onError(null);
    setFlip((f) => ({ ...f, [key]: on }));
    const ok = await save({ [key]: on });
    // On success the booking carries the new stamp; on failure this flips it back.
    setFlip((f) => ({ ...f, [key]: undefined }));
    setSaved(ok);
  };

  return (
    <Block title="Payment">
      <div className="grid gap-0.5 rounded-[12px] bg-ink px-3.5 py-3" aria-live="polite">
        <b
          className={cn(
            "font-display text-[28px] font-extrabold uppercase leading-none [font-stretch:80%]",
            head.hot && "text-ember",
          )}
        >
          {head.title}
        </b>
        <small className="text-[13px] text-cream-muted">{head.sub}</small>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field
          size="sm"
          label="Quote, RM"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          value={quote}
          error={errs.quote}
          onChange={(e) => {
            dirty.current.quote = true;
            setQuote(e.target.value);
            setSaved(false);
          }}
          onBlur={saveAmounts}
        />
        <Field
          size="sm"
          label="Deposit, RM"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          value={deposit}
          error={errs.deposit}
          onChange={(e) => {
            dirty.current.deposit = true;
            setDeposit(e.target.value);
            setSaved(false);
          }}
          onBlur={saveAmounts}
        />
      </div>
      <div className="grid">
        <Toggle label="Deposit paid" checked={depositPaid} onChange={(e) => void toggle("depositPaid", e.target.checked)} />
        <Toggle label="Balance paid" checked={balancePaid} onChange={(e) => void toggle("balancePaid", e.target.checked)} />
      </div>
      <p role="status" className="m-0 min-h-5 text-cream-muted">
        {saved ? "Saved" : ""}
      </p>
    </Block>
  );
}

function NotesBlock({ booking: b, save }: { booking: CateringBookingAdmin; save: Save }) {
  const [text, setText] = useState(b.adminNotes ?? "");
  const [saved, setSaved] = useState(false);
  const dirty = useRef(false);
  const busy = useRef(0);
  useEffect(() => {
    if (!dirty.current) setText(b.adminNotes ?? "");
  }, [b.adminNotes]);

  return (
    <Block title="Private notes">
      <TextareaField
        size="sm"
        label={<span className="sr-only">Private notes</span>}
        help={saved ? "Saved" : "Only you see this. Saves when you leave the field."}
        placeholder="Only you see this"
        maxLength={2000}
        value={text}
        onChange={(e) => {
          dirty.current = true;
          setText(e.target.value);
          setSaved(false);
        }}
        onBlur={async () => {
          if (busy.current === 0 && text.trim() === (b.adminNotes ?? "").trim()) {
            dirty.current = false;
            return;
          }
          const sent = text;
          busy.current++;
          const ok = await save({ adminNotes: sent }).finally(() => busy.current--);
          setText((cur) => {
            if (ok && cur === sent) dirty.current = false;
            return cur;
          });
          setSaved(ok);
        }}
        className="[&>label]:contents"
      />
    </Block>
  );
}

function DetailSkeleton() {
  return (
    <div aria-busy="true" className="grid gap-5">
      <div className="flex items-center gap-4">
        <Skeleton className="h-[76px] w-[68px] rounded-[14px]" />
        <div className="grid flex-1 gap-2">
          <Skeleton className="h-10 w-2/3 max-w-sm" />
          <Skeleton className="h-6 w-48" />
        </div>
      </div>
      <Skeleton className="h-24" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-4">
          <Skeleton className="h-36" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}

/** Payment receipts the customer uploaded from their booking page. */
function ReceiptsBlock({ booking: b }: { booking: CateringBookingAdmin }) {
  return (
    <Block title="Receipts">
      {b.receipts.length ? (
        <ul className="m-0 grid list-none gap-2 p-0">
          {b.receipts.map((r) => {
            const src = imageSrc(r.fileUrl);
            const isPdf = /\.pdf($|\?)/i.test(r.fileUrl);
            return (
              <li key={r.id} className="grid gap-2">
                <a href={src} target="_blank" rel="noopener noreferrer" className="block">
                  {isPdf ? (
                    <span className="inline-flex min-h-11 items-center font-semibold underline decoration-ember underline-offset-4">
                      Open PDF receipt
                    </span>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element -- customer upload, any host
                    <img src={src} alt={`Receipt from ${b.customerName}`} className="max-h-72 w-full rounded-card-sm bg-white object-contain" />
                  )}
                </a>
                <small className="text-cream-muted">Uploaded {formatStamp(r.createdAt)}</small>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="m-0 text-sm text-cream-muted">No receipt yet. The customer uploads it on their booking page.</p>
      )}
    </Block>
  );
}
