'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Flame } from 'lucide-react';

type Props = {
  items: Array<{ productId: string | null; name: string; quantitySold: number }>;
};

export function DashboardTopItems({ items }: Props) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="font-display text-base flex items-center gap-2">
          <Flame className="h-4 w-4 text-bbq-flame" />
          Top Sellers
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0!">
        {items.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No sales data yet.
          </p>
        ) : (
          <ul>
            {items.map((item, idx) => (
              <li key={item.productId ?? item.name}>
                <div className="flex items-center gap-3 px-4 py-2.5">
                  <span className="font-display font-black text-lg text-muted-foreground/40 w-6 text-center tabular-nums">
                    {idx + 1}
                  </span>
                  <span className="flex-1 text-sm font-semibold text-foreground truncate">
                    {item.name}
                  </span>
                  <Badge variant="secondary" className="font-display tabular-nums">
                    {item.quantitySold} sold
                  </Badge>
                </div>
                {idx < items.length - 1 && <Separator />}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
