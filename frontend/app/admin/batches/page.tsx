"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  listBatches,
  createBatch,
  publishBatch,
  closeBatch,
  type OrderBatchListItem,
} from "@/services/batches.service";
import { toast } from "sonner";
import { Loader2, BookOpenCheck, Lock } from "lucide-react";

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminBatchesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [batches, setBatches] = useState<OrderBatchListItem[]>([]);
  const [saving, setSaving] = useState(false);

  const [label, setLabel] = useState("");
  const [fulfillmentDate, setFulfillmentDate] = useState("");
  const [opensAt, setOpensAt] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [maxItems, setMaxItems] = useState("30");

  const load = useCallback(async () => {
    const t = localStorage.getItem("admin_token");
    if (!t) {
      router.replace("/admin/login");
      return;
    }
    setToken(t);
    try {
      const list = await listBatches(t);
      setBatches(list);
    } catch {
      router.replace("/admin/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const now = new Date();
    const open = new Date(now);
    const close = new Date(now);
    close.setDate(close.getDate() + 3);
    setOpensAt(toLocalInput(open));
    setClosesAt(toLocalInput(close));
    setFulfillmentDate(now.toISOString().slice(0, 10));
    void load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const max = parseInt(maxItems, 10);
    if (isNaN(max) || max < 1) {
      toast.error("Enter a valid capacity");
      return;
    }
    if (!fulfillmentDate || !opensAt || !closesAt) {
      toast.error("Fill in all dates");
      return;
    }
    setSaving(true);
    try {
      await createBatch(
        {
          label: label.trim() || undefined,
          fulfillmentDate: new Date(fulfillmentDate).toISOString(),
          opensAt: new Date(opensAt).toISOString(),
          closesAt: new Date(closesAt).toISOString(),
          maxItems: max,
        },
        token
      );
      toast.success("Batch created", {
        description: "Publish when the draft menu is ready.",
      });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create batch");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (id: string) => {
    if (!token) return;
    setSaving(true);
    try {
      await publishBatch(id, token);
      toast.success("Menu published", {
        description: "Customers see items when the batch window is open.",
      });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async (id: string) => {
    if (!token) return;
    setSaving(true);
    try {
      await closeBatch(id, token);
      toast.success("Batch closed");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Close failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading && batches.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-roast-red" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Batches"
        description="Create a Thursday (or pickup) release, publish the current draft menu when ready, and close early if needed."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/menu">Edit draft menu</Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">New batch</CardTitle>
          <p className="text-sm text-charcoal/65">
            Draft menu is edited under Menu — publishing copies it into this batch.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="batch-label">Label (optional)</Label>
              <Input
                id="batch-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. March Thursday drop"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fulfillment">Fulfillment date</Label>
              <Input
                id="fulfillment"
                type="date"
                value={fulfillmentDate}
                onChange={(e) => setFulfillmentDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-items">Max items (capacity)</Label>
              <Input
                id="max-items"
                type="number"
                min={1}
                value={maxItems}
                onChange={(e) => setMaxItems(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="opens">Opens at</Label>
              <Input
                id="opens"
                type="datetime-local"
                value={opensAt}
                onChange={(e) => setOpensAt(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="closes">Closes at</Label>
              <Input
                id="closes"
                type="datetime-local"
                value={closesAt}
                onChange={(e) => setClosesAt(e.target.value)}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create batch"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold text-charcoal">All batches</h2>
        <ul className="mt-4 space-y-3">
          {batches.map((b) => (
            <li
              key={b.id}
              className="flex flex-col gap-3 rounded-2xl border border-charcoal/10 bg-white p-4 shadow-card sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold text-charcoal">
                  {b.label?.trim() ||
                    new Date(b.fulfillmentDate).toLocaleDateString(undefined, {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                </p>
                <p className="text-sm text-charcoal/65">
                  {b.status} · max {b.maxItems} items · {b._count.orders} orders
                </p>
                <p className="text-xs text-charcoal/50">
                  {new Date(b.opensAt).toLocaleString()} →{" "}
                  {new Date(b.closesAt).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {b.status === "DRAFT" && (
                  <Button
                    size="sm"
                    onClick={() => handlePublish(b.id)}
                    disabled={saving}
                  >
                    <BookOpenCheck className="mr-1.5 h-4 w-4" />
                    Publish menu
                  </Button>
                )}
                {b.status === "PUBLISHED" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleClose(b.id)}
                    disabled={saving}
                  >
                    <Lock className="mr-1.5 h-4 w-4" />
                    Close batch
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
        {batches.length === 0 && (
          <p className="mt-4 text-sm text-charcoal/60">No batches yet.</p>
        )}
      </div>
    </div>
  );
}
