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
        <CardTitle className="text-lg">Daily kitchen capacity</CardTitle>
        <p className="text-sm font-normal text-charcoal/65">
          Item totals for the current published batch versus that batch&apos;s limit.
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
