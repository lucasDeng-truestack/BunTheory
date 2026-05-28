'use client';

import Link from 'next/link';
import {
  ArrowUpRight,
  Banknote,
  ChefHat,
  DollarSign,
  ShoppingBag,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { DashboardSummary } from '@/types/pos';

type Props = {
  pipeline: DashboardSummary['pipeline'];
  today: DashboardSummary['today'];
};

export function DashboardAnalyticsKpis({ pipeline, today }: Props) {
  const activeKitchen =
    pipeline.placed + pipeline.preparing + pipeline.ready;
  const cashPct =
    today.totalRevenue > 0
      ? Math.round((today.cashRevenue / today.totalRevenue) * 1000) / 10
      : 0;

  const cards = [
    {
      label: "Today's Revenue",
      value: `RM ${today.totalRevenue.toFixed(2)}`,
      sub: `${today.completedOrders} orders completed`,
      footer: `AVG ORDER RM ${today.avgOrderValue.toFixed(2)}`,
      icon: DollarSign,
      href: '/reports',
    },
    {
      label: 'Completed Today',
      value: today.completedOrders,
      sub: 'Paid & served',
      footer: `${today.completedOrders > 0 ? '100%' : '0%'} OF TODAY'S GOAL`,
      icon: ShoppingBag,
      href: '/complete-queue',
    },
    {
      label: 'Cash Collected',
      value: `RM ${today.cashRevenue.toFixed(2)}`,
      sub: `QR RM ${today.qrRevenue.toFixed(2)}`,
      footer: `${cashPct}% CASH SHARE`,
      icon: Banknote,
      href: '/reports',
    },
    {
      label: 'Active Kitchen',
      value: activeKitchen,
      sub: `${pipeline.placed} new · ${pipeline.preparing} cooking`,
      footer: `${pipeline.ready} READY FOR PICKUP`,
      icon: ChefHat,
      href: '/kitchen-queue',
      alert: activeKitchen > 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card key={c.label} size="sm">
            <CardHeader>
              <CardDescription className="font-display text-[11px] font-bold uppercase tracking-wide">
                {c.label}
              </CardDescription>
              <Link
                href={c.href}
                className="ml-auto rounded-full p-1 text-muted-foreground/50 transition hover:bg-accent hover:text-foreground"
                aria-label={`Open ${c.label}`}
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </CardHeader>
            <CardContent>
              <p
                className={`font-display text-2xl lg:text-3xl font-black tabular-nums ${
                  c.alert ? 'text-bbq-flame' : 'text-foreground'
                }`}
              >
                {c.value}
              </p>
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{c.sub}</span>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-3">
              <p className="font-display text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {c.footer}
              </p>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
