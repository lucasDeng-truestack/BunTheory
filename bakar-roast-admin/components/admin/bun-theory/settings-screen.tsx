"use client";

import { useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ApiError } from "@/lib/api";
import { adminUploadImage, imageSrc } from "@/lib/catering-api";
import {
  getBunTheorySettings,
  setOrderingEnabled,
  updateMaxOrders,
  updateMinimumDelivery,
  updateOutlet,
  updatePaymentQr,
  type BunTheorySettings,
} from "@/lib/bun-theory-api";
import {
  localUploadPath,
  parseSetting,
  QR_UPLOAD_ACCEPT,
  QR_UPLOAD_RULE,
  qrUploadProblem,
  sanitizeIntText,
  sanitizeMoneyText,
  settingText,
  type SettingBody,
  type SettingKey,
} from "@/lib/bun-theory";
import { Banner, Skeleton } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, TextareaField } from "@/components/ui/field";
import { Toggle } from "@/components/ui/toggle";
import { useAdmin } from "@/components/admin/admin-context";
import { AdminPage, describeError, LoadError } from "@/components/admin/admin-page";
import { useAdminQuery } from "@/components/admin/use-admin-query";
import { Block, type Notice } from "@/components/admin/bun-theory/order-parts";

/** A save's outcome: true, or the error. */
type Saved = true | unknown;
type Save = (call: (token: string) => Promise<BunTheorySettings>) => Promise<Saved>;

export function BunTheorySettingsScreen() {
  const q = useAdminQuery(getBunTheorySettings, []);
  return (
    <AdminPage title="Bun Theory settings" lead="Ordering, capacity, payment and the outlet. Each field saves when you leave it.">
      {q.data === undefined ? q.error ? <LoadError onRetry={q.reload} /> : <SettingsSkeleton /> : <SettingsForm initial={q.data} />}
    </AdminPage>
  );
}

/**
 * Every change saves on its own and the saves run one at a time, so an older response never
 * lands after a newer one. `confirmed` is the settings row from the last save the server
 * accepted. Each field remembers what it last sent (a newer value for the same field decides);
 * a failed save puts the field back to what the server has.
 */
function SettingsForm({ initial }: { initial: BunTheorySettings }) {
  const { run } = useAdmin();
  const confirmed = useRef<BunTheorySettings>(initial);
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const save: Save = (call) => {
    const next = queue.current.then(async () => {
      try {
        confirmed.current = await run(call);
        return true as const;
      } catch (err) {
        return err;
      }
    });
    queue.current = next;
    return next;
  };

  const field = (key: SettingKey, props: Omit<AutoFieldProps, "settingKey" | "confirmed" | "save">) => (
    <AutoField settingKey={key} confirmed={confirmed} save={save} {...props} />
  );

  return (
    <div className="grid max-w-[760px] gap-4">
      <Block title="Ordering">
        <OrderingToggle initial={initial.orderingEnabled} confirmed={confirmed} save={save} />
        <p className="m-0 text-[13px] text-cream-muted">
          Set time windows and limits in{" "}
          <Link href="/admin/bun-theory/batches" className="font-semibold text-cream underline">
            Batches
          </Link>
          , and what is on sale in{" "}
          <Link href="/admin/bun-theory/menu" className="font-semibold text-cream underline">
            Menu
          </Link>
          .
        </p>
        <div className="border-t border-ink-line pt-4">
          {field("minimumDeliveryAmount", {
            label: "Minimum order for delivery (RM)",
            optional: true,
            placeholder: "e.g. 15",
            help: "Empty means delivery at any cart total, where delivery is offered.",
            inputMode: "decimal",
            clean: sanitizeMoneyText,
            className: "max-w-[260px]",
          })}
        </div>
      </Block>

      <Block title="Kitchen capacity">
        {field("maxOrdersPerDay", {
          label: "Max orders per day",
          help: "The upper bound used with each batch's own limit.",
          inputMode: "numeric",
          clean: sanitizeIntText,
          className: "max-w-[260px]",
        })}
      </Block>

      <PaymentQr initial={initial.paymentQrUrl ?? ""} save={save} />

      <Block title="Outlet, fees and tax">
        <p className="m-0 text-[13px] text-cream-muted">
          Shown in the storefront header and used for checkout totals. Tax is included in the total shown (SST).
        </p>
        <div className="grid items-start gap-4 sm:grid-cols-2">
          {field("outletName", { label: "Outlet name", placeholder: "e.g. The Bun Theory", autoComplete: "organization" })}
          {field("prepTimeMinutes", {
            label: "Prep time (minutes)",
            optional: true,
            placeholder: "e.g. 30",
            inputMode: "numeric",
            clean: sanitizeIntText,
          })}
        </div>
        {field("outletAddress", { label: "Outlet address", placeholder: "Shown to pickup customers", multiline: true })}
        <div className="grid items-start gap-4 sm:grid-cols-3">
          {field("deliveryFee", { label: "Delivery fee (RM)", optional: true, placeholder: "0.00", inputMode: "decimal", clean: sanitizeMoneyText })}
          {field("processingFee", { label: "Processing fee (RM)", optional: true, placeholder: "0.00", inputMode: "decimal", clean: sanitizeMoneyText })}
          {field("taxRatePercent", {
            label: "Tax rate (%)",
            placeholder: "6",
            help: "Empty sets 6.",
            inputMode: "decimal",
            clean: sanitizeMoneyText,
          })}
        </div>
        {field("deliveryRadiusNote", {
          label: "Delivery radius note",
          optional: true,
          placeholder: "e.g. We deliver within 5 km of the outlet.",
        })}
      </Block>
    </div>
  );
}

/** Flip, save, and flip back if the save fails (the Toggle's own rule). */
function OrderingToggle({
  initial,
  confirmed,
  save,
}: {
  initial: boolean;
  confirmed: React.MutableRefObject<BunTheorySettings>;
  save: Save;
}) {
  const [on, setOn] = useState(initial);
  const [notice, setNotice] = useState<Notice>(null);
  const latest = useRef(initial);

  const flip = async (next: boolean) => {
    latest.current = next;
    setOn(next);
    setNotice(null);
    const res = await save((t) => setOrderingEnabled(t, next));
    // A newer flip is queued behind this one: let that one report.
    if (latest.current !== next) return;
    if (res === true) {
      setNotice(
        next
          ? { tone: "ok", title: "Orders are on.", help: "Customers can order while a batch is published and open." }
          : { tone: "ok", title: "All orders are paused.", help: "Customers cannot order until you turn this back on." },
      );
      return;
    }
    latest.current = confirmed.current.orderingEnabled;
    setOn(confirmed.current.orderingEnabled);
    setNotice({ tone: "error", ...describeError(res) });
  };

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2">
        <div className="grid min-w-0 flex-[1_1_260px] gap-1">
          <b className="text-[17px]">Take orders</b>
          <small className="text-sm text-cream-muted">
            {on ? "Open when a batch is published and open." : "Paused for everyone."}
          </small>
        </div>
        <Toggle label="Ordering" onText="On" offText="Paused" checked={on} onChange={(e) => void flip(e.target.checked)} />
      </div>
      {notice && (
        <Banner tone={notice.tone} title={notice.title}>
          {notice.help}
        </Banner>
      )}
    </div>
  );
}

type AutoFieldProps = {
  settingKey: SettingKey;
  confirmed: React.MutableRefObject<BunTheorySettings>;
  save: Save;
  label: string;
  help?: string;
  optional?: boolean;
  placeholder?: string;
  inputMode?: "numeric" | "decimal" | "text";
  autoComplete?: string;
  /** Applied as the owner types (digits only, money). */
  clean?: (v: string) => string;
  multiline?: boolean;
  className?: string;
};

/** A setting that saves when the owner leaves the field (Enter leaves a one-line field). */
function AutoField({
  settingKey,
  confirmed,
  save,
  label,
  help: baseHelp,
  optional,
  placeholder,
  inputMode,
  autoComplete,
  clean,
  multiline = false,
  className,
}: AutoFieldProps) {
  const start = settingText(settingKey, confirmed.current);
  const [value, setValue] = useState(start);
  const [error, setError] = useState("");
  const [help, setHelp] = useState(baseHelp);
  const [failed, setFailed] = useState<Notice>(null);
  // What was last sent (or loaded): later blurs compare with this, so a quick revert is still saved.
  const sent = useRef(start);

  const onBlur = async () => {
    setFailed(null);
    const parsed = parseSetting(settingKey, value);
    if ("error" in parsed) {
      setError(`${parsed.error} Nothing was changed.`);
      return;
    }
    setError("");
    if (parsed.text === sent.current) {
      setValue((cur) => (cur.trim() === value.trim() ? parsed.text : cur));
      return;
    }
    const mine = parsed.text;
    sent.current = mine;
    const res = await send(parsed.body);
    if (res === true) {
      setValue((cur) => (cur.trim() === value.trim() ? mine : cur));
      if (sent.current === mine) setHelp("Saved.");
      return;
    }
    // A newer value for this field is queued: it decides.
    if (sent.current !== mine) return;
    // Every earlier save has settled (they run in turn), so confirmed is what the server has.
    const back = settingText(settingKey, confirmed.current);
    sent.current = back;
    setValue(back);
    setHelp(baseHelp);
    setFailed({ tone: "error", ...describeError(res) });
  };

  const send = (body: SettingBody) =>
    save((t) =>
      settingKey === "maxOrdersPerDay"
        ? updateMaxOrders(t, body.maxOrdersPerDay as number)
        : settingKey === "minimumDeliveryAmount"
          ? updateMinimumDelivery(t, body.minimumDeliveryAmount ?? null)
          : updateOutlet(t, body),
    );

  const shared = {
    size: "sm" as const,
    label,
    optional,
    placeholder,
    value,
    error,
    help,
    onBlur,
    onFocus: () => setHelp(baseHelp),
  };

  return (
    <div className={className ? `grid gap-3 ${className}` : "grid gap-3"}>
      {multiline ? (
        <TextareaField {...shared} rows={2} maxLength={500} onChange={(e) => setValue(e.target.value)} />
      ) : (
        <Field
          {...shared}
          type="text"
          inputMode={inputMode}
          autoComplete={autoComplete ?? "off"}
          maxLength={200}
          onChange={(e) => setValue(clean ? clean(e.target.value) : e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
      )}
      {failed && (
        <Banner tone="error" title={failed.title}>
          {failed.help}
        </Banner>
      )}
    </div>
  );
}

/** The transfer QR shown when customers choose Pay now. Saves as soon as a file is picked. */
function PaymentQr({ initial, save }: { initial: string; save: Save }) {
  const { run } = useAdmin();
  const [url, setUrl] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const input = useRef<HTMLInputElement>(null);
  const src = imageSrc(localUploadPath(url));

  const onFile = async (file: File) => {
    setNotice(null);
    const problem = qrUploadProblem(file);
    if (problem) {
      setNotice({ tone: "error", title: problem });
      return;
    }
    setUploading(true);
    try {
      let uploaded: string;
      try {
        uploaded = (await run((t) => adminUploadImage(t, file))).url;
      } catch (err) {
        // A 400 is the file; anything else (role, server, network) says so in its own words.
        setNotice(
          err instanceof ApiError && err.status === 400
            ? { tone: "error", title: `That file did not upload. ${QR_UPLOAD_RULE}` }
            : { tone: "error", ...describeError(err) },
        );
        return;
      }
      const res = await save((t) => updatePaymentQr(t, uploaded));
      if (res === true) {
        setUrl(uploaded);
        setNotice({ tone: "ok", title: "Payment QR saved.", help: "Checkout shows it now." });
      } else {
        setNotice({ tone: "error", ...describeError(res) });
      }
    } finally {
      setUploading(false);
    }
  };

  const remove = async () => {
    setRemoving(true);
    setNotice(null);
    const res = await save((t) => updatePaymentQr(t, ""));
    setRemoving(false);
    setConfirmRemove(false);
    if (res === true) {
      setUrl("");
      setNotice({ tone: "ok", title: "Payment QR removed.", help: "Checkout falls back to the default QR." });
    } else {
      setNotice({ tone: "error", ...describeError(res) });
    }
  };

  return (
    <Block title="Payment QR">
      <p className="m-0 text-[13px] text-cream-muted">Shown when customers choose Pay now at checkout.</p>
      <div className="flex flex-wrap items-start gap-4">
        <QrFrame>
          {src ? (
            <Image src={src} alt="Payment QR" fill unoptimized sizes="200px" className="object-contain p-3" />
          ) : (
            <span className="px-4 text-center text-sm text-ink">No QR uploaded yet.</span>
          )}
        </QrFrame>
        <div className="grid min-w-0 flex-[1_1_200px] content-start gap-3">
          <input
            ref={input}
            type="file"
            accept={QR_UPLOAD_ACCEPT}
            tabIndex={-1}
            aria-hidden
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void onFile(file);
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="cream"
              loading={uploading}
              loadingLabel="Uploading"
              aria-describedby="qr-rule"
              onClick={() => {
                if (!uploading) input.current?.click();
              }}
            >
              {url ? "Replace QR" : "Upload QR"}
            </Button>
            {url && (
              <Button size="sm" variant="ghost" disabled={uploading} onClick={() => setConfirmRemove(true)}>
                Remove
              </Button>
            )}
          </div>
          <p id="qr-rule" className="m-0 text-[13px] text-cream-muted">
            {QR_UPLOAD_RULE} It saves as soon as you pick it.
          </p>
        </div>
      </div>
      {notice && (
        <Banner tone={notice.tone} title={notice.title}>
          {notice.help}
        </Banner>
      )}
      <Dialog
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        title="Remove the QR?"
        description="Checkout falls back to the default QR until you upload a new one."
        confirmLabel="Yes, remove it"
        cancelLabel="Keep it"
        onConfirm={() => void remove()}
        confirmLoading={removing}
        confirmLoadingLabel="Removing"
      />
    </Block>
  );
}

/** A cream square so a dark QR scans and reads on the ink admin. */
function QrFrame({ children }: { children: ReactNode }) {
  return <div className="relative grid aspect-square w-[200px] flex-none place-items-center overflow-hidden rounded-card-sm bg-cream">{children}</div>;
}

function SettingsSkeleton() {
  return (
    <div aria-busy="true" className="grid max-w-[760px] gap-4">
      <Skeleton className="h-[220px]" />
      <Skeleton className="h-28" />
      <Skeleton className="h-[260px]" />
      <Skeleton className="h-[360px]" />
    </div>
  );
}
