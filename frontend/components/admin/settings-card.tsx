"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toggleOrdering } from "@/services/admin.service";
import { Loader2 } from "lucide-react";

interface SettingsCardProps {
  token: string;
  orderingEnabled: boolean;
  onUpdate: () => void;
}

/**
 * Emergency global toggle. Primary capacity and windows are configured per batch.
 */
export function SettingsCard({
  token,
  orderingEnabled,
  onUpdate,
}: SettingsCardProps) {
  const [loading, setLoading] = useState(false);

  const handleToggleOrdering = async () => {
    setLoading(true);
    try {
      await toggleOrdering(!orderingEnabled, token);
      onUpdate();
      toast.success(
        orderingEnabled ? "Global ordering paused" : "Global ordering resumed",
        {
          description: orderingEnabled
            ? "Use only in emergencies — batch windows still control the storefront when enabled."
            : "Combined with published batches for normal operation.",
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
        <CardTitle className="text-lg">Emergency controls</CardTitle>
        <p className="text-sm font-normal text-charcoal/65">
          Create release windows, publish the menu, and set capacity in{" "}
          <Link href="/admin/batches" className="font-medium text-roast-red underline">
            Batches
          </Link>
          . Use this toggle only if you need to stop all orders immediately.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">Global ordering</p>
            <p className="text-sm text-charcoal/70">
              {orderingEnabled ? "Allowed (subject to batch rules)" : "Blocked for everyone"}
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
              "Pause all orders"
            ) : (
              "Resume orders"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
