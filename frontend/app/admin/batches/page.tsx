"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchBatches,
  createBatch,
  updateBatch,
  publishBatch,
  closeBatch,
  reopenBatch,
  deleteBatch,
  type OrderBatchRow,
} from "@/services/batches.service";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, Rocket } from "lucide-react";

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtRange(row: OrderBatchRow): string {
  const a = new Date(row.opensAt);
  const b = new Date(row.closesAt);
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  };
  return `${a.toLocaleString(undefined, opts)} → ${b.toLocaleString(undefined, opts)}`;
}

export default function AdminBatchesPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<OrderBatchRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<OrderBatchRow | null>(null);
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
      const list = await fetchBatches(t);
      setRows(list);
    } catch {
      router.replace("/admin/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setLabel("");
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    setFulfillmentDate(`${y}-${m}-${d}`);
    setOpensAt(toDatetimeLocal(new Date().toISOString()));
    const later = new Date(Date.now() + 3 * 60 * 60 * 1000);
    setClosesAt(toDatetimeLocal(later.toISOString()));
    setMaxItems("30");
    setDialogOpen(true);
  };

  const openEdit = (row: OrderBatchRow) => {
    setEditing(row);
    setLabel(row.label ?? "");
    setFulfillmentDate(row.fulfillmentDate.slice(0, 10));
    setOpensAt(toDatetimeLocal(row.opensAt));
    setClosesAt(toDatetimeLocal(row.closesAt));
    setMaxItems(String(row.maxItems));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!token) return;
    const max = parseInt(maxItems, 10);
    if (Number.isNaN(max) || max < 1) {
      toast.error("Enter a valid max item count");
      return;
    }
    const o = new Date(opensAt);
    const c = new Date(closesAt);
    if (o >= c) {
      toast.error("End time must be after start time");
      return;
    }
    setBusy("save");
    try {
      if (editing) {
        await updateBatch(
          editing.id,
          {
            label: label.trim() || undefined,
            fulfillmentDate,
            opensAt: o.toISOString(),
            closesAt: c.toISOString(),
            maxItems: max,
          },
          token
        );
        toast.success("Batch updated");
      } else {
        await createBatch(
          {
            label: label.trim() || undefined,
            fulfillmentDate,
            opensAt: o.toISOString(),
            closesAt: c.toISOString(),
            maxItems: max,
          },
          token
        );
        toast.success("Batch created (draft)");
      }
      setDialogOpen(false);
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save";
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  };

  const handlePublish = async (row: OrderBatchRow) => {
    if (!token) return;
    setBusy(row.id);
    try {
      await publishBatch(row.id, token);
      toast.success("Batch published — customers can order when the window opens");
      await load();
    } catch {
      toast.error("Could not publish (check for overlapping batches)");
    } finally {
      setBusy(null);
    }
  };

  const handleClose = async (row: OrderBatchRow) => {
    if (!token) return;
    setBusy(row.id);
    try {
      await closeBatch(row.id, token);
      toast.success("Batch closed");
      await load();
    } catch {
      toast.error("Failed to close batch");
    } finally {
      setBusy(null);
    }
  };

  const handleReopen = async (row: OrderBatchRow) => {
    if (!token) return;
    setBusy(row.id);
    try {
      await reopenBatch(row.id, token);
      toast.success("Batch reopened — live again if the window is still valid");
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not reopen batch";
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async (row: OrderBatchRow) => {
    if (!token) return;
    if (!confirm("Delete this draft batch?")) return;
    setBusy(row.id);
    try {
      await deleteBatch(row.id, token);
      toast.success("Draft deleted");
      await load();
    } catch {
      toast.error("Could not delete");
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-roast-red" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Order batches"
        description="Time windows when customers can order from the live menu. Publish a batch when you’re ready; capacity is per batch."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/dashboard">Dashboard</Link>
            </Button>
            <Button size="sm" className="font-display" onClick={openCreate}>
              <Plus className="mr-1.5 h-4 w-4" />
              New batch
            </Button>
          </div>
        }
      />

      <div className="overflow-hidden rounded-2xl border border-charcoal/10 bg-white shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Label</TableHead>
              <TableHead>Day</TableHead>
              <TableHead>Window</TableHead>
              <TableHead>Max items</TableHead>
              <TableHead>Orders</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-charcoal/60">
                  No batches yet. Create one to start accepting orders.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    {row.label?.trim() || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-charcoal/70">
                    {row.fulfillmentDate.slice(0, 10)}
                  </TableCell>
                  <TableCell className="max-w-[200px] text-sm text-charcoal/80">
                    {fmtRange(row)}
                  </TableCell>
                  <TableCell className="tabular-nums">{row.maxItems}</TableCell>
                  <TableCell className="tabular-nums">{row._count.orders}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        row.status === "PUBLISHED"
                          ? "default"
                          : row.status === "CLOSED"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-2">
                      {row.status === "DRAFT" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10"
                            aria-label="Edit"
                            disabled={busy === row.id}
                            onClick={() => openEdit(row)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 text-roast-red"
                            aria-label="Delete"
                            disabled={busy === row.id}
                            onClick={() => void handleDelete(row)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <div
                            className="flex items-center gap-2 rounded-full border border-charcoal/10 bg-charcoal/[0.03] px-2 py-1"
                            title="Publish this batch to open it for customers"
                          >
                            <span className="font-display text-xs text-charcoal/60">
                              Draft
                            </span>
                            <Switch
                              checked={false}
                              disabled
                              onCheckedChange={() => undefined}
                              aria-label="Not open — publish first"
                            />
                          </div>
                          <Button
                            variant="default"
                            size="sm"
                            className="font-display"
                            disabled={busy === row.id}
                            onClick={() => void handlePublish(row)}
                          >
                            {busy === row.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Rocket className="mr-1 h-3.5 w-3.5" />
                                Publish
                              </>
                            )}
                          </Button>
                        </>
                      )}
                      {row.status === "PUBLISHED" && (
                        <div className="flex items-center gap-2 rounded-full border border-charcoal/10 bg-charcoal/[0.03] px-2 py-1">
                          <span className="font-display text-xs text-charcoal/70">
                            Open
                          </span>
                          <Switch
                            checked
                            disabled={busy === row.id}
                            onCheckedChange={(next) => {
                              if (!next) void handleClose(row);
                            }}
                            aria-label="Batch open — turn off to close early"
                          />
                        </div>
                      )}
                      {row.status === "CLOSED" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10"
                            aria-label="Edit times before reopening"
                            disabled={busy === row.id}
                            onClick={() => openEdit(row)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <div
                            className="flex items-center gap-2 rounded-full border border-charcoal/10 bg-charcoal/[0.03] px-2 py-1"
                            title="Turn on to publish again. If the window ended, edit dates first."
                          >
                            <span className="font-display text-xs text-charcoal/50">
                              Closed
                            </span>
                            <Switch
                              checked={false}
                              disabled={busy === row.id}
                              onCheckedChange={(next) => {
                                if (next) void handleReopen(row);
                              }}
                              aria-label="Reopen batch"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editing ? "Edit batch" : "New batch"}
            </DialogTitle>
            <DialogDescription>
              Draft batches are not visible to customers until you publish. Only one
              published batch can overlap in time.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="sess-label">Label (optional)</Label>
              <Input
                id="sess-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Lunch pickup, Saturday dinner"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sess-day">Fulfillment date</Label>
              <Input
                id="sess-day"
                type="date"
                value={fulfillmentDate}
                onChange={(e) => setFulfillmentDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sess-open">Opens</Label>
              <Input
                id="sess-open"
                type="datetime-local"
                value={opensAt}
                onChange={(e) => setOpensAt(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sess-close">Closes</Label>
              <Input
                id="sess-close"
                type="datetime-local"
                value={closesAt}
                onChange={(e) => setClosesAt(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sess-max">Max item totals (capacity)</Label>
              <Input
                id="sess-max"
                type="number"
                min={1}
                value={maxItems}
                onChange={(e) => setMaxItems(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="font-display"
              disabled={busy === "save"}
              onClick={() => void handleSave()}
            >
              {busy === "save" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editing ? (
                "Save"
              ) : (
                "Create draft batch"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
