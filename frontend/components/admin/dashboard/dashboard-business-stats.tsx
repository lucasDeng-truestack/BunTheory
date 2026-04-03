import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ShoppingBag, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  uniqueCustomers: number;
  orderCount: number;
  totalRevenue: number;
  className?: string;
};

export function DashboardBusinessStats({
  uniqueCustomers,
  orderCount,
  totalRevenue,
  className,
}: Props) {
  const aov = orderCount > 0 ? totalRevenue / orderCount : 0;

  return (
    <Card
      className={cn(
        "flex h-full flex-col overflow-hidden border-charcoal/10 shadow-card",
        className
      )}
    >
      <CardHeader className="border-b border-charcoal/10 bg-cream/30">
        <CardTitle className="font-display text-lg text-charcoal lg:text-xl">
          Business snapshot
        </CardTitle>
        <p className="text-sm text-charcoal/65">
          Based on orders in the selected time range.
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 pt-6">
        <div className="rounded-2xl bg-violet-100/80 px-4 py-4 ring-1 ring-violet-200/60">
          <div className="flex items-center gap-2 text-violet-900/90">
            <Users className="h-5 w-5 shrink-0" aria-hidden />
            <span className="font-display text-sm font-semibold">
              Unique customers
            </span>
          </div>
          <p className="font-display mt-2 text-3xl font-bold tabular-nums text-violet-950">
            {uniqueCustomers}
          </p>
        </div>
        <div className="rounded-2xl bg-mustard/25 px-4 py-4 ring-1 ring-mustard/40">
          <div className="flex items-center gap-2 text-charcoal">
            <ShoppingBag className="h-5 w-5 shrink-0" aria-hidden />
            <span className="font-display text-sm font-semibold">
              Total orders
            </span>
          </div>
          <p className="font-display mt-2 text-3xl font-bold tabular-nums text-charcoal">
            {orderCount}
          </p>
        </div>
        <div className="rounded-2xl bg-emerald-100/70 px-4 py-4 ring-1 ring-emerald-200/70">
          <div className="flex items-center gap-2 text-emerald-950/90">
            <Wallet className="h-5 w-5 shrink-0" aria-hidden />
            <span className="font-display text-sm font-semibold">
              Avg. order value
            </span>
          </div>
          <p className="font-display mt-2 text-3xl font-bold tabular-nums text-emerald-950">
            RM {aov.toFixed(2)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
