"use client";

import { type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  BadgePercent,
} from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  change: number;
  isCurrency?: boolean;
  icon: ReactNode;
  iconClassName: string;
}

export function StatCard({
  title,
  value,
  change,
  isCurrency = false,
  icon,
  iconClassName,
}: StatCardProps) {
  const formatCurrency = useCurrency();
  const isPositive = change >= 0;
  const formattedValue = isCurrency ? formatCurrency(Number(value)) : value;

  return (
    <Card className="bg-card border-border/80 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            iconClassName
          )}
        >
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight text-foreground">
          {formattedValue}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs">
          <span className="font-medium text-primary">vs yesterday</span>
          <span className="inline-flex items-center gap-0.5 font-medium">
            {isPositive ? (
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
            )}
            <span
              className={cn(
                isPositive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              )}
            >
              {Math.abs(change)}%
            </span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

interface StatsCardsProps {
  stats: {
    totalRevenue: number;
    totalOrders: number;
    averagePrice: number;
    revenueChange: number;
    ordersChange: number;
    averagePriceChange: number;
  };
}

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <StatCard
        title="Today's Revenue"
        value={stats.totalRevenue}
        change={stats.revenueChange}
        isCurrency
        icon={<DollarSign className="h-4 w-4" aria-hidden />}
        iconClassName="bg-primary/15 text-primary dark:bg-primary/25 dark:text-primary"
      />
      <StatCard
        title="Today's Orders"
        value={stats.totalOrders}
        change={stats.ordersChange}
        icon={<ShoppingCart className="h-4 w-4" aria-hidden />}
        iconClassName="bg-sky-500/15 text-sky-600 dark:bg-sky-500/25 dark:text-sky-300"
      />
      <StatCard
        title="Average Order Value"
        value={stats.averagePrice}
        change={stats.averagePriceChange}
        isCurrency
        icon={<BadgePercent className="h-4 w-4" aria-hidden />}
        iconClassName="bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/25 dark:text-emerald-300"
      />
    </div>
  );
}
