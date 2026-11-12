"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Check, FileText, Smartphone, Upload } from "lucide-react";
import { ApiError, type CateringBookingPublic } from "@/lib/api";
import { getBooking, imageSrc, uploadReceipt } from "@/lib/catering-api";
import { formatRm } from "@/lib/booking";
import { formatStamp } from "@/lib/dates";
import { waLink } from "@/lib/content";
import { cn } from "@/lib/utils";
import { Banner } from "@/components/ui/banner";

const POLL_MS = 6000;
const POLL_FOR_MS = 30 * 60 * 1000;

const sen = (v: string | null) => (v == null ? null : Math.round(Number(v) * 100));

/**
 * How to pay, on the customer's booking page: the amount, the bank details and DuitNow QR,
 * and an upload box for the receipt.
 *
 * Desktop hand-off: people usually pay in their phone's banking app, so the receipt is on the
 * phone. On a wide screen the panel also shows a QR code of this same page with ?upload=1.
 * Scanning it opens the booking on the phone, they upload the screenshot there, and this page
 * checks every few seconds and shows "Receipt received" by itself.
 */
export function PaymentPanel({ booking: initial, token }: { booking: CateringBookingPublic; token: string }) {
  const [b, setB] = useState(initial);
  // The page refetched (after a cancel, say): take the newer booking.
  useEffect(() => setB(initial), [initial]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [fromPhone, setFromPhone] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const total = sen(b.totalAmount);
  const due = sen(b.amountDue);
  const rest = total != null && due != null ? total - due : null;
  // What to collect now: the first payment, or the rest once the first is in.
  const stage: "first" | "rest" | "paid" =
    !b.depositPaidAt ? "first" : b.paymentChoice === "DEPOSIT" && !b.balancePaidAt && rest && rest > 0 ? "rest" : "paid";
  const amountNow = stage === "first" ? due : stage === "rest" ? rest : null;
  const open = b.status === "PENDING" || b.status === "APPROVED";

  // The QR for the phone hand-off, and the phone side of it (?upload=1).
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("upload") === "1") {
      setFromPhone(true);
      box.current?.scrollIntoView({ block: "center" });
    }
    url.searchParams.set("upload", "1");
    QRCode.toDataURL(url.toString(), { margin: 1, width: 360 })
      .then(setQr)
      .catch(() => setQr(null));
  }, []);

  // Pick up a receipt sent from the phone.
  const count = b.receipts.length;
  useEffect(() => {
    if (!open || stage === "paid") return;
    const started = Date.now();
    const id = window.setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - started > POLL_FOR_MS) return window.clearInterval(id);
      try {
        const fresh = await getBooking(token);
        if (fresh.receipts.length !== count || fresh.status !== b.status) setB(fresh);
      } catch {}
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [token, count, open, stage, b.status]);

  if (!open || amountNow == null || stage === "paid") {
    if (stage === "paid" && open) {
      return (
        <p className="m-0 inline-flex items-center gap-2 font-semibold">
          <Check aria-hidden size={18} className="text-ember" /> Payment received. Thank you.
        </p>
      );
    }
    return null;
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      setB(await uploadReceipt(token, file));
    } catch (err) {
      setError(err instanceof ApiError && err.status < 500 ? err.message : "The upload did not go through. Try again.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  const p = b.payment;
  const hasBank = p.bankName || p.accountNumber || p.qrUrl;
  const sent = b.receipts.length > 0;
  const waText = `Hi Bakar & Roast, here is my payment for booking ${b.reference} (${formatRm(amountNow)}).`;

  return (
    <section aria-labelledby="pay-heading" className="grid gap-5 rounded-card-md bg-ink-raised p-5 sm:p-7">
      <div className="grid gap-1">
        <h2 id="pay-heading" className="display-sm m-0">
          {stage === "first" ? (b.paymentChoice === "FULL" ? "Pay in full" : "Pay half to hold it") : "Pay the rest"}
        </h2>
        <p className="m-0 text-cream-muted">
          <b className="text-2xl text-cream">{formatRm(amountNow)}</b>
          {total != null && stage === "first" && b.paymentChoice === "DEPOSIT" && (
            <> of {formatRm(total)}. The rest before delivery.</>
          )}
          {stage === "rest" && <> before delivery.</>}
        </p>
        <p className="type-small m-0 text-cream-muted">Put {b.reference} as the reference so we can match it.</p>
      </div>

      {hasBank ? (
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
          <dl className="m-0 grid gap-2">
            {p.bankName && <Row label="Bank" value={p.bankName} />}
            {p.accountName && <Row label="Account name" value={p.accountName} />}
            {p.accountNumber && <Row label="Account number" value={p.accountNumber} copy />}
          </dl>
          {p.qrUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- owner-uploaded QR, any host
            <img
              src={imageSrc(p.qrUrl)}
              alt="DuitNow QR to pay Bakar & Roast"
              className="h-44 w-44 rounded-card-sm bg-white object-contain p-2"
            />
          )}
        </div>
      ) : (
        <p className="m-0 text-cream-muted">We will send you the bank details on WhatsApp.</p>
      )}

      <div
        ref={box}
        className={cn(
          "grid gap-4 rounded-card-sm p-4 shadow-[inset_0_0_0_1.5px_theme(colors.ink.line)]",
          fromPhone && !sent && "shadow-[inset_0_0_0_2px_theme(colors.ember.DEFAULT)]",
        )}
      >
        {sent && (
          <ul className="m-0 grid list-none gap-1.5 p-0" aria-label="Receipts sent">
            {b.receipts.map((r) => (
              <li key={r.id} className="flex items-center gap-2 text-sm">
                <Check aria-hidden size={16} className="flex-none text-ember" />
                <span className="font-semibold">Receipt received</span>
                <span className="text-cream-muted">{formatStamp(r.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
        {sent && <p className="m-0 text-sm text-cream-muted">We will check it and confirm your booking.</p>}

        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
          <div className="grid justify-items-start gap-2">
            <label
              className={cn(
                "inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-full bg-ember px-6 font-semibold text-ink",
                busy && "pointer-events-none opacity-60",
              )}
            >
              <Upload aria-hidden size={18} />
              {busy ? "Uploading" : sent ? "Upload another" : "Upload receipt"}
              <input
                ref={input}
                type="file"
                accept="image/*,application/pdf"
                className="sr-only"
                disabled={busy}
                onChange={(e) => void onFile(e.target.files?.[0])}
              />
            </label>
            <span className="type-small inline-flex items-center gap-1.5 text-cream-muted">
              <FileText aria-hidden size={14} /> Screenshot, photo or PDF, up to 5 MB.
            </span>
          </div>

          {/* Desktop only: the receipt is usually on the phone. */}
          {qr && !fromPhone && (
            <div className="hidden items-center gap-4 md:flex">
              {/* eslint-disable-next-line @next/next/no-img-element -- generated data URL */}
              <img src={qr} alt="QR code that opens this booking on your phone" className="h-32 w-32 rounded-lg bg-white p-1.5" />
              <p className="m-0 max-w-[22ch] text-sm">
                <Smartphone aria-hidden size={16} className="mb-1 text-ember" />
                <b className="block">Paid on your phone?</b>
                <span className="text-cream-muted">Scan this and upload the screenshot there. This page updates by itself.</span>
              </p>
            </div>
          )}
        </div>

        {error && <Banner tone="error" title={error} />}
      </div>

      <p className="m-0 text-sm text-cream-muted">
        Prefer WhatsApp?{" "}
        <a
          href={waLink(waText)}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-cream underline decoration-ember underline-offset-4"
        >
          Send the receipt to us there
        </a>
        .
      </p>
    </section>
  );
}

function Row({ label, value, copy = false }: { label: string; value: string; copy?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-wrap items-baseline gap-x-3">
      <dt className="type-small min-w-[120px] text-cream-muted">{label}</dt>
      <dd className="m-0 font-semibold">
        {value}
        {copy && (
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(value.replace(/\s/g, "")).then(() => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1500);
              });
            }}
            className="ml-3 min-h-9 text-sm font-semibold text-cream-muted underline underline-offset-4"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </dd>
    </div>
  );
}
