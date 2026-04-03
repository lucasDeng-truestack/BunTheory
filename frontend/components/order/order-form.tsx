"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import { useHydrated } from "@/hooks/use-hydrated";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCartStore, cartSelectionsToPayload } from "@/store/cart.store";
import { getMenu } from "@/services/menu.service";
import { createOrder } from "@/services/orders.service";
import { uploadPaymentReceipt } from "@/services/upload.service";
import { saveLastOrderId } from "@/lib/last-order";
import { getMenuValidityLists, isCartLineOnMenu } from "@/lib/cart-menu-validation";
import { normalizeMenuSlug } from "@/lib/menu-slug";
import { Loader2 } from "lucide-react";
import { PaymentChoiceModal } from "@/components/order/payment-choice-modal";

type OrderFormProps = {
  minimumDeliveryAmount?: number | null;
  /** From admin settings upload; falls back to env then /public default. */
  paymentQrSrc?: string | null;
};

const FALLBACK_PAYMENT_QR =
  process.env.NEXT_PUBLIC_PAYMENT_QR_URL ?? "/images/payment-qr.svg";
const REMEMBER_CUSTOMER_KEY = "bun-theory.checkout-customer";

export function OrderForm({
  minimumDeliveryAmount,
  paymentQrSrc,
}: OrderFormProps) {
  const router = useRouter();
  const hydrated = useHydrated();
  const { items, total, clearCart, removeInvalidItems } = useCartStore();
  const cartTotal = useCartStore((s) =>
    s.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
  );
  const [loading, setLoading] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [error, setError] = useState("");
  const [rememberDetails, setRememberDetails] = useState(false);
  const [rememberReady, setRememberReady] = useState(false);
  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    type: "PICKUP" as "PICKUP" | "DELIVERY",
  });

  const minDel = minimumDeliveryAmount ?? null;
  const deliveryAllowed = minDel == null || cartTotal >= minDel;

  useEffect(() => {
    if (!deliveryAllowed && form.type === "DELIVERY") {
      setForm((f) => ({ ...f, type: "PICKUP" }));
    }
  }, [deliveryAllowed, form.type]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(REMEMBER_CUSTOMER_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as {
          customerName?: string;
          phone?: string;
        };
        setForm((f) => ({
          ...f,
          customerName: saved.customerName?.trim() || "",
          phone: saved.phone?.trim() || "",
        }));
        setRememberDetails(true);
      }
    } catch {
      localStorage.removeItem(REMEMBER_CUSTOMER_KEY);
    } finally {
      setRememberReady(true);
    }
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated || !rememberReady || typeof window === "undefined") return;
    if (!rememberDetails) {
      localStorage.removeItem(REMEMBER_CUSTOMER_KEY);
      return;
    }

    const payload = {
      customerName: form.customerName.trim(),
      phone: form.phone.trim(),
    };

    if (!payload.customerName && !payload.phone) {
      localStorage.removeItem(REMEMBER_CUSTOMER_KEY);
      return;
    }

    localStorage.setItem(REMEMBER_CUSTOMER_KEY, JSON.stringify(payload));
  }, [form.customerName, form.phone, hydrated, rememberDetails, rememberReady]);

  const getValidItems = useCallback(() => {
    return items.filter((i) => i.slug || i.menuId);
  }, [items]);

  const handleOrderError = useCallback(
    (err: unknown, message: string) => {
      const isMenuLineMissing =
        /menu item.*not found/i.test(message) ||
        /menu item with slug.*not found/i.test(message);

      if (isMenuLineMissing) {
        getMenu(false)
          .then((menuItems) => {
            const { validSlugs, validIds } = getMenuValidityLists(menuItems);
            const hadOnlyInvalidItems = items.every(
              (i) => !isCartLineOnMenu(i, menuItems)
            );
            removeInvalidItems(validSlugs, validIds);
            setError("");
            toast.warning("Cart updated", {
              description:
                "Some items were removed — they're no longer on the menu. Please add fresh items and try again.",
            });
            if (hadOnlyInvalidItems) {
              router.replace("/menu");
            }
          })
          .catch(() => {
            setError(message);
            toast.error("Order failed", { description: message });
          });
      } else {
        setError(message);
        toast.error("Order failed", { description: message });
      }
    },
    [items, removeInvalidItems, router]
  );

  const buildPayloadItems = useCallback(
    (validItems: ReturnType<typeof getValidItems>) =>
      validItems.map((i) => {
        const base = {
          quantity: i.quantity,
          remarks: i.remarks,
          selections: cartSelectionsToPayload(i.selections),
        };
        if (i.slug) {
          return { ...base, slug: normalizeMenuSlug(i.slug) };
        }
        return { ...base, menuId: i.menuId! };
      }),
    []
  );

  const runCreateOrder = useCallback(
    async (
      paymentChoice: "PAY_LATER" | "PAY_NOW",
      receiptUrl?: string
    ) => {
      const validItems = getValidItems();
      const order = await createOrder({
        customerName: form.customerName.trim(),
        phone: form.phone,
        type: form.type,
        paymentChoice,
        receiptUrl:
          paymentChoice === "PAY_NOW" ? receiptUrl : undefined,
        items: buildPayloadItems(validItems),
      });
      clearCart();
      saveLastOrderId(order.id);
      const payNowMsg =
        paymentChoice === "PAY_NOW"
          ? "We received your payment screenshot — we'll confirm on WhatsApp."
          : "You'll receive a WhatsApp confirmation shortly.";
      toast.success("Order placed!", { description: payNowMsg });
      router.push(`/order/success?id=${order.id}`);
    },
    [buildPayloadItems, clearCart, form.customerName, form.phone, form.type, getValidItems, router]
  );

  const validateBeforePaymentModal = (): boolean => {
    setError("");
    if (!form.customerName.trim()) {
      setError("Please enter your name.");
      return false;
    }
    const validItems = getValidItems();
    if (validItems.length === 0) {
      setError(
        "Cart has invalid items. Please go back to the menu and add items again."
      );
      toast.error("Cart needs review", {
        description:
          "Some items are no longer available. Please add fresh items from the menu.",
      });
      return false;
    }
    if (validItems.length < items.length) {
      const slugs = validItems.map((i) => i.slug).filter(Boolean) as string[];
      const ids = validItems.map((i) => i.menuId).filter(Boolean) as string[];
      removeInvalidItems(slugs, ids);
      toast.warning("Cart updated", {
        description: "Some items were removed — they're no longer on the menu.",
      });
    }
    if (!form.phone || !isValidPhoneNumber(form.phone)) {
      setError("Please enter a valid phone number with country code.");
      return false;
    }
    if (form.type === "DELIVERY" && !deliveryAllowed) {
      setError("Cart total is below the minimum for delivery.");
      return false;
    }
    return true;
  };

  const openPaymentModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateBeforePaymentModal()) return;
    setPaymentOpen(true);
  };

  const onPayLater = async () => {
    setLoading(true);
    try {
      await runCreateOrder("PAY_LATER");
      setPaymentOpen(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to place order";
      handleOrderError(err, message);
    } finally {
      setLoading(false);
    }
  };

  const onMarkedPaid = async (file: File) => {
    setUploadingReceipt(true);
    try {
      const { url } = await uploadPaymentReceipt(file);
      setUploadingReceipt(false);
      setLoading(true);
      await runCreateOrder("PAY_NOW", url);
      setPaymentOpen(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to upload or place order";
      setError(message);
      toast.error("Could not complete payment", { description: message });
    } finally {
      setUploadingReceipt(false);
      setLoading(false);
    }
  };

  if (!hydrated) {
    return (
      <div className="space-y-4" aria-busy>
        <div className="space-y-2">
          <div className="h-4 w-16 rounded bg-charcoal/10 animate-pulse" />
          <div className="h-12 w-full rounded-xl bg-charcoal/5 animate-pulse" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-20 rounded bg-charcoal/10 animate-pulse" />
          <div className="h-12 w-full rounded-xl bg-charcoal/5 animate-pulse" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-24 rounded bg-charcoal/10 animate-pulse" />
          <div className="h-12 w-full rounded-xl bg-charcoal/5 animate-pulse" />
        </div>
        <div className="h-14 w-full rounded-xl bg-charcoal/10 animate-pulse" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-charcoal/70">Add items to cart first</p>
        <Button asChild variant="outline" className="mt-4 font-display">
          <a href="/menu">View Menu</a>
        </Button>
      </div>
    );
  }

  const totalLabel = `RM ${total().toFixed(2)}`;
  const busy = loading || uploadingReceipt;

  return (
    <>
      <PaymentChoiceModal
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        qrSrc={paymentQrSrc?.trim() || FALLBACK_PAYMENT_QR}
        totalLabel={totalLabel}
        busy={loading}
        uploading={uploadingReceipt}
        onPayLater={onPayLater}
        onMarkedPaid={onMarkedPaid}
      />
      <form onSubmit={openPaymentModal} className="space-y-4" noValidate>
        {error && (
          <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm">
            {error}
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="name" className="font-display">
            Name
          </Label>
          <Input
            id="name"
            placeholder="Your name"
            value={form.customerName}
            onChange={(e) =>
              setForm((f) => ({ ...f, customerName: e.target.value }))
            }
            required
            autoComplete="name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone" className="font-display">
            Phone
          </Label>
          <PhoneInput
            id="phone"
            international
            defaultCountry="MY"
            limitMaxLength
            placeholder="Enter phone number"
            value={form.phone || undefined}
            onChange={(value) =>
              setForm((f) => ({ ...f, phone: value ?? "" }))
            }
            className="order-form-phone"
            aria-invalid={Boolean(form.phone && !isValidPhoneNumber(form.phone))}
            aria-describedby="phone-hint"
            numberInputProps={{
              autoComplete: "tel",
            }}
          />
          <p id="phone-hint" className="text-caption">
            Pick your country, then enter your number. We&apos;ll confirm on
            WhatsApp.
          </p>
        </div>
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-charcoal/10 bg-white/70 px-4 py-3">
          <div className="space-y-1">
            <Label
              htmlFor="remember-details"
              className="font-display text-sm text-charcoal"
            >
              Remember my name and phone
            </Label>
            <p className="text-caption">
              Saves your checkout details on this device for next time.
            </p>
          </div>
          <Switch
            id="remember-details"
            checked={rememberDetails}
            onCheckedChange={setRememberDetails}
            aria-label="Remember my name and phone"
          />
        </div>
        <div className="space-y-2">
          <Label className="font-display">Order Type</Label>
          <Select
            value={form.type}
            onValueChange={(v: "PICKUP" | "DELIVERY") =>
              setForm((f) => ({ ...f, type: v }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PICKUP">Pickup</SelectItem>
              {deliveryAllowed ? (
                <SelectItem value="DELIVERY">Delivery</SelectItem>
              ) : null}
            </SelectContent>
          </Select>
          {!deliveryAllowed && minDel != null && (
            <p className="text-sm text-charcoal/50">
              Minimum RM{minDel.toFixed(2)} required for delivery. Add more items
              or choose pickup.
            </p>
          )}
        </div>
        <Button
          type="submit"
          size="lg"
          className="w-full font-display"
          disabled={busy}
        >
          {busy && !paymentOpen ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Placing Order...
            </>
          ) : (
            `Place Order · ${totalLabel}`
          )}
        </Button>
      </form>
    </>
  );
}
