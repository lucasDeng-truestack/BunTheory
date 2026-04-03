"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ORDER_STATUS_LABELS, ORDER_STATUS_STEPS } from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Order, OrderStatus } from "@/types/order";
import { updateOrderStatus } from "@/services/orders.service";
import { useAdminChrome } from "@/components/admin/admin-chrome-context";
import { OrderLineItemExtras } from "@/components/order/order-line-item-extras";
import {
  paymentChoiceLabel,
  receiptStatusLabel,
} from "@/lib/order-payment-labels";

interface OrderTableProps {
  orders: Order[];
  token: string;
  onUpdate?: () => void;
}

export function OrderTable({ orders, token, onUpdate }: OrderTableProps) {
  const router = useRouter();
  const { refreshPendingOrdersCount } = useAdminChrome();

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    try {
      await updateOrderStatus(orderId, status, token);
      void refreshPendingOrdersCount();
      onUpdate?.();
      toast.success("Order status updated", {
        description: `Status set to ${ORDER_STATUS_LABELS[status]}. Customer will receive a WhatsApp notification.`,
      });
    } catch (err) {
      console.error("Failed to update status:", err);
      toast.error("Failed to update order status");
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-charcoal/10 bg-white py-16 text-center shadow-card text-charcoal/70">
        <p className="text-lg font-medium">No orders match your filters</p>
        <p className="mt-1 text-sm">Try adjusting the date range or customer filter.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-charcoal/10 bg-white shadow-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Receipt</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead className="text-right">View</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => {
              const receiptLabel = receiptStatusLabel(order);
              return (
              <TableRow
                key={order.id}
                className="cursor-pointer hover:bg-cream/40"
                onClick={() => router.push(`/admin/orders/${order.id}`)}
              >
                <TableCell className="font-mono text-sm">
                  {order.slugId ?? order.id.slice(0, 8)}
                </TableCell>
                <TableCell className="max-w-[120px] truncate text-sm text-charcoal/80">
                  {order.batch?.label?.trim() ||
                    (order.batchId ? order.batchId.slice(0, 8) : "—")}
                </TableCell>
                <TableCell className="font-medium">{order.customerName}</TableCell>
                <TableCell className="text-charcoal/70">{order.phone}</TableCell>
                <TableCell className="max-w-[min(100vw,22rem)] align-top text-sm sm:max-w-sm">
                  <div className="space-y-3 py-0.5">
                    {order.orderItems.map((oi) => (
                      <div
                        key={oi.id}
                        className="border-b border-charcoal/10 pb-2.5 last:border-0 last:pb-0"
                      >
                        <p className="font-medium leading-snug text-charcoal">
                          <span className="text-roast-red">{oi.quantity}×</span>{" "}
                          {oi.menu?.name ?? "Item"}
                        </p>
                        <OrderLineItemExtras oi={oi} className="mt-1" />
                      </div>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {order.type.toLowerCase()}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-charcoal/80">
                  {paymentChoiceLabel(order)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      receiptLabel === "Received"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                        : receiptLabel === "Pending"
                          ? "border-amber-200 bg-amber-50 text-amber-900"
                          : "text-charcoal/70"
                    }
                  >
                    {receiptLabel}
                  </Badge>
                </TableCell>
                <TableCell
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <Select
                    value={order.status}
                    onValueChange={(v) => handleStatusChange(order.id, v as OrderStatus)}
                  >
                    <SelectTrigger className="w-[140px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ORDER_STATUS_STEPS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {ORDER_STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-sm text-charcoal/70">
                  {formatDate(order.createdAt)}
                </TableCell>
                <TableCell className="text-right text-sm font-medium text-roast-red">
                  Open
                </TableCell>
              </TableRow>
            );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
