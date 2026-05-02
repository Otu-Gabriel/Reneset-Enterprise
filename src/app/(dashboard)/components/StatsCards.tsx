"use client";

import { type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  BadgePercent,
  Wallet,
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
  compact?: boolean;
}

export function StatCard({
  title,
  value,
  change,
  isCurrency = false,
  icon,
  iconClassName,
  compact = true,
}: StatCardProps) {
  const formatCurrency = useCurrency();
  const isPositive = change >= 0;
  const formattedValue = isCurrency ? formatCurrency(Number(value)) : value;
  const trendSize = compact ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    <Card className="bg-card border-border/80 shadow-sm">
      <CardHeader
        className={cn(
          "flex flex-row items-center justify-between space-y-0 pb-1",
          compact ? "px-3 pt-3" : "pb-2"
        )}
      >
        <CardTitle
          className={cn(
            "font-medium leading-tight text-muted-foreground",
            compact ? "text-[0.625rem] sm:text-[0.6875rem]" : "text-xs sm:text-sm"
          )}
        >
          {title}
        </CardTitle>
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-md",
            compact ? "h-7 w-7" : "h-9 w-9",
            iconClassName
          )}
        >
          {icon}
        </div>
      </CardHeader>
      <CardContent className={compact ? "px-3 pb-3 pt-0" : undefined}>
        <div
          className={cn(
            "font-bold tabular-nums tracking-tight text-foreground",
            compact ? "text-base sm:text-lg" : "text-xl sm:text-2xl"
          )}
        >
          {formattedValue}
        </div>
        <div
          className={cn(
            "mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5",
            compact ? "text-[0.625rem] sm:text-[0.6875rem]" : "text-xs"
          )}
        >
          <span className="font-medium text-primary">vs yesterday</span>
          <span className="inline-flex items-center gap-0.5 font-medium">
            {isPositive ? (
              <TrendingUp
                className={cn(
                  trendSize,
                  "text-emerald-600 dark:text-emerald-400"
                )}
              />
            ) : (
              <TrendingDown
                className={cn(trendSize, "text-rose-600 dark:text-rose-400")}
              />
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
  /** Today's gross profit (revenue − recorded COGS); admins only. */
  adminProfit?: {
    todayProfit: number;
    profitChange: number;
  };
}

const iconSm = "h-3.5 w-3.5";

export function StatsCards({ stats, adminProfit }: StatsCardsProps) {
  return (
    <div
      className={cn(
        "grid min-w-0 gap-3 sm:grid-cols-2",
        adminProfit ? "lg:grid-cols-4" : "md:grid-cols-3"
      )}
    >
      <StatCard
        title="Today's Revenue"
        value={stats.totalRevenue}
        change={stats.revenueChange}
        isCurrency
        icon={<DollarSign className={iconSm} aria-hidden />}
        iconClassName="bg-primary/15 text-primary dark:bg-primary/25 dark:text-primary"
      />
      <StatCard
        title="Today's Orders"
        value={stats.totalOrders}
        change={stats.ordersChange}
        icon={<ShoppingCart className={iconSm} aria-hidden />}
        iconClassName="bg-sky-500/15 text-sky-600 dark:bg-sky-500/25 dark:text-sky-300"
      />
      <StatCard
        title="Average Order Value"
        value={stats.averagePrice}
        change={stats.averagePriceChange}
        isCurrency
        icon={<BadgePercent className={iconSm} aria-hidden />}
        iconClassName="bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/25 dark:text-emerald-300"
      />
      {adminProfit && (
        <StatCard
          title="Today's gross profit"
          value={adminProfit.todayProfit}
          change={adminProfit.profitChange}
          isCurrency
          icon={<Wallet className={iconSm} aria-hidden />}
          iconClassName="bg-violet-500/15 text-violet-700 dark:text-violet-400 dark:bg-violet-500/25"
        />
      )}
    </div>
  );
}
