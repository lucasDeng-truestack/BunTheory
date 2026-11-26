"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Check, Copy, Download, Upload } from "lucide-react";
import { Container } from "@/components/ui/band";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/headline";
import { Banner } from "@/components/ui/banner";
import { waLink } from "@/lib/content";
import { cn } from "@/lib/utils";
import { uploadShopReceipt, type ShopOrderPublic } from "@/lib/shop-api";
import { formatDateLabel, formatRm, slotLabel, SHOP_PAYMENT } from "@/lib/shop";

const STATUS: Record<ShopOrderPublic["status"], { label: string; tone: "wait" | "ok" | "done" | "off" }> = {
  AWAITING_PAYMENT: { label: "Awaiting payment", tone: "wait" },
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
  function messageUs() {
    const href = waLink(`Hi Bakar & Roast, about my order ${order.reference}: ${window.location.href}`);
    window.open(href, "_blank", "noopener,noreferrer");
  }

  const status = STATUS[order.status];
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

  return (
    <Container className="grid max-w-[640px] gap-8 pb-24">
      {/* Header */}
      <div className="grid gap-2">
        <Eyebrow>Order {order.reference}</Eyebrow>
        <div className="flex items-center gap-3">
          <h1 className="display-sm m-0 text-cream">Thanks, {order.customerName.split(" ")[0]}.</h1>
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
          Save this page. The link is your order. If this phone reloads or you switch apps to pay,
          just come back to it.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={copyLink}>
            {linkCopied ? "Link copied" : "Copy my order link"}
          </Button>
          <Button variant="ghost" size="sm" onClick={messageUs}>
            Message us about this order
          </Button>
        </div>
      </div>

      {/* Summary */}
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
              Pay {formatRm(order.amountDue)}
            </h2>
            <p className="m-0 text-cream-muted">
              {order.paymentChoice === "FULL" ? "The full total." : "Half now, the rest later."} Transfer
              by bank or scan the QR, then upload your receipt below.
            </p>
          </div>

          <div className="grid gap-5 rounded-card-sm border border-cream-faint p-5 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="grid">
              <CopyRow label="Amount" value={formatRm(order.amountDue)} />
              <CopyRow label="Bank" value={SHOP_PAYMENT.bankName} />
              <CopyRow label="Account name" value={SHOP_PAYMENT.accountName} />
              <CopyRow label="Account number" value={SHOP_PAYMENT.accountNumber} />
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
            </div>
          </div>

          {/* Receipt upload */}
          <div className="grid gap-3 rounded-card-sm border border-cream-faint p-5">
            <h3 className="type-eyebrow m-0 text-cream-faint">Upload your receipt</h3>
            <p className="m-0 text-[13px] text-cream-muted">
              A photo or PDF of your transfer. We confirm once we have checked it.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
            <Button
              variant="cream"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              loading={uploading}
              loadingLabel="Uploading"
            >
              <Upload size={16} className="mr-2" />
              {order.receipts.length > 0 ? "Upload another" : "Choose receipt"}
            </Button>
            {uploadError && <Banner tone="error" title={uploadError} />}
            {order.receipts.length > 0 && (
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
            {order.receipts.length > 0 && (
              <p className="m-0 text-[13px] text-cream-muted">
                Got it. We will confirm your payment and be in touch on WhatsApp.
              </p>
            )}
          </div>
        </section>
      )}
    </Container>
  );
}
