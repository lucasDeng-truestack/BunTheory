import { OrderCounter } from "@/components/order/order-counter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DashboardStatsProps {
  current: number;
  max: number;
  canOrder: boolean;
  batchLabel: string | null;
}

export function DashboardStats({
  current,
  max,
  canOrder,
  batchLabel,
}: DashboardStatsProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-charcoal/10 bg-cream/30">
        <CardTitle className="text-lg">Active batch capacity</CardTitle>
        <p className="text-sm font-normal text-charcoal/65">
          Items sold for the current release window (when ordering is open).
        </p>
      </CardHeader>
      <CardContent className="pt-6">
        <OrderCounter
          current={current}
          max={max}
          canOrder={canOrder}
          batchLabel={batchLabel}
        />
      </CardContent>
    </Card>
  );
}
