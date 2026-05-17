'use client';

import Link from 'next/link';
import { ArrowUpRight, ChefHat, Clock, DollarSign, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Props {
  pipeline: { placed: number; preparing: number; ready: number };
  today: {
    completedOrders: number;
    totalRevenue: number;
    cashRevenue: number;
    qrRevenue: number;
  };
}

export function DashboardKpiCards({ pipeline, today }: Props) {
  const cards = [
    {
      label: 'New Orders',
      value: pipeline.placed,
      sub: 'Waiting to cook',
      icon: Clock,
      href: '/kitchen-queue',
      accent: 'text-bbq-flame',
      badgeVariant: 'destructive' as const,
    },
    {
      label: 'Preparing',
      value: pipeline.preparing,
      sub: 'In the kitchen',
      icon: ChefHat,
      href: '/kitchen-queue',
      accent: 'text-bbq-mango',
      badgeVariant: 'secondary' as const,
    },
    {
      label: 'Ready',
      value: pipeline.ready,
      sub: 'For pickup',
      icon: CheckCircle,
      href: '/ready-queue',
      accent: 'text-bbq-green',
      badgeVariant: 'default' as const,
    },
    {
      label: "Today's Revenue",
      value: `RM ${today.totalRevenue.toFixed(2)}`,
      sub: `${today.completedOrders} orders completed`,
      icon: DollarSign,
      href: '/reports',
      accent: 'text-bbq-flame',
      badgeVariant: 'outline' as const,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card key={c.label} size="sm">
            <CardHeader>
              <CardDescription className="font-display text-[11px] font-bold uppercase tracking-wide">
                {c.label}
              </CardDescription>
              <CardAction>
                <Link
                  href={c.href}
                  className="rounded-full p-1 text-muted-foreground/50 transition hover:bg-accent hover:text-foreground"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className={`font-display text-2xl lg:text-3xl font-black tabular-nums ${c.accent}`}>
                {c.value}
              </p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">{c.sub}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
