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
import {
  dashboardKpiCardClass,
  dashboardKpiCardContentClass,
  dashboardKpiCardHeaderClass,
  dashboardKpiCardTitleClass,
} from "@/lib/dashboard-card";
import { StatCardsSkeleton } from "@/components/ui/table-skeletons";

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
    return <StatCardsSkeleton count={4} />;
  }

  if (!stats) return null;

  const iconTile = (icon: ReactNode, className: string) => (
    <div
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
        className
      )}
    >
      {icon}
    </div>
  );

  return (
    <div className="grid min-w-0 gap-3 md:grid-cols-2 lg:grid-cols-4">
      <Card className={dashboardKpiCardClass}>
        <CardHeader className={dashboardKpiCardHeaderClass}>
          <CardTitle className={dashboardKpiCardTitleClass}>
            Today&apos;s Sales
          </CardTitle>
          {iconTile(
            <Calendar className="h-4 w-4" />,
            "bg-primary/15 text-primary dark:bg-primary/25 dark:text-primary"
          )}
        </CardHeader>
        <CardContent className={dashboardKpiCardContentClass}>
          <div className="text-base font-bold tabular-nums tracking-tight text-foreground sm:text-lg">
            {formatCurrency(stats.today.total)}
          </div>
          <p className="mt-1 text-xs font-medium text-primary">
            {stats.today.count} {stats.today.count === 1 ? "sale" : "sales"}
          </p>
        </CardContent>
      </Card>

      <Card className={dashboardKpiCardClass}>
        <CardHeader className={dashboardKpiCardHeaderClass}>
          <CardTitle className={dashboardKpiCardTitleClass}>This Week</CardTitle>
          {iconTile(
            <TrendingUp className="h-4 w-4" />,
            "bg-sky-500/15 text-sky-600 dark:bg-sky-500/25 dark:text-sky-300"
          )}
        </CardHeader>
        <CardContent className={dashboardKpiCardContentClass}>
          <div className="text-base font-bold tabular-nums tracking-tight text-foreground sm:text-lg">
            {formatCurrency(stats.week.total)}
          </div>
          <p className="mt-1 text-xs font-medium text-primary">
            {stats.week.count} {stats.week.count === 1 ? "sale" : "sales"}
          </p>
        </CardContent>
      </Card>

      <Card className={dashboardKpiCardClass}>
        <CardHeader className={dashboardKpiCardHeaderClass}>
          <CardTitle className={dashboardKpiCardTitleClass}>This Month</CardTitle>
          {iconTile(
            <DollarSign className="h-4 w-4" />,
            "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/25 dark:text-emerald-300"
          )}
        </CardHeader>
        <CardContent className={dashboardKpiCardContentClass}>
          <div className="text-base font-bold tabular-nums tracking-tight text-foreground sm:text-lg">
            {formatCurrency(stats.month.total)}
          </div>
          <p className="mt-1 text-xs font-medium text-primary">
            {stats.month.count} {stats.month.count === 1 ? "sale" : "sales"}
          </p>
        </CardContent>
      </Card>

      <Card className={dashboardKpiCardClass}>
        <CardHeader className={dashboardKpiCardHeaderClass}>
          <CardTitle className={dashboardKpiCardTitleClass}>
            Best Selling Product
          </CardTitle>
          {iconTile(
            <Package className="h-4 w-4" />,
            "bg-amber-500/15 text-amber-700 dark:bg-amber-500/25 dark:text-amber-300"
          )}
        </CardHeader>
        <CardContent className={dashboardKpiCardContentClass}>
          <div className="text-base font-bold leading-snug text-foreground sm:text-lg">
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