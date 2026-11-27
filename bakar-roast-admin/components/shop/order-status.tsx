"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import Image from "next/image";
import { Check, Copy, Download, MessageCircle, Upload } from "lucide-react";
import { Container } from "@/components/ui/band";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/headline";
import { Banner } from "@/components/ui/banner";
import { waLink } from "@/lib/content";
import { cn } from "@/lib/utils";
import { uploadShopReceipt, type ShopOrderPublic } from "@/lib/shop-api";
import { formatDateLabel, formatRm, slotLabel, SHOP_PAYMENT } from "@/lib/shop";
import { OrderSteps } from "@/components/shop/order-steps";

const STATUS: Record<ShopOrderPublic["status"], { label: string; tone: "wait" | "ok" | "done" | "off" }> = {
  AWAITING_PAYMENT: { label: "Not paid yet", tone: "wait" },
  DEPOSIT_PAID: { label: "Deposit received", tone: "ok" },
  PAID: { label: "Paid in full", tone: "done" },
  CANCELLED: { label: "Cancelled", tone: "off" },
};

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 border-b border-ink-line py-2.5 last:border-b-0">
      <div className="grid">
        <span className="text-[12px] uppercase tracking-wide text-cream-faint">{label}</span>
        <span className="font-semibold text-cream">{value}</span>
      </div>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            /* clipboard blocked: the value is visible to copy by hand */
          }
        }}
        className="flex items-center gap-1.5 rounded-full border border-cream-faint px-3 py-1.5 text-[13px] text-cream hover:border-ember"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export function OrderStatus({ initialOrder }: { initialOrder: ShopOrderPublic }) {
  const [order, setOrder] = useState(initialOrder);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Built on click, so the server and client never disagree on window.location.
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1500);
    } catch {
      /* clipboard blocked: the URL is in the address bar to copy by hand */
    }
  }
  // A QR of this page, so someone paying at a computer can open the same order on their phone
  // and upload the receipt from there. Made in the browser: it needs the page's own address.
  const [pageQr, setPageQr] = useState("");
  useEffect(() => {
    let live = true;
    QRCode.toDataURL(window.location.href, { margin: 1, width: 320 }).then(
      (url) => live && setPageQr(url),
      () => {
        /* No QR: the other two ways to send a receipt still work. */
      },
    );
    return () => {
      live = false;
    };
  }, []);
  function sendReceiptOnWhatsApp() {
    const href = waLink(
      `Hi Bakar & Roast, here is my payment receipt for order ${order.reference} (${formatRm(order.amountDue)}). ${window.location.href}`,
    );
    window.open(href, "_blank", "noopener,noreferrer");
  }
  function messageUs() {
    const href = waLink(`Hi Bakar & Roast, about my order ${order.reference}: ${window.location.href}`);
    window.open(href, "_blank", "noopener,noreferrer");
  }

  // Payment is the last step of ordering: until a receipt is in, the order is saved but not placed.
  const receiptIn = order.receipts.length > 0;
  const toPay = order.status === "AWAITING_PAYMENT" && !receiptIn;
  const checking = order.status === "AWAITING_PAYMENT" && receiptIn;
  const firstName = order.customerName.split(" ")[0];
  const status = checking ? { label: "Checking payment", tone: "ok" as const } : STATUS[order.status];
  const paid = order.status === "DEPOSIT_PAID" || order.status === "PAID";
  const cancelled = order.status === "CANCELLED";

  async function onFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      // Upload immediately on select, holding nothing in memory, so opening the camera or
      // gallery (which can reload the tab) cannot lose anything.
      const updated = await uploadShopReceipt(order.accessToken, file);
      setOrder(updated);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Could not upload the receipt.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const summary = (
      <section className="grid gap-4 rounded-card-sm border border-cream-faint p-5">
        <h2 className="type-eyebrow m-0 text-cream-faint">Your order</h2>
        <ul className="m-0 grid list-none gap-2 p-0">
          {order.items.map((it) => (
            <li key={it.packageKey} className="flex items-center justify-between gap-3">
              <span className="text-cream">
                {it.quantity} × {it.packageName}
              </span>
              <span className="text-cream-muted">
                {formatRm((parseFloat(it.unitPrice) * it.quantity).toFixed(2))}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-t border-ink-line pt-3">
          <span className="font-semibold text-cream">Total</span>
          <span className="font-semibold text-cream">{formatRm(order.total)}</span>
        </div>
        <dl className="m-0 grid gap-1.5 text-[14px]">
          <div className="flex justify-between gap-3">
            <dt className="text-cream-faint">When</dt>
            <dd className="m-0 text-right text-cream">
              {formatDateLabel(order.fulfilmentDate)} · {slotLabel(order.timeSlot)}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-cream-faint">{order.type === "DELIVERY" ? "Deliver to" : "Pickup"}</dt>
            <dd className="m-0 max-w-[60%] text-right text-cream">
              {order.type === "DELIVERY" && order.address
                ? [order.address.line1, order.address.line2, `${order.address.postcode} ${order.address.city}`, order.address.state]
                    .filter(Boolean)
                    .join(", ")
                : "We WhatsApp you the location once your order is confirmed."}
            </dd>
          </div>
        </dl>
        {order.type === "DELIVERY" && (
          <p className="m-0 text-[13px] text-cream-muted">
            Delivery fee is arranged over WhatsApp and is not in this total yet.
          </p>
        )}
      </section>
  );

  return (
    <Container className="grid max-w-[640px] gap-8 pb-24 [&>*]:min-w-0">
      {toPay && <OrderSteps current={3} />}

      {/* Header */}
      <div className="grid gap-2">
        <Eyebrow>Order {order.reference}</Eyebrow>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="display-sm m-0 text-cream">
            {toPay ? "Pay to place your order" : checking ? `Order placed, ${firstName}.` : `Thanks, ${firstName}.`}
          </h1>
          <span
            className={cn(
              "rounded-full px-3 py-1 text-[12px] font-semibold uppercase tracking-wide",
              status.tone === "wait" && "bg-ember/15 text-ember",
              status.tone === "ok" && "bg-ember/15 text-ember",
              status.tone === "done" && "bg-ember text-ink",
              status.tone === "off" && "bg-ink-line text-cream-muted",
            )}
          >
            {status.label}
          </span>
        </div>
        <p className="m-0 text-cream-muted">
          {toPay
            ? `Almost there, ${firstName}. We are holding your order, and it is placed once you pay and upload your receipt below.`
            : checking
              ? "We have your receipt. We will check the payment and confirm on WhatsApp."
              : "Save this page. The link is your order."}
        </p>
        {toPay && (
          <p className="m-0 text-[13px] text-cream-muted">
            Switching to your banking app is fine. This page is saved to its link, so come back to it any time.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={copyLink}>
            {linkCopied ? "Link copied" : "Copy my order link"}
          </Button>
          <Button variant="ghost" size="sm" onClick={messageUs}>
            Message us about this order
          </Button>
        </div>
      </div>

      {!toPay && summary}

      {/* Payment */}
      {cancelled ? (
        <Banner tone="error" title="This order was cancelled">
          Message us if that is not right.
        </Banner>
      ) : paid ? (
        <Banner tone="ok" title={order.status === "PAID" ? "Paid in full. Thank you." : "Deposit received. Thank you."}>
          We will be in touch on WhatsApp about your order.
        </Banner>
      ) : (
        <section className="grid gap-4">
          <div className="grid gap-1">
            <h2 className="display-sm m-0 text-cream">
              {checking ? `Payment of ${formatRm(order.amountDue)}` : `Pay ${formatRm(order.amountDue)}`}
            </h2>
            <p className="m-0 text-cream-muted">
              {order.paymentChoice === "FULL" ? "The full total." : "Half now, the rest later."} Transfer
              by bank or scan the QR, then upload your receipt below{toPay ? " to place the order" : ""}.
            </p>
          </div>

          <div className="grid gap-5 rounded-card-sm border border-cream-faint p-5 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="grid">
              <CopyRow label="Amount" value={formatRm(order.amountDue)} />
              <CopyRow label="Bank" value={SHOP_PAYMENT.bankName} />
              <CopyRow label="Account name" value={SHOP_PAYMENT.accountName} />
              <CopyRow label="Account number" value={SHOP_PAYMENT.accountNumber} />
              <CopyRow label="Transfer reference" value={order.reference} />
              <p className="m-0 pt-2 text-[13px] text-cream-muted">
                Put the reference in your bank&apos;s reference or recipient note, so we can match the payment to
                your order.
              </p>
            </div>
            <div className="grid justify-items-center gap-2">
              <Image
                src={SHOP_PAYMENT.qrUrl}
                alt="DuitNow QR to pay Bakar & Roast"
                width={160}
                height={160}
                className="rounded-card-sm bg-cream p-2"
              />
              <a
                href={SHOP_PAYMENT.qrUrl}
                download
                className="inline-flex items-center gap-1.5 text-[13px] text-cream hover:text-ember"
              >
                <Download size={14} /> Save QR
              </a>
              <span className="text-[13px] text-cream-muted">Scan to pay</span>
            </div>
          </div>

          {/* Receipt: three ways to send it */}
          <div className="grid gap-4 rounded-card-sm border border-cream-faint p-5">
            <div className="grid gap-1">
              <h3 className="type-eyebrow m-0 text-cream-faint">Send us your receipt</h3>
              <p className="m-0 text-[13px] text-cream-muted">
                A photo or PDF of your transfer. {toPay ? "Sending it places your order. " : ""}We confirm once we have
                checked it. Pick whichever is easiest.
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
            <ol className="m-0 grid list-none gap-3 p-0 sm:grid-cols-3">
              <li className="grid content-start gap-3 rounded-card-sm border border-ink-line p-4">
                <div className="grid gap-1">
                  <b className="text-cream">Upload it here</b>
                  <span className="text-[13px] text-cream-muted">From this phone or computer.</span>
                </div>
                <Button
                  variant="cream"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  loading={uploading}
                  loadingLabel="Uploading"
                >
                  <span className="inline-flex items-center gap-2">
                    <Upload aria-hidden size={16} />
                    {receiptIn ? "Upload another" : "Upload receipt"}
                  </span>
                </Button>
              </li>
              <li className="grid content-start gap-3 rounded-card-sm border border-ink-line p-4">
                <div className="grid gap-1">
                  <b className="text-cream">Send it on WhatsApp</b>
                  <span className="text-[13px] text-cream-muted">
                    We open a chat with your order number filled in. Attach the receipt and send.
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={sendReceiptOnWhatsApp}>
                  <span className="inline-flex items-center gap-2">
                    <MessageCircle aria-hidden size={16} />
                    Open WhatsApp
                  </span>
                </Button>
              </li>
              {/* Scanning your own screen is no use on a phone, so this one is for wider screens. */}
              <li className="hidden content-start gap-3 rounded-card-sm border border-ink-line p-4 sm:grid">
                <div className="grid gap-1">
                  <b className="text-cream">Receipt is on your phone?</b>
                  <span className="text-[13px] text-cream-muted">
                    Scan this to open your order on the phone, then upload from there.
                  </span>
                </div>
                {pageQr ? (
                  // eslint-disable-next-line @next/next/no-img-element -- a data URL made in the browser
                  <img
                    src={pageQr}
                    alt={`QR code that opens order ${order.reference} on your phone`}
                    width={120}
                    height={120}
                    className="rounded-card-sm bg-cream p-1.5"
                  />
                ) : (
                  <div aria-hidden className="h-[120px] w-[120px] rounded-card-sm bg-ink-line" />
                )}
              </li>
            </ol>
            {uploadError && <Banner tone="error" title={uploadError} />}
            {receiptIn && (
              <ul className="m-0 grid list-none gap-1.5 p-0 text-[13px]">
                {order.receipts.map((r) => (
                  <li key={r.id} className="flex items-center gap-2 text-cream-muted">
                    <Check size={14} className="text-ember" />
                    <a href={r.fileUrl} target="_blank" rel="noreferrer" className="text-cream hover:text-ember">
                      {r.fileName ?? "Receipt"}
                    </a>
                  </li>
                ))}
              </ul>
            )}
            <p className="m-0 text-[13px] text-cream-muted">
              {receiptIn
                ? "Got it. Your order is placed. We will confirm your payment and be in touch on WhatsApp."
                : "Sent it on WhatsApp? This page changes to paid once we have confirmed it."}
            </p>
          </div>
        </section>
      )}

      {toPay && summary}
    </Container>
  );
}
