"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { BadgeCheck, Check, Copy, Download, Expand, MessageCircle, Upload } from "lucide-react";
import { Container } from "@/components/ui/band";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/headline";
import { Banner } from "@/components/ui/banner";
import { waLink } from "@/lib/content";
import { cn } from "@/lib/utils";
import { markShopOrderPaid, uploadShopReceipt, type ShopOrderPage, type ShopOrderPublic } from "@/lib/shop-api";
import { imageSrc } from "@/lib/catering-api";
import { formatDateLabel, formatRm, slotLabel } from "@/lib/shop";
import { Modal } from "@/components/shop/modal";
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

export function OrderStatus({ initialOrder }: { initialOrder: ShopOrderPage }) {
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
  // Where to pay: whatever the owner saved in the admin. Any part of it can be missing.
  const pay = order.payment;
  const qrSrc = imageSrc(pay.qrUrl);
  const hasPayDetails = !!(pay.accountNumber || qrSrc);
  const [qrOpen, setQrOpen] = useState(false);
  const [phoneQrOpen, setPhoneQrOpen] = useState(false);
  const receiptIn = order.receipts.length > 0;
  // "I've made the payment" counts like a receipt: the order is placed, and we check the money.
  const claimed = !!order.customerPaidAt;
  const toPay = order.status === "AWAITING_PAYMENT" && !receiptIn && !claimed;
  const checking = order.status === "AWAITING_PAYMENT" && (receiptIn || claimed);
  const [marking, setMarking] = useState(false);
  const [markError, setMarkError] = useState<string | null>(null);
  async function markPaid() {
    setMarking(true);
    setMarkError(null);
    try {
      setOrder(await markShopOrderPaid(order.accessToken));
    } catch (err) {
      setMarkError(err instanceof Error ? err.message : "Could not save that. Please try again.");
    } finally {
      setMarking(false);
    }
  }
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
    <Container className={cn("grid max-w-[1200px] gap-6 sm:gap-8 [&>*]:min-w-0", toPay ? "pb-44 lg:pb-24" : "pb-24")}>
      {toPay && <OrderSteps current={3} />}

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10 [&>*]:min-w-0">
      <div className="grid content-start gap-8 [&>*]:min-w-0">

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
            ? `Almost there, ${firstName}. We are holding your order. Pay, then upload your receipt to place it.`
            : checking
              ? receiptIn
                ? "We have your receipt. We will check the payment and confirm on WhatsApp."
                : "Thanks for letting us know you have paid. We will check the payment and confirm on WhatsApp."
              : "Save this page. The link is your order."}
        </p>
        {toPay && (
          <p className="m-0 text-[13px] text-cream-muted">
            Switching to your banking app is fine. This page stays saved to its link.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-5 text-[14px]">
          <button type="button" onClick={copyLink} className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-cream underline underline-offset-4 hover:text-ember">
            <Copy aria-hidden size={14} />
            {linkCopied ? "Link copied" : "Copy order link"}
          </button>
          <button type="button" onClick={messageUs} className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-cream underline underline-offset-4 hover:text-ember">
            <MessageCircle aria-hidden size={14} />
            Message us
          </button>
        </div>
      </div>

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
            <p className="m-0 text-[15px] text-cream-muted">
              {order.paymentChoice === "FULL" ? "The full total." : "Half now, the rest later."}{" "}
              {qrSrc ? "Transfer by bank or scan the QR" : "Transfer by bank"}, then let us know{toPay ? " to place the order" : ""}.
            </p>
          </div>

          <div className="grid gap-5 rounded-card-sm border border-cream-faint p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5">
            <div className="grid max-sm:order-2">
              <CopyRow label="Amount" value={formatRm(order.amountDue)} />
              {pay.bankName && <CopyRow label="Bank" value={pay.bankName} />}
              {pay.accountName && <CopyRow label="Account name" value={pay.accountName} />}
              {pay.accountNumber && <CopyRow label="Account number" value={pay.accountNumber} />}
              <CopyRow label="Transfer reference" value={order.reference} />
              <p className="m-0 pt-2 text-[13px] text-cream-muted">
                Put the reference in your bank&apos;s reference or recipient note, so we can match the payment to
                your order.
              </p>
            </div>
            {qrSrc && (
              <div className="flex items-center gap-4 max-sm:order-1 max-sm:border-b max-sm:border-ink-line max-sm:pb-4 sm:grid sm:justify-items-center sm:gap-2">
                <button
                  type="button"
                  onClick={() => setQrOpen(true)}
                  aria-label="Show the payment QR full size"
                  className="group relative rounded-card-sm transition-transform hover:scale-[1.02]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- an owner upload, from any storage host */}
                  <img
                    src={qrSrc}
                    alt="QR code to pay Bakar & Roast"
                    width={160}
                    height={160}
                    className="h-28 w-28 rounded-card-sm bg-cream object-contain p-1.5 sm:h-40 sm:w-40 sm:p-2"
                  />
                  <span className="absolute bottom-1.5 right-1.5 grid h-8 w-8 place-items-center rounded-full bg-ink text-cream shadow">
                    <Expand aria-hidden size={15} />
                  </span>
                </button>
                <div className="grid gap-1 sm:justify-items-center">
                <span className="text-[13px] text-cream-muted">Scan to pay, or tap to enlarge</span>
                <a
                  href={qrSrc}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center gap-1.5 text-[13px] text-cream hover:text-ember"
                >
                  <Download aria-hidden size={14} /> Open QR to save it
                </a>
                </div>
              </div>
            )}
          </div>
          {!hasPayDetails && (
            <Banner tone="error" title="Payment details are not on this page yet">
              <span className="flex flex-wrap items-center gap-x-4">
                <span>Message us and we will send you where to pay.</span>
                <button type="button" onClick={messageUs} className="font-semibold text-cream underline">
                  Message us on WhatsApp
                </button>
              </span>
            </Banner>
          )}
        </section>
      )}
      </div>

      {/* Side panel: the order and the one thing to do next, always in view on a wide screen. */}
      <aside className="grid content-start gap-4 lg:sticky lg:top-28">
        {(toPay || checking) && (
          <section className="grid gap-4 rounded-card-sm border border-ember p-5">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
            <div className="grid gap-1">
              <span className="type-eyebrow text-cream-faint">{checking ? "Payment sent" : "To pay now"}</span>
              <b className="display-sm text-cream">{formatRm(order.amountDue)}</b>
              <span className="text-[13px] text-cream-muted">Reference {order.reference}</span>
            </div>
            {toPay ? (
              <>
                <p className="m-0 text-[14px] text-cream-muted">
                  After you pay, tell us one of these ways<span className="lg:hidden"> (buttons at the bottom of the screen)</span>:
                </p>
                {/* On a phone these two live in the bar fixed to the bottom of the screen, so they show once. */}
                <div className="grid gap-4 max-lg:hidden">
                <Button onClick={() => fileRef.current?.click()} loading={uploading} loadingLabel="Uploading" block>
                  <span className="inline-flex items-center gap-2">
                    <Upload aria-hidden size={16} />
                    Upload my receipt
                  </span>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => void markPaid()} loading={marking} loadingLabel="Saving" block>
                  I&apos;ve paid, no receipt to upload
                </Button>
                </div>
                <p className="m-0 text-[13px] text-cream-muted">
                  Rather send it on WhatsApp?{" "}
                  <button type="button" onClick={sendReceiptOnWhatsApp} className="font-semibold text-cream underline hover:text-ember">
                    Open WhatsApp
                  </button>
                  , then tap &ldquo;I&apos;ve paid&rdquo; above.
                </p>
                {pageQr && (
                  <p className="m-0 hidden text-[13px] text-cream-muted lg:block">
                    Receipt on your phone?{" "}
                    <button type="button" onClick={() => setPhoneQrOpen(true)} className="font-semibold text-cream underline hover:text-ember">
                      Open this page on your phone
                    </button>
                  </p>
                )}
                {markError && <Banner tone="error" title={markError} />}
              </>
            ) : (
              <>
                <p className="m-0 flex gap-2 text-[14px] text-cream">
                  <BadgeCheck aria-hidden size={18} className="mt-0.5 flex-none text-ember" />
                  <span>
                    {receiptIn ? "Receipt received." : "You told us you have paid."} We are checking it and will confirm on
                    WhatsApp.
                  </span>
                </p>
                {receiptIn && (
                  <ul className="m-0 grid list-none gap-1.5 p-0 text-[13px]">
                    {order.receipts.map((r) => (
                      <li key={r.id} className="flex items-center gap-2 text-cream-muted">
                        <Check size={14} className="flex-none text-ember" />
                        <a href={r.fileUrl} target="_blank" rel="noreferrer" className="truncate text-cream hover:text-ember">
                          {r.fileName ?? "Receipt"}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="w-fit text-[13px] font-semibold text-cream-muted underline hover:text-cream disabled:no-underline"
                >
                  {uploading ? "Uploading" : receiptIn ? "Upload another receipt" : "Add a receipt"}
                </button>
              </>
            )}
            {uploadError && <Banner tone="error" title={uploadError} />}
          </section>
        )}
        {summary}
      </aside>
      </div>

      {/* Phone: the main action stays in reach without scrolling. */}
      {toPay && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-line bg-ink/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden">
          <div className="mx-auto grid max-w-[640px] gap-2">
            <p className="m-0 text-center text-[13px] text-cream-muted">
              Pay <b className="text-cream">{formatRm(order.amountDue)}</b>, then:
            </p>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Button onClick={() => fileRef.current?.click()} loading={uploading} loadingLabel="Uploading" chip={false} block>
                <span className="inline-flex items-center gap-2">
                  <Upload aria-hidden size={16} />
                  Upload receipt
                </span>
              </Button>
              <Button variant="ghost" onClick={() => void markPaid()} loading={marking} loadingLabel="Saving" chip={false}>
                I&apos;ve paid
              </Button>
            </div>
          </div>
        </div>
      )}
      {qrSrc && (
        <Modal open={qrOpen} onClose={() => setQrOpen(false)} eyebrow={`Pay ${formatRm(order.amountDue)}`} title="Scan to pay">
          {/* eslint-disable-next-line @next/next/no-img-element -- an owner upload, from any storage host */}
          <img
            src={qrSrc}
            alt="QR code to pay Bakar & Roast, full size"
            className="mx-auto w-full max-w-[420px] rounded-card-sm bg-cream object-contain p-3"
          />
          <p className="m-0 text-[14px] text-cream-muted">
            Paying on this phone? Save the QR, then choose it with &ldquo;scan from gallery&rdquo; in your banking app. Put{" "}
            <b className="text-cream">{order.reference}</b> as the reference.
          </p>
          <a
            href={qrSrc}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 w-fit items-center gap-2 font-semibold text-cream underline hover:text-ember"
          >
            <Download aria-hidden size={16} /> Open the image to save it
          </a>
        </Modal>
      )}
      {pageQr && (
        <Modal open={phoneQrOpen} onClose={() => setPhoneQrOpen(false)} eyebrow={`Order ${order.reference}`} title="Open on your phone">
          {/* eslint-disable-next-line @next/next/no-img-element -- a data URL made in the browser */}
          <img src={pageQr} alt={`QR code that opens order ${order.reference} on your phone`} className="mx-auto w-full max-w-[280px] rounded-card-sm bg-cream p-2" />
          <p className="m-0 text-[14px] text-cream-muted">Scan with your phone camera. This order opens there, and you can upload the receipt from your gallery.</p>
        </Modal>
      )}
    </Container>
  );
}
