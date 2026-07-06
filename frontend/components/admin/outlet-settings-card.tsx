"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getSettings, updateOutlet } from "@/services/admin.service";
import {
  sanitizeDecimalInput,
  sanitizeIntegerInput,
} from "@/lib/sanitize-input";
import { Loader2 } from "lucide-react";

interface OutletSettingsCardProps {
  token: string;
  onUpdate?: () => void;
}

/**
 * Single-outlet config: name/address, prep ETA, delivery + processing fees, and
 * the SST rate. Powers the storefront fulfillment header and checkout totals.
 */
export function OutletSettingsCard({ token, onUpdate }: OutletSettingsCardProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [outletName, setOutletName] = useState("");
  const [outletAddress, setOutletAddress] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("");
  const [processingFee, setProcessingFee] = useState("");
  const [taxRate, setTaxRate] = useState("");
  const [radiusNote, setRadiusNote] = useState("");

  const load = useCallback(async () => {
    try {
      const s = await getSettings(token);
      setOutletName(s.outletName?.trim() ?? "");
      setOutletAddress(s.outletAddress?.trim() ?? "");
      setPrepTime(s.prepTimeMinutes != null ? String(s.prepTimeMinutes) : "");
      setDeliveryFee(s.deliveryFee != null ? String(s.deliveryFee) : "");
      setProcessingFee(s.processingFee != null ? String(s.processingFee) : "");
      setTaxRate(s.taxRatePercent != null ? String(s.taxRatePercent) : "6");
      setRadiusNote(s.deliveryRadiusNote?.trim() ?? "");
    } catch {
      /* page-level auth handler covers redirect */
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateOutlet(
        {
          outletName: outletName.trim(),
          outletAddress: outletAddress.trim(),
          deliveryRadiusNote: radiusNote.trim(),
          prepTimeMinutes: prepTime.trim() ? parseInt(prepTime, 10) : null,
          deliveryFee: deliveryFee.trim() ? parseFloat(deliveryFee) : null,
          processingFee: processingFee.trim() ? parseFloat(processingFee) : null,
          taxRatePercent: taxRate.trim() ? parseFloat(taxRate) : 6,
        },
        token
      );
      toast.success("Outlet settings saved");
      onUpdate?.();
    } catch (e) {
      toast.error("Could not save outlet settings", {
        description: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="overflow-hidden border-charcoal/10 shadow-card">
      <CardHeader className="border-b border-charcoal/10 bg-cream/30">
        <CardTitle className="font-display text-lg lg:text-xl">
          Outlet, fees &amp; tax
        </CardTitle>
        <p className="text-sm text-charcoal/65">
          Shown on the storefront fulfillment header and used to compute checkout
          totals. Tax is included in the displayed total (MY SST).
        </p>
      </CardHeader>
      <CardContent className="space-y-5 pt-6">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-roast-red" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="outlet-name" className="font-display">
                  Outlet name
                </Label>
                <Input
                  id="outlet-name"
                  value={outletName}
                  onChange={(e) => setOutletName(e.target.value)}
                  placeholder="e.g. The Bun Theory"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prep-time" className="font-display">
                  Prep time (minutes)
                </Label>
                <Input
                  id="prep-time"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={prepTime}
                  onChange={(e) => setPrepTime(sanitizeIntegerInput(e.target.value))}
                  placeholder="e.g. 30"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="outlet-address" className="font-display">
                Outlet address
              </Label>
              <Textarea
                id="outlet-address"
                rows={2}
                value={outletAddress}
                onChange={(e) => setOutletAddress(e.target.value)}
                placeholder="Shown to pickup customers"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="delivery-fee" className="font-display">
                  Delivery fee (RM)
                </Label>
                <Input
                  id="delivery-fee"
                  inputMode="decimal"
                  pattern="[0-9.]*"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(sanitizeDecimalInput(e.target.value))}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="processing-fee" className="font-display">
                  Processing fee (RM)
                </Label>
                <Input
                  id="processing-fee"
                  inputMode="decimal"
                  pattern="[0-9.]*"
                  value={processingFee}
                  onChange={(e) =>
                    setProcessingFee(sanitizeDecimalInput(e.target.value))
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax-rate" className="font-display">
                  Tax rate (%)
                </Label>
                <Input
                  id="tax-rate"
                  inputMode="decimal"
                  pattern="[0-9.]*"
                  value={taxRate}
                  onChange={(e) => setTaxRate(sanitizeDecimalInput(e.target.value))}
                  placeholder="6"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="radius-note" className="font-display">
                Delivery radius note{" "}
                <span className="font-normal text-charcoal/50">(optional)</span>
              </Label>
              <Input
                id="radius-note"
                value={radiusNote}
                onChange={(e) => setRadiusNote(e.target.value)}
                placeholder="e.g. We deliver within ~5 km of the outlet."
              />
            </div>

            <Button
              type="button"
              className="font-display"
              disabled={saving}
              onClick={() => void handleSave()}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save outlet settings"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
