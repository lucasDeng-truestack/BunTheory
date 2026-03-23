"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateMaxOrders, toggleOrdering } from "@/services/admin.service";
import { Loader2 } from "lucide-react";

interface SettingsCardProps {
  token: string;
  maxOrdersPerDay: number;
  orderingEnabled: boolean;
  onUpdate: () => void;
}

export function SettingsCard({
  token,
  maxOrdersPerDay,
  orderingEnabled,
  onUpdate,
}: SettingsCardProps) {
  const [maxOrders, setMaxOrders] = useState(String(maxOrdersPerDay));
  const [loading, setLoading] = useState(false);

  const handleSaveMaxOrders = async () => {
    const n = parseInt(maxOrders, 10);
    if (isNaN(n) || n < 1) return;
    setLoading(true);
    try {
      await updateMaxOrders(n, token);
      onUpdate();
      toast.success("Settings saved", {
        description: `Max items per day set to ${n}.`,
      });
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOrdering = async () => {
    setLoading(true);
    try {
      await toggleOrdering(!orderingEnabled, token);
      onUpdate();
      toast.success(
        orderingEnabled ? "Ordering closed" : "Ordering opened",
        {
          description: orderingEnabled
            ? "New orders are no longer accepted."
            : "Customers can place orders again.",
        }
      );
    } catch {
      toast.error("Failed to update ordering status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-charcoal/10 bg-cream/30">
        <CardTitle className="text-lg">Settings</CardTitle>
        <p className="text-sm font-normal text-charcoal/65">
          Daily limits and storefront availability.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <div className="space-y-2">
          <Label>Max Items Per Day</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              min={1}
              value={maxOrders}
              onChange={(e) => setMaxOrders(e.target.value)}
              onBlur={handleSaveMaxOrders}
            />
            <Button
              variant="secondary"
              onClick={handleSaveMaxOrders}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Ordering</p>
            <p className="text-sm text-charcoal/70">
              {orderingEnabled ? "Open" : "Closed"} for new orders
            </p>
          </div>
          <Button
            variant={orderingEnabled ? "destructive" : "default"}
            onClick={handleToggleOrdering}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : orderingEnabled ? (
              "Close Ordering"
            ) : (
              "Open Ordering"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
