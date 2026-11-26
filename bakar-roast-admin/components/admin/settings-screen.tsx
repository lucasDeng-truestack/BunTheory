"use client";

import { useRef, useState, type ReactNode } from "react";
import { Minus, Plus } from "lucide-react";
import { ApiError } from "@/lib/api";
import { adminGetSettings, adminUpdateSettings, type CateringAdminSettings, type CateringRules } from "@/lib/catering-api";
import { cutoffWarning, isEmailShape, RULES, ruleLines, ruleValue, type RuleKey } from "@/lib/admin";
import { klToday } from "@/lib/dates";
import { Banner, Skeleton } from "@/components/ui/banner";
import { Field, SelectField } from "@/components/ui/field";
import { Toggle } from "@/components/ui/toggle";
import { formatTime12, HALF_HOURS } from "@/lib/booking";
import { useAdmin } from "@/components/admin/admin-context";
import { AdminPage, describeError, LoadError } from "@/components/admin/admin-page";
import { useAdminQuery } from "@/components/admin/use-admin-query";
import { PhotoPicker, useUpload } from "@/components/admin/list-tools";
import { Button } from "@/components/ui/button";
import { imageSrc } from "@/lib/catering-api";

const QUESTIONS: [RuleKey, string][] = [
  ["cateringMinNoticeDays", "How much notice do you need?"],
  ["cateringBookingWindowMonths", "How far ahead can people book?"],
  ["cateringHoldExpiryDays", "How long do you hold a date?"],
  ["cateringCancelCutoffDays", "Until when can customers cancel online?"],
];

const SAVED = "Saved. The booking pages use these now.";
const EMAIL_HELP = "When this is empty, new requests go to the owner accounts' emails.";

type Notice = { title: string; help?: string } | null;

export function SettingsScreen() {
  const q = useAdminQuery(adminGetSettings, []);
  return (
    <AdminPage title="Settings" lead="Orders per day, how customers pay you, and the booking rules.">
      {q.data === undefined ? (
        q.error ? (
          <LoadError onRetry={q.reload} />
        ) : (
          <SettingsSkeleton />
        )
      ) : (
        <div className="grid items-start gap-5 xl:grid-cols-2">
          <OrdersAndPayment initial={q.data} />
          <div className="grid min-w-0 content-start gap-5">
            <SettingsForm initial={q.data} />
          </div>
        </div>
      )}
    </AdminPage>
  );
}

/**
 * The booking rules and the alert email. Nothing is sent while the owner is changing them: the
 * Save button sends everything together, so they can try values and read the plain-language
 * lines before anything reaches the booking pages. A failed save keeps what they entered.
 */
function SettingsForm({ initial }: { initial: CateringAdminSettings }) {
  const { run } = useAdmin();
  const pick = (s: CateringAdminSettings): CateringRules => ({
    cateringMinNoticeDays: s.cateringMinNoticeDays,
    cateringBookingWindowMonths: s.cateringBookingWindowMonths,
    cateringHoldExpiryDays: s.cateringHoldExpiryDays,
    cateringCancelCutoffDays: s.cateringCancelCutoffDays,
  });
  // What the server last confirmed, to tell whether anything is unsaved and to discard back to.
  const [confirmed, setConfirmed] = useState(() => ({
    rules: pick(initial),
    email: initial.cateringNotifyEmail ?? "",
  }));
  const [values, setValues] = useState<CateringRules>(confirmed.rules);
  const [email, setEmail] = useState(confirmed.email);
  const [emailError, setEmailError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const today = klToday();

  const dirty =
    email.trim().toLowerCase() !== confirmed.email.toLowerCase() ||
    QUESTIONS.some(([key]) => values[key] !== confirmed.rules[key]);

  const change = (key: RuleKey, value: number) => {
    const { min, max } = RULES[key];
    setValues((cur) => ({ ...cur, [key]: Math.min(max, Math.max(min, value)) }));
    setSaved(false);
    setNotice(null);
  };

  const discard = () => {
    setValues(confirmed.rules);
    setEmail(confirmed.email);
    setEmailError("");
    setNotice(null);
    setSaved(false);
  };

  const save = async () => {
    const mail = email.trim();
    if (mail && !isEmailShape(mail)) {
      setEmailError("Enter an email like you@example.com.");
      return;
    }
    setEmailError("");
    setBusy(true);
    setNotice(null);
    try {
      const res = await run((t) => adminUpdateSettings(t, { ...values, cateringNotifyEmail: mail }));
      const next = { rules: pick(res), email: res.cateringNotifyEmail ?? "" };
      setConfirmed(next);
      setValues(next.rules);
      setEmail(next.email);
      setSaved(true);
    } catch (err) {
      setSaved(false);
      setNotice(
        err instanceof ApiError && err.code === "INVALID_RULES"
          ? { title: err.message, help: "Nothing was saved. Make the notice shorter than the booking window, then save again." }
          : describeError(err),
      );
    } finally {
      setBusy(false);
    }
  };

  const lines = ruleLines(values, today);
  const warn = cutoffWarning(values);

  return (
    <>
      {warn && (
        <Banner tone="ok" title="Heads up: earliest bookings can barely be cancelled online." className="w-full">
          With {ruleValue(values.cateringMinNoticeDays, "day")} notice and a cutoff of{" "}
          {ruleValue(values.cateringCancelCutoffDays, "day")}, a customer who books the first open date can cancel online on the day they book at most. Set the cutoff lower than the
          notice to give them time.
        </Banner>
      )}
      <Block title="Booking rules">
        {QUESTIONS.map(([key, question], i) => (
          <div
            key={key}
            className={`flex flex-wrap items-center justify-between gap-x-5 gap-y-3 py-4 ${i ? "border-t border-ink-line" : "pt-1"}`}
          >
            <div className="grid min-w-0 flex-[1_1_260px] gap-1">
              <b className="text-[17px]">{question}</b>
              <small className="text-sm text-cream-muted">{lines[key]}</small>
            </div>
            <RuleStepper label={question} value={values[key]} rule={key} onChange={(v) => change(key, v)} />
          </div>
        ))}
      </Block>
      <Block title="Alerts">
        <Field
          size="sm"
          type="email"
          inputMode="email"
          autoComplete="email"
          label="Where should new requests be emailed?"
          optional
          maxLength={160}
          value={email}
          error={emailError}
          help={EMAIL_HELP}
          onChange={(e) => {
            setEmail(e.target.value);
            setEmailError("");
            setSaved(false);
            setNotice(null);
          }}
        />
      </Block>
      {notice && (
        <Banner tone="error" title={notice.title} className="w-full">
          {notice.help}
        </Banner>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button size="sm" onClick={() => void save()} loading={busy} loadingLabel="Saving" disabled={!dirty || busy}>
          Save
        </Button>
        {dirty && !busy && (
          <Button size="sm" variant="ghost" onClick={discard}>
            Discard changes
          </Button>
        )}
        <p role="status" className="m-0 text-cream-muted">
          {dirty ? "You have changes that are not saved yet." : saved ? SAVED : ""}
        </p>
      </div>
    </>
  );
}

/** Minus and plus (44px circles) with the value and unit between them, read out as it changes. */
function RuleStepper({
  label,
  value,
  rule,
  onChange,
}: {
  label: string;
  value: number;
  rule: RuleKey;
  onChange: (v: number) => void;
}) {
  const { min, max, unit } = RULES[rule];
  const less = useRef<HTMLButtonElement>(null);
  const more = useRef<HTMLButtonElement>(null);
  const btn =
    "grid h-11 w-11 place-items-center rounded-full bg-cream text-ink disabled:cursor-not-allowed disabled:bg-ink-line disabled:text-cream-faint";
  // At a limit the pressed button disables: keep focus on the stepper.
  const step = (d: -1 | 1) => {
    const next = value + d;
    onChange(next);
    if (next <= min) more.current?.focus();
    if (next >= max) less.current?.focus();
  };
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex h-14 flex-none items-center gap-2 rounded-full border border-cream-faint bg-ink p-[5px]"
    >
      <button ref={less} type="button" className={btn} aria-label={`Fewer ${unit}s`} disabled={value <= min} onClick={() => step(-1)}>
        <Minus aria-hidden size={18} strokeWidth={2} />
      </button>
      <output aria-live="polite" className="min-w-[112px] text-center text-[17px] font-bold tabular-nums">
        {ruleValue(value, unit)}
      </output>
      <button ref={more} type="button" className={btn} aria-label={`More ${unit}s`} disabled={value >= max} onClick={() => step(1)}>
        <Plus aria-hidden size={18} strokeWidth={2} />
      </button>
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid w-full content-start gap-2.5 rounded-card-sm bg-ink-raised p-4">
      <h2 className="type-admin-meta m-0 text-cream-faint">{title}</h2>
      {children}
    </section>
  );
}

function SettingsSkeleton() {
  return (
    <div aria-busy="true" className="grid w-full gap-4">
      <Skeleton className="h-[380px]" />
      <Skeleton className="h-32" />
    </div>
  );
}

/**
 * Orders per day and the payment details customers see on their booking page.
 * Saved together with one button, so half-typed bank details never reach customers.
 */
function OrdersAndPayment({ initial }: { initial: CateringAdminSettings }) {
  const { run } = useAdmin();
  const { upload, uploading } = useUpload();
  const [sets, setSets] = useState(initial.cateringDailySets ?? 5);
  const [limitOn, setLimitOn] = useState(initial.cateringDailyLimitOn ?? true);
  const [bank, setBank] = useState(initial.cateringBankName ?? "");
  const [holder, setHolder] = useState(initial.cateringBankAccountName ?? "");
  const [account, setAccount] = useState(initial.cateringBankAccountNumber ?? "");
  const [qr, setQr] = useState(initial.cateringPaymentQrUrl ?? "");
  const [start, setStart] = useState(initial.cateringDeliveryStart ?? "10:00");
  const [end, setEnd] = useState(initial.cateringDeliveryEnd ?? "21:00");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; title: string } | null>(null);

  const save = async () => {
    setBusy(true);
    setNotice(null);
    try {
      await run((t) =>
        adminUpdateSettings(t, {
          cateringDailySets: sets,
          cateringDailyLimitOn: limitOn,
          cateringBankName: bank,
          cateringBankAccountName: holder,
          cateringBankAccountNumber: account,
          cateringPaymentQrUrl: qr,
          cateringDeliveryStart: start,
          cateringDeliveryEnd: end,
        }),
      );
      setNotice({ tone: "ok", title: "Saved. New bookings and booking pages use these now." });
    } catch (err) {
      setNotice({ tone: "error", ...describeError(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="pay-h" className="grid w-full content-start gap-5 rounded-card-md bg-ink-raised p-4 sm:p-6">
      <h2 id="pay-h" className="m-0 text-lg font-bold">
        Orders and payment
      </h2>
      {notice && <Banner tone={notice.tone} title={notice.title} />}

      <div className="grid gap-2">
        <Toggle
          label="Limit how many orders (sets) you take a day"
          onText="On"
          offText="Off"
          checked={limitOn}
          onChange={(e) => setLimitOn(e.target.checked)}
        />
        {limitOn ? (
          <>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="One fewer"
                disabled={sets <= 1}
                onClick={() => setSets((n) => Math.max(1, n - 1))}
                className="grid h-11 w-11 place-items-center rounded-full shadow-[inset_0_0_0_1px_theme(colors.cream.faint)] disabled:opacity-40"
              >
                <Minus aria-hidden size={16} />
              </button>
              <span className="min-w-12 text-center text-2xl font-extrabold tabular-nums" aria-live="polite">
                {sets}
              </span>
              <button
                type="button"
                aria-label="One more"
                disabled={sets >= 200}
                onClick={() => setSets((n) => Math.min(200, n + 1))}
                className="grid h-11 w-11 place-items-center rounded-full shadow-[inset_0_0_0_1px_theme(colors.cream.faint)] disabled:opacity-40"
              >
                <Plus aria-hidden size={16} />
              </button>
            </div>
            <p className="type-small m-0 text-cream-muted">
              The usual for every day. A day is full once it reaches this. Change a single day on the Calendar.
            </p>
          </>
        ) : (
          <p className="type-small m-0 text-cream-muted">
            No daily limit: every open day keeps taking orders. A day you gave its own number on the
            Calendar still stops at that number, and closed days stay closed.
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <div className="grid max-w-[440px] grid-cols-2 items-start gap-3">
          <SelectField size="sm" label="Deliveries start" value={start} onChange={(e) => setStart(e.target.value)}>
            {HALF_HOURS.map((t) => (
              <option key={t} value={t}>
                {formatTime12(t)}
              </option>
            ))}
          </SelectField>
          <SelectField
            size="sm"
            label="Last delivery"
            value={end}
            error={end <= start ? "Must be after the start." : undefined}
            onChange={(e) => setEnd(e.target.value)}
          >
            {HALF_HOURS.map((t) => (
              <option key={t} value={t}>
                {formatTime12(t)}
              </option>
            ))}
          </SelectField>
        </div>
        <p className="type-small m-0 text-cream-muted">Customers pick a time in this window. Change it for some days on the Calendar.</p>
      </div>

      <div className="grid items-start gap-3 sm:grid-cols-2">
        <Field size="sm" label="Bank" placeholder="Maybank" maxLength={80} value={bank} onChange={(e) => setBank(e.target.value)} />
        <Field size="sm" label="Account name" maxLength={120} value={holder} onChange={(e) => setHolder(e.target.value)} />
        <Field
          size="sm"
          label="Account number"
          inputMode="numeric"
          maxLength={40}
          value={account}
          onChange={(e) => setAccount(e.target.value)}
        />
      </div>

      <div className="grid gap-2">
        <span className="text-[13px] font-semibold">DuitNow or bank QR</span>
        <div className="flex flex-wrap items-center gap-3">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element -- owner upload, any host
            <img src={imageSrc(qr)} alt="Your payment QR" className="h-28 w-28 rounded-card-sm bg-white object-contain p-1.5" />
          ) : (
            <span className="text-sm text-cream-muted">No QR yet.</span>
          )}
          <PhotoPicker
            uploading={uploading}
            onFile={async (file) => {
              const res = await upload(file);
              if ("url" in res) setQr(res.url);
              else setNotice({ tone: "error", title: res.error });
            }}
          >
            {qr ? "Change QR" : "Upload QR"}
          </PhotoPicker>
          {qr && (
            <Button size="sm" variant="ghost" onClick={() => setQr("")}>
              Remove
            </Button>
          )}
        </div>
        <p className="type-small m-0 text-cream-muted">Customers see these on their booking page, with the amount to pay.</p>
      </div>

      <div>
        <Button size="sm" onClick={() => void save()} loading={busy} loadingLabel="Saving" disabled={end <= start}>
          Save
        </Button>
      </div>
    </section>
  );
}
