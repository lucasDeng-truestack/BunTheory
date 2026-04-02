"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import { useHydrated } from "@/hooks/use-hydrated";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { saveLastOrderId } from "@/lib/last-order";
import { getMenuValidityLists, isCartLineOnMenu } from "@/lib/cart-menu-validation";
import { normalizeMenuSlug } from "@/lib/menu-slug";
import { Loader2 } from "lucide-react";

type OrderFormProps = {
  minimumDeliveryAmount?: number | null;
};

export function OrderForm({ minimumDeliveryAmount }: OrderFormProps) {
  const router = useRouter();
  const hydrated = useHydrated();
  const { items, total, clearCart, removeInvalidItems } = useCartStore();
  const cartTotal = useCartStore((s) =>
    s.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const validItems = items.filter((i) => i.slug || i.menuId);
    if (validItems.length === 0) {
      setError("Cart has invalid items. Please go back to the menu and add items again.");
      toast.error("Cart needs review", {
        description: "Some items are no longer available. Please add fresh items from the menu.",
      });
      setLoading(false);
      return;
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
      setLoading(false);
      return;
    }

    if (form.type === "DELIVERY" && !deliveryAllowed) {
      setError("Cart total is below the minimum for delivery.");
      setLoading(false);
      return;
    }

    try {
      const order = await createOrder({
        customerName: form.customerName,
        phone: form.phone,
        type: form.type,
        items: validItems.map((i) => {
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
      });
      clearCart();
      saveLastOrderId(order.id);
      toast.success("Order placed!", {
        description: "You'll receive a WhatsApp confirmation shortly.",
      });
      router.push(`/order/success?id=${order.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to place order";

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
              description: "Some items were removed — they're no longer on the menu. Please add fresh items and try again.",
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
    } finally {
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
          onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
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
          Pick your country, then enter your number. We&apos;ll confirm on WhatsApp.
        </p>
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
            Minimum RM{minDel.toFixed(2)} required for delivery. Add more items or choose
            pickup.
          </p>
        )}
      </div>
      <Button type="submit" size="lg" className="w-full font-display" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Placing Order...
          </>
        ) : (
          `Place Order · RM ${total().toFixed(2)}`
        )}
      </Button>
    </form>
  );
}
