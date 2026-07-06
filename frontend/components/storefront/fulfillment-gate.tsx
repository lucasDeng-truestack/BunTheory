"use client";

import { useEffect, useState } from "react";
import { Truck, Store, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  useCartStore,
  type CartFulfillment,
  type FulfillmentType,
} from "@/store/cart.store";
import type { PublicSystemSettings } from "@/services/storefront-settings.service";
import { fulfillmentEtaLabel } from "./fulfillment-header";

export interface FulfillmentGateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: PublicSystemSettings | null;
  /** Called after a valid choice is saved (e.g. to reveal the menu). */
  onConfirmed?: (fulfillment: CartFulfillment) => void;
  /** Dismiss handler (e.g. navigate home) when the user backs out without choosing. */
  onDismiss?: () => void;
}

/**
 * McDonald's-MY-style gate: pick Delivery or Pickup (and an address for delivery)
 * before browsing the menu. Persists the choice in the cart store.
 */
export function FulfillmentGate({
  open,
  onOpenChange,
  settings,
  onConfirmed,
  onDismiss,
}: FulfillmentGateProps) {
  const existing = useCartStore((s) => s.fulfillment);
  const setFulfillment = useCartStore((s) => s.setFulfillment);

  const [choice, setChoice] = useState<FulfillmentType | null>(
    existing.type ?? null
  );
  const [address, setAddress] = useState(existing.deliveryAddress ?? "");
  const [notes, setNotes] = useState(existing.deliveryNotes ?? "");
  const [touched, setTouched] = useState(false);

  // Re-sync when reopened after the stored value changes.
  useEffect(() => {
    if (open) {
      setChoice(existing.type ?? null);
      setAddress(existing.deliveryAddress ?? "");
      setNotes(existing.deliveryNotes ?? "");
      setTouched(false);
    }
  }, [open, existing]);

  const eta = fulfillmentEtaLabel(
    choice ?? "PICKUP",
    settings?.prepTimeMinutes
  );
  const outletName = settings?.outletName?.trim() || "Our outlet";
  const outletAddress = settings?.outletAddress?.trim() || null;
  const addressValid = address.trim().length >= 5;
  const canContinue = choice === "PICKUP" || (choice === "DELIVERY" && addressValid);

  const confirm = () => {
    if (!choice) return;
    setTouched(true);
    if (!canContinue) return;
    const next: CartFulfillment =
      choice === "DELIVERY"
        ? {
            type: "DELIVERY",
            deliveryAddress: address.trim(),
            deliveryNotes: notes.trim() || undefined,
          }
        : { type: "PICKUP" };
    setFulfillment(next);
    onConfirmed?.(next);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onDismiss?.();
        onOpenChange(next);
      }}
    >
      <DialogContent className="flex max-h-[min(92vh,760px)] w-[min(calc(100%-1.5rem),28rem)] flex-col gap-0 overflow-hidden rounded-5xl border-2 border-bun-ink p-0 shadow-sticker-lg">
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <DialogHeader className="space-y-1.5 px-6 pt-6 text-left">
            <DialogTitle className="font-display text-2xl font-bold text-bun-ink">
              How would you like your order?
            </DialogTitle>
            <DialogDescription className="text-bun-ink-soft">
              Choose delivery or pickup to start. You can change this later.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 px-6 pt-5">
            <GateOption
              active={choice === "DELIVERY"}
              icon={<Truck className="h-6 w-6" aria-hidden />}
              label="Delivery"
              hint="To your door"
              onClick={() => setChoice("DELIVERY")}
            />
            <GateOption
              active={choice === "PICKUP"}
              icon={<Store className="h-6 w-6" aria-hidden />}
              label="Pickup"
              hint="Collect at outlet"
              onClick={() => setChoice("PICKUP")}
            />
          </div>

          {eta ? (
            <p className="px-6 pt-3 text-center text-sm text-charcoal/55">
              {eta}
            </p>
          ) : null}

          {choice === "DELIVERY" ? (
            <div className="space-y-3 px-6 pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="gate-address" className="font-display text-charcoal">
                  Delivery address
                </Label>
                <Textarea
                  id="gate-address"
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, unit, building…"
                  className="resize-none border-charcoal/15"
                />
                {touched && !addressValid ? (
                  <p className="text-sm text-red-600">
                    Please enter a delivery address.
                  </p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gate-notes" className="font-display text-charcoal">
                  Notes <span className="text-charcoal/45">(optional)</span>
                </Label>
                <Input
                  id="gate-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Gate code, landmark…"
                  className="border-charcoal/15"
                />
              </div>
              {settings?.deliveryRadiusNote ? (
                <p className="text-sm text-charcoal/55">
                  {settings.deliveryRadiusNote}
                </p>
              ) : null}
            </div>
          ) : null}

          {choice === "PICKUP" ? (
            <div className="px-6 pt-4">
              <div className="rounded-2xl border-2 border-bun-ink/15 bg-bun-cream-soft p-4">
                <p className="font-display font-bold text-bun-ink">
                  {outletName}
                </p>
                {outletAddress ? (
                  <p className="mt-0.5 text-sm text-bun-ink-soft">
                    {outletAddress}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="shrink-0 border-t-2 border-bun-ink bg-bun-cream-soft px-6 py-4">
          <Button
            size="lg"
            variant="hero"
            className="w-full gap-2"
            disabled={!choice}
            onClick={confirm}
          >
            Continue to menu
            <ArrowRight className="h-5 w-5" aria-hidden />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GateOption({
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
        "flex flex-col items-center gap-1.5 rounded-2xl border-2 px-4 py-5 text-center transition-all active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bun-red/40 focus-visible:ring-offset-2",
        active
          ? "border-bun-ink bg-bun-yellow shadow-sticker"
          : "border-bun-ink/15 bg-white hover:border-bun-ink/40"
      )}
    >
      <span
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full border-2 border-bun-ink",
          active ? "bg-bun-red text-white" : "bg-white text-bun-ink"
        )}
      >
        {icon}
      </span>
      <span className="font-display font-bold text-bun-ink">{label}</span>
      <span className="text-xs text-bun-ink-soft">{hint}</span>
    </button>
  );
}
