import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpRight, ChefHat, Clock, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  pending: number;
  preparing: number;
  capacityCurrent: number;
  capacityMax: number;
  className?: string;
};

export function DashboardKpiCards({
  pending,
  preparing,
  capacityCurrent,
  capacityMax,
  className,
}: Props) {
  const pct =
    capacityMax > 0
      ? Math.round((capacityCurrent / capacityMax) * 100)
      : 0;

  return (
    <div
      className={cn(
        "grid gap-4 sm:grid-cols-2 lg:grid-cols-3",
        className
      )}
    >
      <Card className="overflow-hidden border-charcoal/10 shadow-card transition-shadow hover:shadow-card-hover">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-display text-sm font-semibold text-charcoal/70">
                Pending orders
              </p>
              <p className="font-display mt-2 text-4xl font-bold tabular-nums text-charcoal">
                {pending}
              </p>
              <p className="mt-1 text-sm text-charcoal/60">Awaiting prep</p>
            </div>
            <Link
              href="/admin/orders"
              className="rounded-full p-2 text-charcoal/45 transition hover:bg-cream hover:text-roast-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-roast-red"
              aria-label="View orders — pending"
            >
              <ArrowUpRight className="h-5 w-5" />
            </Link>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-sm text-emerald-700/90">
            <Clock className="h-4 w-4 shrink-0" aria-hidden />
            <span>Received status</span>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-charcoal/10 shadow-card transition-shadow hover:shadow-card-hover">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-display text-sm font-semibold text-charcoal/70">
                In progress
              </p>
              <p className="font-display mt-2 text-4xl font-bold tabular-nums text-charcoal">
                {preparing}
              </p>
              <p className="mt-1 text-sm text-charcoal/60">Preparing now</p>
            </div>
            <Link
              href="/admin/orders"
              className="rounded-full p-2 text-charcoal/45 transition hover:bg-cream hover:text-roast-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-roast-red"
              aria-label="View orders — in progress"
            >
              <ArrowUpRight className="h-5 w-5" />
            </Link>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-sm text-charcoal/55">
            <ChefHat className="h-4 w-4 shrink-0" aria-hidden />
            <span>Kitchen active</span>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-charcoal/10 shadow-card transition-shadow hover:shadow-card-hover sm:col-span-2 lg:col-span-1">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-display text-sm font-semibold text-charcoal/70">
                Batch capacity
              </p>
              <p className="font-display mt-2 text-4xl font-bold tabular-nums text-charcoal">
                {capacityCurrent}
                <span className="text-2xl font-semibold text-charcoal/45">
                  {" "}
                  / {capacityMax}
                </span>
              </p>
              <p className="mt-1 text-sm text-charcoal/60">Items this batch</p>
            </div>
            <Link
              href="/admin/batches"
              className="rounded-full p-2 text-charcoal/45 transition hover:bg-cream hover:text-roast-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-roast-red"
              aria-label="View batches"
            >
              <ArrowUpRight className="h-5 w-5" />
            </Link>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-sm text-emerald-800/85">
            <Gauge className="h-4 w-4 shrink-0" aria-hidden />
            <span>{pct}% of batch limit</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
