"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toggleOrdering, updateMinimumDelivery } from "@/services/admin.service";
import { sanitizeDecimalInput } from "@/lib/sanitize-input";
import { Loader2 } from "lucide-react";

interface SettingsCardProps {
  token: string;
  orderingEnabled: boolean;
  minimumDeliveryAmount: number | null;
  onUpdate: () => void;
}

export function SettingsCard({
  token,
  orderingEnabled,
  minimumDeliveryAmount,
  onUpdate,
}: SettingsCardProps) {
  const [loading, setLoading] = useState(false);
  const [minDel, setMinDel] = useState(
    minimumDeliveryAmount != null ? String(minimumDeliveryAmount) : ""
  );

  useEffect(() => {
    setMinDel(
      minimumDeliveryAmount != null ? String(minimumDeliveryAmount) : ""
    );
  }, [minimumDeliveryAmount]);

  const handleToggleOrdering = async () => {
    setLoading(true);
    try {
      await toggleOrdering(!orderingEnabled, token);
      onUpdate();
      toast.success(
        orderingEnabled ? "Global ordering paused" : "Global ordering resumed",
        {
          description: orderingEnabled
            ? "Customers cannot place orders until you resume."
            : "Customers can order only during a published batch (see Order batches).",
        }
      );
    } catch {
      toast.error("Failed to update ordering status");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMinDelivery = async () => {
    setLoading(true);
    try {
      const v = minDel.trim();
      const num = v === "" ? null : parseFloat(v);
      if (num != null && (Number.isNaN(num) || num < 0)) {
        toast.error("Enter a valid amount or leave empty");
        setLoading(false);
        return;
      }
      await updateMinimumDelivery(num, token);
      onUpdate();
      toast.success("Delivery minimum updated");
    } catch {
      toast.error("Failed to save");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-charcoal/10 bg-cream/30">
        <CardTitle className="font-display text-lg">Storefront controls</CardTitle>
        <p className="text-sm font-normal text-charcoal/65">
          Edit the live menu under Menu. Set{" "}
          <Link
            href="/admin/batches"
            className="font-medium text-roast-red underline underline-offset-2 hover:text-roast-red/90"
          >
            order batches
          </Link>{" "}
          for time windows and capacity. Use this panel for global ordering and delivery
          rules.
        </p>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium font-display">Global ordering</p>
            <p className="text-sm text-charcoal/70">
              {orderingEnabled
                ? "Allowed when a batch is published and open"
                : "Blocked for everyone"}
            </p>
          </div>
          <Button
            variant={orderingEnabled ? "destructive" : "default"}
            className="font-display"
            onClick={handleToggleOrdering}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : orderingEnabled ? (
              "Pause all orders"
            ) : (
              "Resume orders"
            )}
          </Button>
        </div>

        <div className="space-y-2 border-t border-charcoal/10 pt-6">
          <Label htmlFor="min-del" className="font-display">
            Minimum order for delivery (RM)
          </Label>
          <p className="text-sm text-charcoal/65">
            Leave empty to allow delivery at any cart total (if delivery is offered).
          </p>
          <div className="flex flex-wrap gap-2">
            <Input
              id="min-del"
              type="text"
              inputMode="decimal"
              pattern="[0-9.]*"
              placeholder="e.g. 15"
              value={minDel}
              onChange={(e) => setMinDel(sanitizeDecimalInput(e.target.value))}
              className="max-w-[200px]"
            />
            <Button
              type="button"
              variant="outline"
              className="font-display"
              disabled={loading}
              onClick={() => void handleSaveMinDelivery()}
            >
              Save minimum
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
