"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listAppFeedback, type AppFeedbackRow } from "@/services/feedback.service";
import { Loader2, MessageSquareQuote, RefreshCw } from "lucide-react";

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function AdminFeedbackPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AppFeedbackRow[]>([]);

  const load = useCallback(async () => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      router.replace("/admin/login");
      return;
    }
    setLoading(true);
    try {
      const data = await listAppFeedback(token);
      setRows(data);
    } catch {
      router.replace("/admin/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-roast-red" aria-hidden />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Customer feedback"
        description="Notes from the post-checkout feedback modal on the storefront."
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="font-display"
            onClick={() => void load()}
          >
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
            Refresh
          </Button>
        }
      />

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-charcoal/15 bg-white/60 py-16 text-center">
          <MessageSquareQuote className="mb-3 h-10 w-10 text-charcoal/30" aria-hidden />
          <p className="font-display text-lg font-semibold text-charcoal">No feedback yet</p>
          <p className="mt-1 max-w-sm text-pretty text-sm text-charcoal/60">
            When customers complete an order and use the feedback popup, entries will show here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-charcoal/10 bg-white shadow-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-cream/50 hover:bg-cream/50">
                <TableHead className="font-display w-[160px] text-charcoal">Date</TableHead>
                <TableHead className="font-display text-charcoal">Feedback</TableHead>
                <TableHead className="font-display w-[200px] text-charcoal">Order</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} className="align-top">
                  <TableCell className="whitespace-nowrap text-sm text-charcoal/70">
                    {formatWhen(row.createdAt)}
                  </TableCell>
                  <TableCell className="max-w-xl text-sm leading-relaxed text-charcoal">
                    <span className="whitespace-pre-wrap">{row.message}</span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {row.orderId ? (
                      <div className="space-y-0.5">
                        <Link
                          href={`/admin/orders/${row.orderId}`}
                          className="font-mono font-medium text-roast-red underline-offset-4 hover:underline"
                        >
                          #{row.order?.slugId ?? row.orderId.slice(0, 8) + "…"}
                        </Link>
                        {row.order?.customerName ? (
                          <p className="text-xs text-charcoal/60">{row.order.customerName}</p>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-charcoal/45">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
