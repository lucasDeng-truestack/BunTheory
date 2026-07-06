"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import { Loader2, QrCode, Wallet, Upload, X, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { SubPageShell } from "@/components/layout/sub-page-shell";
import { FulfillmentHeader, OrderSummary } from "@/components/storefront";
import { useHydrated } from "@/hooks/use-hydrated";
import { useCartStore, cartSelectionsToPayload } from "@/store/cart.store";
import type { PublicSystemSettings } from "@/services/storefront-settings.service";
import { createOrder } from "@/services/orders.service";
import { uploadPaymentReceipt } from "@/services/upload.service";
import { saveLastOrderId } from "@/lib/last-order";
import { normalizeMenuSlug } from "@/lib/menu-slug";
import { computeOrderTotals } from "@/lib/order-totals";
import { formatRM } from "@/lib/money";
import { cn } from "@/lib/utils";

const FALLBACK_PAYMENT_QR =
  process.env.NEXT_PUBLIC_PAYMENT_QR_URL ?? "/images/payment-qr.svg";
const REMEMBER_CUSTOMER_KEY = "bun-theory.checkout-customer";

type PaymentMethod = "QR" | "COD";

type ConfirmPayViewProps = {
  settings: PublicSystemSettings | null;
  minimumDeliveryAmount: number | null;
};

export function ConfirmPayView({
  settings,
  minimumDeliveryAmount,
}: ConfirmPayViewProps) {
  const router = useRouter();
  const hydrated = useHydrated();
  const items = useCartStore((s) => s.items);
  const fulfillment = useCartStore((s) => s.fulfillment);
  const subtotal = useCartStore((s) => s.total());
  const clearCart = useCartStore((s) => s.clearCart);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const [remember, setRemember] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>("QR");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isDelivery = fulfillment.type === "DELIVERY";

  // Redirect out if there's nothing to confirm (after hydration).
  useEffect(() => {
    if (!hydrated) return;
    if (items.length === 0) {
      router.replace("/menu");
    } else if (!fulfillment.type) {
      router.replace("/menu");
    }
  }, [hydrated, items.length, fulfillment.type, router]);

  // Prefill remembered contact.
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(REMEMBER_CUSTOMER_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { customerName?: string; phone?: string };
        setName(saved.customerName?.trim() || "");
        setPhone(saved.phone?.trim() || "");
        setRemember(true);
      }
    } catch {
      localStorage.removeItem(REMEMBER_CUSTOMER_KEY);
    }
  }, [hydrated]);

  // Manage object URL lifecycle for the receipt preview.
  useEffect(() => {
    if (!receiptFile || !receiptFile.type.startsWith("image/")) {
      setReceiptPreview(null);
      return;
    }
    const url = URL.createObjectURL(receiptFile);
    setReceiptPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [receiptFile]);

  const totals = useMemo(
    () =>
      computeOrderTotals({
        subtotal,
        deliveryFee: isDelivery ? settings?.deliveryFee : 0,
        processingFee: settings?.processingFee,
        taxRatePercent: settings?.taxRatePercent,
      }),
    [subtotal, isDelivery, settings]
  );

  const minDel = minimumDeliveryAmount;
  const belowMinimum =
    isDelivery && minDel != null && subtotal < minDel;
  const phoneValid = Boolean(phone && isValidPhoneNumber(phone));
  const needsReceipt = method === "QR";
  const canPlace =
    name.trim().length > 0 &&
    phoneValid &&
    !belowMinimum &&
    (!needsReceipt || receiptFile != null);

  const qrSrc = settings?.paymentQrUrl?.trim() || FALLBACK_PAYMENT_QR;

  const persistRemember = () => {
    if (typeof window === "undefined") return;
    if (remember && (name.trim() || phone.trim())) {
      localStorage.setItem(
        REMEMBER_CUSTOMER_KEY,
        JSON.stringify({ customerName: name.trim(), phone: phone.trim() })
      );
    } else {
      localStorage.removeItem(REMEMBER_CUSTOMER_KEY);
    }
  };

  const placeOrder = async () => {
    setError("");
    if (!name.trim()) return setError("Please enter your name.");
    if (!phoneValid)
      return setError("Please enter a valid phone number with country code.");
    if (belowMinimum && minDel != null)
      return setError(
        `Minimum order of ${formatRM(minDel)} required for delivery.`
      );
    if (needsReceipt && !receiptFile)
      return setError("Please upload your payment receipt to pay by QR.");

    const validItems = items.filter((i) => i.slug || i.menuId);
    if (validItems.length === 0)
      return setError("Your cart is empty or needs review. Add items again.");

    setSubmitting(true);
    try {
      let receiptUrl: string | undefined;
      if (method === "QR" && receiptFile) {
        const { url } = await uploadPaymentReceipt(receiptFile);
        receiptUrl = url;
      }

      const order = await createOrder({
        customerName: name.trim(),
        phone,
        type: fulfillment.type === "DELIVERY" ? "DELIVERY" : "PICKUP",
        ...(fulfillment.type === "DELIVERY"
          ? {
              deliveryAddress: (fulfillment.deliveryAddress ?? "").trim(),
              ...(fulfillment.deliveryNotes?.trim()
                ? { deliveryNotes: fulfillment.deliveryNotes.trim() }
                : {}),
            }
          : {}),
        ...(comment.trim() ? { restaurantComment: comment.trim() } : {}),
        paymentChoice: method === "QR" ? "PAY_NOW" : "PAY_LATER",
        ...(receiptUrl ? { receiptUrl } : {}),
        items: validItems.map((i) => {
          const base = {
            quantity: i.quantity,
            remarks: i.remarks,
            selections: cartSelectionsToPayload(i.selections),
          };
          return i.slug
            ? { ...base, slug: normalizeMenuSlug(i.slug) }
            : { ...base, menuId: i.menuId! };
        }),
      });

      persistRemember();
      clearCart();
      saveLastOrderId(order.id);
      toast.success("Order placed!", {
        description:
          method === "QR"
            ? "We received your payment proof — we'll confirm on WhatsApp."
            : "Pay on collection / delivery. We'll confirm on WhatsApp.",
      });
      router.push(`/order/success?id=${order.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to place order";
      setError(message);
      toast.error("Order failed", { description: message });
      setSubmitting(false);
    }
  };

  const fulfillmentHeader = fulfillment.type
    ? fulfillment.type === "DELIVERY"
      ? {
          title: fulfillment.deliveryAddress || "Delivery",
          subtitle: fulfillment.deliveryNotes || null,
        }
      : {
          title: settings?.outletName?.trim() || "Pickup",
          subtitle: settings?.outletAddress?.trim() || null,
        }
    : null;

  return (
    <SubPageShell
      title="Confirm & pay"
      eyebrow="Almost there"
      backHref="/order"
      backLabel="Order"
      mainClassName="mx-auto flex w-full max-w-2xl flex-col gap-4 pb-28"
    >
      <>
        {!hydrated ? (
          <div className="space-y-3" aria-busy>
            <div className="h-20 animate-pulse rounded-2xl bg-bun-ink/5" />
            <div className="h-40 animate-pulse rounded-2xl bg-bun-ink/5" />
            <div className="h-40 animate-pulse rounded-2xl bg-bun-ink/5" />
          </div>
        ) : (
          <>
            {fulfillmentHeader && fulfillment.type ? (
              <FulfillmentHeader
                type={fulfillment.type}
                title={fulfillmentHeader.title}
                subtitle={fulfillmentHeader.subtitle}
                etaMinutes={settings?.prepTimeMinutes ?? null}
                onChange={() => router.push("/menu")}
              />
            ) : null}

            {/* Contact */}
            <section className="space-y-3 rounded-3xl border-2 border-bun-ink bg-white p-5 shadow-sticker">
              <h2 className="font-display text-xl font-bold text-bun-ink">
                Your details
              </h2>
              <div className="space-y-1.5">
                <Label htmlFor="cp-name" className="font-display">
                  Name
                </Label>
                <Input
                  id="cp-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cp-phone" className="font-display">
                  Phone
                </Label>
                <PhoneInput
                  id="cp-phone"
                  international
                  defaultCountry="MY"
                  limitMaxLength
                  placeholder="Enter phone number"
                  value={phone || undefined}
                  onChange={(v) => setPhone(v ?? "")}
                  className="order-form-phone"
                  numberInputProps={{ autoComplete: "tel" }}
                />
                <p className="text-caption">We&apos;ll confirm on WhatsApp.</p>
              </div>
              <div className="flex items-start justify-between gap-3 rounded-2xl border-2 border-bun-ink/12 bg-bun-cream-soft px-4 py-3">
                <Label
                  htmlFor="cp-remember"
                  className="font-display text-sm font-semibold text-bun-ink"
                >
                  Remember my name and phone
                </Label>
                <Switch
                  id="cp-remember"
                  checked={remember}
                  onCheckedChange={setRemember}
                />
              </div>
            </section>

            {/* Comment */}
            <section className="space-y-2 rounded-3xl border-2 border-bun-ink bg-white p-5 shadow-sticker">
              <Label htmlFor="cp-comment" className="font-display text-base font-bold text-bun-ink">
                Comments for the restaurant{" "}
                <span className="font-normal text-bun-ink-soft/60">(optional)</span>
              </Label>
              <Textarea
                id="cp-comment"
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Allergies, cutlery, special requests…"
                className="resize-none border-charcoal/15"
                maxLength={500}
              />
            </section>

            {/* Summary */}
            <OrderSummary totals={totals} />
            {belowMinimum && minDel != null ? (
              <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Minimum order of {formatRM(minDel)} required for delivery.{" "}
                <Link href="/menu" className="font-semibold underline">
                  Add more items
                </Link>
                .
              </p>
            ) : null}

            {/* Payment */}
            <section className="space-y-3 rounded-3xl border-2 border-bun-ink bg-white p-5 shadow-sticker">
              <h2 className="font-display text-xl font-bold text-bun-ink">
                Payment
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <PaymentOption
                  active={method === "QR"}
                  icon={<QrCode className="h-5 w-5" aria-hidden />}
                  label="Pay by QR"
                  hint="Transfer now"
                  onClick={() => setMethod("QR")}
                />
                <PaymentOption
                  active={method === "COD"}
                  icon={<Wallet className="h-5 w-5" aria-hidden />}
                  label="Cash on delivery"
                  hint="Pay on handover"
                  onClick={() => setMethod("COD")}
                />
              </div>

              {method === "QR" ? (
                <div className="space-y-3 rounded-2xl border-2 border-bun-ink/12 bg-bun-cream-soft p-4">
                  <p className="text-sm text-bun-ink-soft">
                    Scan to pay <span className="font-bold text-bun-ink">{formatRM(totals.total)}</span>, then
                    upload your receipt.
                  </p>
                  <div className="mx-auto h-44 w-44 overflow-hidden rounded-xl border-2 border-bun-ink bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrSrc}
                      alt="Payment QR"
                      className="h-full w-full object-contain"
                    />
                  </div>

                  <ReceiptUpload
                    file={receiptFile}
                    preview={receiptPreview}
                    onSelect={setReceiptFile}
                    onClear={() => setReceiptFile(null)}
                  />
                </div>
              ) : (
                <p className="rounded-xl border-2 border-bun-ink/12 bg-bun-cream-soft px-4 py-3 text-sm text-bun-ink-soft">
                  Pay with cash when you {isDelivery ? "receive" : "collect"} your
                  order.
                </p>
              )}
            </section>

            {error ? (
              <p className="rounded-xl border-2 border-bun-red/30 bg-bun-red/10 px-4 py-3 text-sm font-medium text-bun-red-deep">
                {error}
              </p>
            ) : null}

            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-bun-ink-soft/70">
              <Lock className="h-3.5 w-3.5" aria-hidden />
              Your order can&apos;t be changed after you place it.
            </p>
          </>
        )}
      </>

      {hydrated && items.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-bun-ink bg-bun-cream-soft/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
          <Button
            variant="hero"
            size="lg"
            className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3"
            disabled={!canPlace || submitting}
            onClick={placeOrder}
          >
            <span>
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Placing order…
                </span>
              ) : (
                "Place order"
              )}
            </span>
            {!submitting ? <span>{formatRM(totals.total)}</span> : null}
          </Button>
        </div>
      ) : null}
    </SubPageShell>
  );
}

function PaymentOption({
  active,
  icon,
  label,
  hint,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-all active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bun-red/40 focus-visible:ring-offset-2",
        active
          ? "border-bun-ink bg-bun-yellow shadow-sticker"
          : "border-bun-ink/15 bg-white hover:border-bun-ink/40"
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-bun-ink",
          active ? "bg-bun-red text-white" : "bg-white text-bun-ink"
        )}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-display font-bold text-bun-ink">
          {label}
        </span>
        <span className="block text-xs text-bun-ink-soft">{hint}</span>
      </span>
    </button>
  );
}

function ReceiptUpload({
  file,
  preview,
  onSelect,
  onClear,
}: {
  file: File | null;
  preview: string | null;
  onSelect: (f: File) => void;
  onClear: () => void;
}) {
  return (
    <div>
      <Label className="font-display text-sm font-bold text-bun-ink">
        Payment receipt <span className="text-bun-red">*</span>
      </Label>
      {file ? (
        <div className="mt-2 flex items-center gap-3 rounded-xl border-2 border-bun-ink/15 bg-white p-3">
          {preview ? (
            <Image
              src={preview}
              alt="Receipt preview"
              width={56}
              height={56}
              className="h-14 w-14 rounded-lg object-cover"
              unoptimized
            />
          ) : (
            <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-charcoal/5 text-charcoal/40">
              <Upload className="h-5 w-5" />
            </span>
          )}
          <span className="min-w-0 flex-1 truncate text-sm text-charcoal/70">
            {file.name}
          </span>
          <button
            type="button"
            onClick={onClear}
            aria-label="Remove receipt"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-charcoal/60 hover:bg-cream"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-bun-ink/30 bg-white px-4 py-5 font-display text-sm font-semibold text-bun-ink-soft transition-colors hover:border-bun-red hover:text-bun-ink">
          <Upload className="h-5 w-5" aria-hidden />
          Upload receipt (image or PDF)
          <input
            type="file"
            accept="image/*,application/pdf"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onSelect(f);
              e.target.value = "";
            }}
          />
        </label>
      )}
    </div>
  );
}
