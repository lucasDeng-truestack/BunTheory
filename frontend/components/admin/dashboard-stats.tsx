import { OrderCounter } from "@/components/order/order-counter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DashboardStatsProps {
  orderCount: number;
  maxOrders: number;
  orderingEnabled: boolean;
}

export function DashboardStats({
  orderCount,
  maxOrders,
  orderingEnabled,
}: DashboardStatsProps) {
  const canOrder = orderingEnabled && orderCount < maxOrders;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-charcoal/10 bg-cream/30">
        <CardTitle className="text-lg">Capacity today</CardTitle>
        <p className="text-sm font-normal text-charcoal/65">
          Tracks items sold against your daily limit (ordering must be open).
        </p>
      </CardHeader>
      <CardContent className="pt-6">
        <OrderCounter current={orderCount} max={maxOrders} canOrder={canOrder} />
      </CardContent>
    </Card>
  );
}
