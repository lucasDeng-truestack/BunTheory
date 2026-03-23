"use client";

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

interface OrderTableProps {
  orders: Order[];
  token: string;
  onUpdate?: () => void;
}

export function OrderTable({ orders, token, onUpdate }: OrderTableProps) {
  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    try {
      await updateOrderStatus(orderId, status, token);
      onUpdate?.();
      toast.success("Order status updated", {
        description: `Status set to ${ORDER_STATUS_LABELS[status]}. Customer will receive a WhatsApp notification.`,
      });
    } catch (err) {
      console.error("Failed to update status:", err);
      toast.error("Failed to update order status");
    }
  };

  const formatItems = (order: Order) =>
    order.orderItems
      .map((oi) => {
        const name =
          oi.menuSnapshotItem?.name ?? oi.menu?.name ?? "Item";
        return `${oi.quantity}x ${name}`;
      })
      .join(", ");

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
              <TableHead>Customer</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-mono text-sm">
                  {order.slugId ?? order.id.slice(0, 8)}
                </TableCell>
                <TableCell className="font-medium">{order.customerName}</TableCell>
                <TableCell className="text-charcoal/70">{order.phone}</TableCell>
                <TableCell className="max-w-[200px] truncate text-sm">
                  {formatItems(order)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {order.type.toLowerCase()}
                  </Badge>
                </TableCell>
                <TableCell>
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
                <TableCell className="text-right" />
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
