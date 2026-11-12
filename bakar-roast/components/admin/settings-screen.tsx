"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Minus, Plus } from "lucide-react";
import { ApiError } from "@/lib/api";
import { adminGetSettings, adminUpdateSettings, type CateringAdminSettings, type CateringRules } from "@/lib/catering-api";
import { cutoffWarning, isEmailShape, RULES, ruleLines, ruleValue, type RuleKey } from "@/lib/admin";
import { klToday } from "@/lib/dates";
import { Banner, Skeleton } from "@/components/ui/banner";
import { Field } from "@/components/ui/field";
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

const DEBOUNCE_MS = 500;
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
        <>
          <OrdersAndPayment initial={q.data} />
          <SettingsForm initial={q.data} />
        </>
      )}
    </AdminPage>
  );
}

/**
 * The four rules save as they change: taps on one rule are debounced, only the latest value is
 * sent, and saves run one at a time. A failed save puts the rule back to the last value the
 * server confirmed. The email saves when the owner leaves the field.
 */
function SettingsForm({ initial }: { initial: CateringAdminSettings }) {
  const { run } = useAdmin();
  const pick = (s: CateringAdminSettings): CateringRules => ({
    cateringMinNoticeDays: s.cateringMinNoticeDays,
    cateringBookingWindowMonths: s.cateringBookingWindowMonths,
    cateringHoldExpiryDays: s.cateringHoldExpiryDays,
    cateringCancelCutoffDays: s.cateringCancelCutoffDays,
  });
  const [values, setValues] = useState<CateringRules>(() => pick(initial));
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const confirmed = useRef<CateringAdminSettings>(initial);
  const latest = useRef<CateringRules>(pick(initial));
  const timers = useRef<Partial<Record<RuleKey, ReturnType<typeof setTimeout>>>>({});
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  // Saves still queued or in flight: while any exist, "same as confirmed" is not proof the server agrees.
  const pending = useRef(0);
  const today = klToday();

  // Leaving the page inside the debounce window still sends the last tap.
  const flush = useRef<() => void>(() => {});
  useEffect(() => () => flush.current(), []);

  /** One save at a time, so an older response never lands after a newer one. */
  const save = (body: Parameters<typeof adminUpdateSettings>[1]) => {
    pending.current++;
    const next = queue.current.then(async () => {
      try {
        confirmed.current = await run((t) => adminUpdateSettings(t, body));
        return true;
      } catch (err) {
        return err;
      } finally {
        pending.current--;
      }
    });
    queue.current = next;
    return next;
  };

  const sendRule = async (key: RuleKey) => {
    delete timers.current[key];
    const value = latest.current[key];
    if (value === confirmed.current[key] && pending.current === 0) return;
    const res = await save({ [key]: value });
    if (res === true) {
      // Saved, and no newer tap waiting: done.
      if (!timers.current[key]) setSaved(true);
      return;
    }
    // Failed: back to what the server has, and drop any tap still waiting on this rule.
    clearTimeout(timers.current[key]);
    delete timers.current[key];
    latest.current = { ...latest.current, [key]: confirmed.current[key] };
    setValues((v) => ({ ...v, [key]: confirmed.current[key] }));
    setSaved(false);
    setNotice(
      res instanceof ApiError && res.code === "INVALID_RULES"
        ? { title: res.message, help: "We put it back. Make the notice shorter than the booking window." }
        : describeError(res),
    );
  };

  const change = (key: RuleKey, value: number) => {
    const { min, max } = RULES[key];
    const v = Math.min(max, Math.max(min, value));
    latest.current = { ...latest.current, [key]: v };
    setValues((cur) => ({ ...cur, [key]: v }));
    setSaved(false);
    setNotice(null);
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => void sendRule(key), DEBOUNCE_MS);
  };

  flush.current = () =>
    (Object.keys(timers.current) as RuleKey[]).forEach((key) => {
      clearTimeout(timers.current[key]);
      void sendRule(key);
    });

  const lines = ruleLines(values, today);
  const warn = cutoffWarning(values);

  return (
    <>
      {warn && (
        <Banner tone="ok" title="Heads up: earliest bookings can barely be cancelled online." className="max-w-[760px]">
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
        <p role="status" className="m-0 min-h-5 text-cream-muted">
          {saved ? SAVED : ""}
        </p>
      </Block>
      {notice && (
        <Banner tone="error" title={notice.title} className="max-w-[760px]">
          {notice.help}
        </Banner>
      )}
      <Block title="Alerts">
        <EmailField initial={initial.cateringNotifyEmail ?? ""} save={save} />
      </Block>
    </>
  );
}

function EmailField({
  initial,
  save,
}: {
  initial: string;
  save: (body: { cateringNotifyEmail: string }) => Promise<unknown>;
}) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState("");
  const [help, setHelp] = useState(EMAIL_HELP);
  const [failed, setFailed] = useState<Notice>(null);
  const savedValue = useRef(initial);

  const onBlur = async () => {
    const v = value.trim();
    setFailed(null);
    if (v === savedValue.current) {
      setError("");
      return;
    }
    if (v && !isEmailShape(v)) {
      setError("Enter an email like you@example.com. Nothing was changed.");
      return;
    }
    setError("");
    // Compare later blurs with what was sent, not only what was confirmed, so a quick revert is still saved.
    const before = savedValue.current;
    savedValue.current = v.toLowerCase();
    const res = await save({ cateringNotifyEmail: v });
    if (res === true) {
      setValue((cur) => (cur.trim() === v ? v.toLowerCase() : cur));
      setHelp(v ? `Saved. Alerts now go to ${v.toLowerCase()}.` : `Saved. ${EMAIL_HELP}`);
    } else {
      savedValue.current = before;
      setValue(before);
      setHelp(EMAIL_HELP);
      setFailed(describeError(res));
    }
  };

  return (
    <div className="grid gap-3">
      <Field
        size="sm"
        type="email"
        inputMode="email"
        autoComplete="email"
        label="Where should new requests be emailed?"
        optional
        maxLength={160}
        value={value}
        error={error}
        help={help}
        onChange={(e) => {
          setValue(e.target.value);
          setHelp(EMAIL_HELP);
        }}
        onBlur={onBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
      {failed && (
        <Banner tone="error" title={failed.title}>
          {failed.help}
        </Banner>
      )}
    </div>
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
    <section className="grid max-w-[760px] content-start gap-2.5 rounded-card-sm bg-ink-raised p-4">
      <h2 className="type-admin-meta m-0 text-cream-faint">{title}</h2>
      {children}
    </section>
  );
}

function SettingsSkeleton() {
  return (
    <div aria-busy="true" className="grid max-w-[760px] gap-4">
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
  const [bank, setBank] = useState(initial.cateringBankName ?? "");
  const [holder, setHolder] = useState(initial.cateringBankAccountName ?? "");
  const [account, setAccount] = useState(initial.cateringBankAccountNumber ?? "");
  const [qr, setQr] = useState(initial.cateringPaymentQrUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; title: string } | null>(null);

  const save = async () => {
    setBusy(true);
    setNotice(null);
    try {
      await run((t) =>
        adminUpdateSettings(t, {
          cateringDailySets: sets,
          cateringBankName: bank,
          cateringBankAccountName: holder,
          cateringBankAccountNumber: account,
          cateringPaymentQrUrl: qr,
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
    <section aria-labelledby="pay-h" className="grid max-w-[720px] gap-5 rounded-card-md bg-ink-raised p-4 sm:p-6">
      <h2 id="pay-h" className="m-0 text-lg font-bold">
        Orders and payment
      </h2>
      {notice && <Banner tone={notice.tone} title={notice.title} />}

      <div className="grid gap-2">
        <span className="text-[13px] font-semibold">How many orders (sets) can you do a day?</span>
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
        <p className="type-small m-0 text-cream-muted">The usual for every day. Change a single day on the Calendar.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
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
        <Button size="sm" onClick={() => void save()} loading={busy} loadingLabel="Saving">
          Save
        </Button>
      </div>
    </section>
  );
}
