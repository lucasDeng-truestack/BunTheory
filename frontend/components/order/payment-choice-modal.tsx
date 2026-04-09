"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
  HandCoins,
  Loader2,
  MessageCircle,
  QrCode,
  Upload,
  X,
} from "lucide-react";
import {
  CHECKOUT_PAYMENT_DRAFT_KEY,
  type CheckoutPaymentDraftV1,
} from "@/lib/checkout-payment-draft";

/** Must match checkout fallback when no admin URL / env. */
const DEFAULT_QR = "/images/payment-qr.svg";

type PaymentMethod = "payNow" | "payLater";
type Step = "choice" | "confirm" | "payNow";

function readDraftInitialState(): {
  step: Step;
  selectedMethod: PaymentMethod | null;
  fileReuploadHint: string | null;
} {
  if (typeof window === "undefined") {
    return { step: "choice", selectedMethod: null, fileReuploadHint: null };
  }
  try {
    const raw = sessionStorage.getItem(CHECKOUT_PAYMENT_DRAFT_KEY);
    if (!raw) {
      return { step: "choice", selectedMethod: null, fileReuploadHint: null };
    }
    const d = JSON.parse(raw) as CheckoutPaymentDraftV1;
    if (d.v !== 1) {
      return { step: "choice", selectedMethod: null, fileReuploadHint: null };
    }
    const stepOk =
      d.step === "choice" || d.step === "confirm" || d.step === "payNow";
    if (!stepOk) {
      return { step: "choice", selectedMethod: null, fileReuploadHint: null };
    }
    return {
      step: d.step,
      selectedMethod: d.selectedMethod,
      fileReuploadHint: d.fileMeta?.name ? d.fileMeta.name : null,
    };
  } catch {
    return { step: "choice", selectedMethod: null, fileReuploadHint: null };
  }
}

async function downloadQrImage(src: string, baseName = "bun-theory-payment-qr") {
  try {
    const res = await fetch(src, { mode: "cors" });
    if (!res.ok) throw new Error("fetch failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const ext = blob.type.includes("png")
      ? "png"
      : blob.type.includes("jpeg") || blob.type.includes("jpg")
        ? "jpg"
        : blob.type.includes("webp")
          ? "webp"
          : blob.type.includes("svg")
            ? "svg"
            : "png";
    a.download = `${baseName}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch {
    window.open(src, "_blank", "noopener,noreferrer");
  }
}

type PaymentChoiceModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pay now step: QR from /public or NEXT_PUBLIC_PAYMENT_QR_URL. */
  qrSrc: string;
  totalLabel: string;
  busy: boolean;
  uploading: boolean;
  onPayLater: () => void | Promise<void>;
  /** Upload receipt then place order (parent handles API). */
  onMarkedPaid: (file: File) => void | Promise<void>;
  /** Pay now without receipt upload; optional WhatsApp handoff in parent. */
  onPayNowReceiptLater?: () => void | Promise<void>;
  uploadError?: string | null;
  onClearUploadError?: () => void;
};

export function PaymentChoiceModal({
  open,
  onOpenChange,
  qrSrc,
  totalLabel,
  busy,
  uploading,
  onPayLater,
  onMarkedPaid,
  onPayNowReceiptLater,
  uploadError,
  onClearUploadError,
}: PaymentChoiceModalProps) {
  const [step, setStep] = useState<Step>("choice");
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(
    null
  );
  const [fileReuploadHint, setFileReuploadHint] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [qrDownloading, setQrDownloading] = useState(false);
  const [persistReady, setPersistReady] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  /** Avoid SSR/client mismatch: sessionStorage only on client after mount. */
  useEffect(() => {
    const initial = readDraftInitialState();
    setStep(initial.step);
    setSelectedMethod(initial.selectedMethod);
    setFileReuploadHint(initial.fileReuploadHint);
    setPersistReady(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !persistReady) return;
    const draft: CheckoutPaymentDraftV1 = {
      v: 1,
      step,
      selectedMethod,
      fileMeta: file ? { name: file.name } : null,
    };
    sessionStorage.setItem(CHECKOUT_PAYMENT_DRAFT_KEY, JSON.stringify(draft));
  }, [persistReady, step, selectedMethod, file]);

  useEffect(() => {
    if (file) setFileReuploadHint(null);
  }, [file]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const confirmSelection = async () => {
    if (selectedMethod === "payNow") {
      setStep("payNow");
      return;
    }
    if (selectedMethod === "payLater") {
      await onPayLater();
    }
  };

  const clearUploadedFile = () => {
    setFile(null);
    setPreviewUrl(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const fileIsImage = Boolean(file?.type.startsWith("image/"));
  const fileIsPdf =
    file?.type === "application/pdf" ||
    file?.name.toLowerCase().endsWith(".pdf");

  const payNowProgress = (
    <div className="mt-4 rounded-2xl border border-charcoal/10 bg-white/80 px-4 py-3">
      <p className="font-display text-sm text-charcoal">Pay now · 3 steps</p>
      <ol className="mt-2 space-y-2 text-sm text-charcoal/75">
        <li className="flex items-start gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-roast-red text-xs font-semibold text-white">
            1
          </span>
          <span>Scan QR (or save it first) / pay the total</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-roast-red/20 text-xs font-semibold text-roast-red">
            2
          </span>
          <span>Confirm payment in your banking app</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-roast-red/20 text-xs font-semibold text-roast-red">
            3
          </span>
          <span>Upload receipt and finish your order here</span>
        </li>
      </ol>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "w-[min(100vw-2rem,42rem)] max-h-[min(90vh,760px)] overflow-y-auto rounded-[2rem] border border-charcoal/10 bg-[linear-gradient(180deg,#fffaf4_0%,#ffffff_38%,#fff8ef_100%)] p-5 sm:p-7",
          (step === "payNow" || step === "confirm") &&
            "w-[min(100vw-2rem,26rem)] sm:w-[min(100vw-2rem,30rem)]"
        )}
      >
        {step === "choice" ? (
          <>
            <DialogHeader className="space-y-3">
              <div className="inline-flex w-fit items-center rounded-full border border-roast-red/10 bg-roast-red/[0.06] px-3 py-1 text-xs font-medium text-roast-red">
                Total {totalLabel}
              </div>
              <DialogTitle className="font-display text-2xl text-charcoal sm:text-[2rem]">
                How would you like to pay?
              </DialogTitle>
              <DialogDescription className="max-w-2xl text-left text-base leading-relaxed text-charcoal/70">
                Choose Pay now to transfer and upload your receipt, or Pay later
                at pickup / when you meet us.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                className="group flex min-h-[15rem] flex-col rounded-[1.75rem] border border-roast-red/15 bg-white/95 p-5 text-left shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-roast-red/30 hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-roast-red focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                disabled={busy}
                onClick={() => {
                  setSelectedMethod("payNow");
                  setStep("confirm");
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-roast-red text-white shadow-sm">
                    <QrCode className="h-6 w-6" />
                  </div>
                  <span className="rounded-full bg-cream px-3 py-1 text-xs font-medium text-roast-red">
                    Fastest confirmation
                  </span>
                </div>
                <div className="mt-6 space-y-2">
                  <h3 className="font-display text-2xl text-charcoal">
                    Pay now
                  </h3>
                  <p className="text-sm leading-relaxed text-charcoal/68">
                    Scan the QR, transfer the total, then upload your receipt so
                    we can confirm your order faster.
                  </p>
                </div>
                <div className="mt-5 space-y-2 text-sm text-charcoal/72">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-roast-red" />
                    Upload proof of payment in the same flow
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-roast-red" />
                    Best if you want checkout done upfront
                  </div>
                </div>
              </button>

              <button
                type="button"
                className="group flex min-h-[15rem] flex-col rounded-[1.75rem] border border-charcoal/12 bg-white/95 p-5 text-left shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-charcoal/25 hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-roast-red focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                disabled={busy}
                onClick={() => {
                  setSelectedMethod("payLater");
                  setStep("confirm");
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-mustard/20 text-burnt-brown shadow-sm">
                    <HandCoins className="h-6 w-6" />
                  </div>
                  <span className="rounded-full bg-cream px-3 py-1 text-xs font-medium text-charcoal/70">
                    Simple pickup flow
                  </span>
                </div>
                <div className="mt-6 space-y-2">
                  <h3 className="font-display text-2xl text-charcoal">
                    Pay later
                  </h3>
                  <p className="text-sm leading-relaxed text-charcoal/68">
                    Place the order now and settle payment when you pick up or
                    meet us for delivery.
                  </p>
                </div>
                <div className="mt-5 space-y-2 text-sm text-charcoal/72">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-roast-red" />
                    No screenshot upload needed
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-roast-red" />
                    Good if you prefer to pay in person
                  </div>
                </div>
              </button>
            </div>
            <div className="mt-5 rounded-2xl border border-charcoal/10 bg-white/70 px-4 py-3 text-sm text-charcoal/60">
              Recommendation: use{" "}
              <span className="font-display text-charcoal">Pay now</span> if you
              already have your banking app open. It speeds up confirmation and
              keeps checkout in one flow.
            </div>
          </>
        ) : step === "confirm" ? (
          <>
            <button
              type="button"
              className="mb-2 inline-flex items-center gap-1 font-display text-sm font-medium text-roast-red hover:underline"
              onClick={() => setStep("choice")}
              disabled={busy || uploading}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <div className="rounded-[1.75rem] border border-charcoal/10 bg-white/95 p-5 shadow-card">
              <DialogHeader className="space-y-3 text-left">
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm",
                    selectedMethod === "payNow"
                      ? "bg-roast-red text-white"
                      : "bg-mustard/20 text-burnt-brown"
                  )}
                >
                  {selectedMethod === "payNow" ? (
                    <QrCode className="h-6 w-6" />
                  ) : (
                    <HandCoins className="h-6 w-6" />
                  )}
                </div>
                <DialogTitle className="font-display text-2xl text-charcoal">
                  Proceed with{" "}
                  {selectedMethod === "payNow" ? "Pay now" : "Pay later"}?
                </DialogTitle>
                <DialogDescription className="text-base leading-relaxed text-charcoal/70">
                  {selectedMethod === "payNow"
                    ? "You’ll continue to the QR step to upload your receipt after payment (or send it on WhatsApp if that’s easier)."
                    : "Your order will be placed first, and you can settle payment at pickup or delivery."}
                </DialogDescription>
              </DialogHeader>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button
                  type="button"
                  size="lg"
                  className="min-w-[8rem] font-display"
                  disabled={busy || uploading}
                  onClick={() => void confirmSelection()}
                >
                  Yes, confirm
                </Button>
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  className="min-w-[8rem] font-display"
                  disabled={busy || uploading}
                  onClick={() => setStep("choice")}
                >
                  No
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              className="mb-2 inline-flex items-center gap-1 font-display text-sm font-medium text-roast-red hover:underline"
              onClick={() => setStep("confirm")}
              disabled={busy || uploading}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <DialogHeader className="space-y-3">
              <div className="inline-flex w-fit items-center rounded-full border border-roast-red/10 bg-roast-red/[0.06] px-3 py-1 text-xs font-medium text-roast-red">
                Total {totalLabel}
              </div>
              <DialogTitle className="font-display text-2xl text-charcoal">
                Pay now
              </DialogTitle>
              <DialogDescription className="text-left text-base leading-relaxed text-charcoal/70">
                Scan the QR and pay the total. Your payment is not lost if you
                switch apps — you can come back and upload the same receipt, or
                use WhatsApp below.
              </DialogDescription>
            </DialogHeader>

            {payNowProgress}

            <div className="mt-5 rounded-[1.75rem] border border-charcoal/10 bg-white/85 p-4 shadow-card">
              <div className="flex items-center gap-3 rounded-2xl bg-cream/60 px-4 py-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-roast-red text-white">
                  <QrCode className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-display text-base text-charcoal">
                    Transfer with QR
                  </p>
                  <p className="text-sm text-charcoal/60">
                    Save the QR first if you need to leave this screen.
                  </p>
                </div>
              </div>
              <div className="relative mx-auto mt-4 w-full max-w-[240px] overflow-hidden rounded-2xl border border-charcoal/10 bg-cream/50">
                {/* eslint-disable-next-line @next/next/no-img-element -- QR from /public or external URL */}
                <img
                  src={qrSrc || DEFAULT_QR}
                  alt="Payment QR code"
                  className="h-auto w-full object-contain p-3"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 w-full font-display"
                disabled={qrDownloading || busy}
                onClick={() => {
                  void (async () => {
                    setQrDownloading(true);
                    try {
                      await downloadQrImage(qrSrc || DEFAULT_QR);
                    } finally {
                      setQrDownloading(false);
                    }
                  })();
                }}
              >
                {qrDownloading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Save QR to phone
                  </>
                )}
              </Button>
            </div>

            <div className="mt-4 space-y-3">
              {fileReuploadHint && !file ? (
                <div
                  className="rounded-2xl border border-mustard/30 bg-mustard/10 px-4 py-3 text-sm text-charcoal"
                  role="status"
                >
                  <p className="font-display font-medium text-charcoal">
                    Pick your receipt again
                  </p>
                  <p className="mt-1 text-charcoal/75">
                    We couldn&apos;t keep “{fileReuploadHint}” after you left this
                    screen — that&apos;s normal. Choose the file again; your payment
                    is still valid.
                  </p>
                </div>
              ) : null}

              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf,.pdf"
                className="sr-only"
                id="payment-receipt"
                onChange={(e) => {
                  onClearUploadError?.();
                  const f = e.target.files?.[0];
                  setFile(f ?? null);
                }}
              />
              <label htmlFor="payment-receipt">
                <div
                  className={cn(
                    "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-charcoal/20 bg-white px-4 py-6 transition hover:border-roast-red/40",
                    file && "border-roast-red/30 bg-roast-red/[0.04]",
                    uploadError && "border-roast-red/50 bg-roast-red/[0.06]"
                  )}
                >
                  <Upload className="mb-2 h-8 w-8 text-charcoal/40" />
                  <span className="font-display text-sm font-medium text-charcoal">
                    {file ? file.name : "Upload payment receipt"}
                  </span>
                  <span className="mt-1 text-xs text-charcoal/50">
                    JPG, PNG, WebP or PDF · max 5MB
                  </span>
                </div>
              </label>

              {uploadError ? (
                <div
                  className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
                  role="alert"
                >
                  <p className="font-display font-medium">Couldn&apos;t finish upload</p>
                  <p className="mt-1 text-red-800/90">{uploadError}</p>
                  <p className="mt-2 text-xs text-red-800/80">
                    Try JPG, PNG, WebP, or PDF under 5MB. Your transfer is fine —
                    just pick the file again and tap{" "}
                    <span className="font-display">Upload receipt & place order</span>.
                  </p>
                </div>
              ) : null}

              {file && previewUrl ? (
                <div className="rounded-[1.5rem] border border-charcoal/10 bg-white/90 p-4 shadow-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-base text-charcoal">
                        Uploaded receipt preview
                      </p>
                      <p className="truncate text-sm text-charcoal/60">
                        {file.name}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="shrink-0 font-display text-charcoal/70"
                      disabled={busy || uploading}
                      onClick={() => {
                        onClearUploadError?.();
                        clearUploadedFile();
                      }}
                    >
                      <X className="mr-1 h-4 w-4" />
                      Remove
                    </Button>
                  </div>

                  <div className="mt-3 overflow-hidden rounded-2xl border border-charcoal/10 bg-cream/40">
                    {fileIsImage ? (
                      // eslint-disable-next-line @next/next/no-img-element -- local object URL preview for uploaded receipt
                      <img
                        src={previewUrl}
                        alt="Uploaded payment receipt preview"
                        className="max-h-72 w-full object-contain bg-white"
                      />
                    ) : fileIsPdf ? (
                      <div className="space-y-3 p-3">
                        <div className="flex items-center gap-3 rounded-xl bg-white px-3 py-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-roast-red/10 text-roast-red">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-display text-sm text-charcoal">
                              PDF receipt selected
                            </p>
                            <p className="truncate text-xs text-charcoal/55">
                              Preview below. Remove it if this is the wrong file.
                            </p>
                          </div>
                        </div>
                        <iframe
                          src={previewUrl}
                          title="Uploaded PDF receipt preview"
                          className="h-72 w-full rounded-xl border border-charcoal/10 bg-white"
                        />
                      </div>
                    ) : (
                      <div className="flex min-h-40 flex-col items-center justify-center gap-2 p-5 text-center">
                        <FileText className="h-8 w-8 text-charcoal/35" />
                        <p className="font-display text-sm text-charcoal">
                          File selected
                        </p>
                        <p className="text-xs text-charcoal/55">
                          This file type can be uploaded, but preview is limited
                          here.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              <Button
                type="button"
                size="lg"
                className="h-auto min-h-14 w-full whitespace-normal px-4 py-3 text-center font-display leading-snug"
                disabled={!file || busy || uploading}
                onClick={() => file && void onMarkedPaid(file)}
              >
                {uploading || busy ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 shrink-0 animate-spin" />
                    {uploading ? "Uploading…" : "Placing order…"}
                  </>
                ) : (
                  "Upload receipt & place order"
                )}
              </Button>

              {onPayNowReceiptLater ? (
                <div className="space-y-2 border-t border-charcoal/10 pt-4">
                  <p className="text-center text-xs leading-relaxed text-charcoal/60">
                    Already transferred? If uploading here is awkward, place your
                    order and send your proof in WhatsApp with your order number
                    — we&apos;ll match it on our side.
                  </p>
                  <Button
                    type="button"
                    size="lg"
                    variant="outline"
                    className="h-auto min-h-14 w-full whitespace-normal px-3 py-3 text-center font-display leading-snug sm:px-6 flex-col gap-2 sm:flex-row"
                    disabled={busy || uploading}
                    onClick={() => void onPayNowReceiptLater()}
                  >
                    <MessageCircle className="h-5 w-5 shrink-0 sm:mr-0" />
                    <span className="max-w-full text-balance">
                      Place order & send receipt on WhatsApp
                    </span>
                  </Button>
                </div>
              ) : null}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
