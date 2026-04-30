"use client";

import {
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
  type ReactNode,
} from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrency } from "@/hooks/useCurrency";
import { DollarSign, Calendar, TrendingUp, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface Statistics {
  today: { total: number; count: number };
  week: { total: number; count: number };
  month: { total: number; count: number };
  bestSellingProduct: { name: string; quantity: number; revenue: number };
}

export interface SalesStatisticsCardsRef {
  refresh: () => void;
}

export const SalesStatisticsCards = forwardRef<SalesStatisticsCardsRef>((props, ref) => {
  const formatCurrency = useCurrency();
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      const response = await fetch("/api/sales/statistics");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching statistics:", error);
    } finally {
      setLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({
    refresh: fetchStatistics,
  }));

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-card border-border/80 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">
                Loading...
              </CardTitle>
              <div className="h-9 w-9 animate-pulse rounded-lg bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-28 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const iconTile = (icon: ReactNode, className: string) => (
    <div
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
        className
      )}
    >
      {icon}
    </div>
  );

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="bg-card border-border/80 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">
            Today&apos;s Sales
          </CardTitle>
          {iconTile(
            <Calendar className="h-4 w-4" />,
            "bg-primary/15 text-primary dark:bg-primary/25 dark:text-primary"
          )}
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold tracking-tight tabular-nums text-foreground sm:text-2xl">
            {formatCurrency(stats.today.total)}
          </div>
          <p className="mt-1 text-xs font-medium text-primary">
            {stats.today.count} {stats.today.count === 1 ? "sale" : "sales"}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card border-border/80 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">
            This Week
          </CardTitle>
          {iconTile(
            <TrendingUp className="h-4 w-4" />,
            "bg-sky-500/15 text-sky-600 dark:bg-sky-500/25 dark:text-sky-300"
          )}
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold tracking-tight tabular-nums text-foreground sm:text-2xl">
            {formatCurrency(stats.week.total)}
          </div>
          <p className="mt-1 text-xs font-medium text-primary">
            {stats.week.count} {stats.week.count === 1 ? "sale" : "sales"}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card border-border/80 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">
            This Month
          </CardTitle>
          {iconTile(
            <DollarSign className="h-4 w-4" />,
            "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/25 dark:text-emerald-300"
          )}
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold tracking-tight tabular-nums text-foreground sm:text-2xl">
            {formatCurrency(stats.month.total)}
          </div>
          <p className="mt-1 text-xs font-medium text-primary">
            {stats.month.count} {stats.month.count === 1 ? "sale" : "sales"}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card border-border/80 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">
            Best Selling Product
          </CardTitle>
          {iconTile(
            <Package className="h-4 w-4" />,
            "bg-amber-500/15 text-amber-700 dark:bg-amber-500/25 dark:text-amber-300"
          )}
        </CardHeader>
        <CardContent>
          <div className="text-lg font-bold leading-snug text-foreground">
            {stats.bestSellingProduct.name}
          </div>
          <p className="mt-1 text-xs font-medium text-primary">
            {stats.bestSellingProduct.quantity} units sold
          </p>
          <p className="text-xs font-medium text-primary">
            {formatCurrency(stats.bestSellingProduct.revenue)} revenue
          </p>
        </CardContent>
      </Card>
    </div>
  );
});

SalesStatisticsCards.displayName = "SalesStatisticsCards";