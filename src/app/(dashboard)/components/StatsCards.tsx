"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  change: number;
  isCurrency?: boolean;
}

export function StatCard({
  title,
  value,
  change,
  isCurrency = false,
}: StatCardProps) {
  const isPositive = change >= 0;
  const formattedValue = isCurrency ? formatCurrency(Number(value)) : value;

  return (
    <Card className="bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formattedValue}</div>
        <div className="flex items-center gap-1 text-xs mt-1">
          {isPositive ? (
            <TrendingUp className="h-4 w-4 text-green-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500" />
          )}
          <span className={cn(isPositive ? "text-green-500" : "text-red-500")}>
            {Math.abs(change)}%
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
      />
      <StatCard
        title="Today's Orders"
        value={stats.totalOrders}
        change={stats.ordersChange}
      />
      <StatCard
        title="Average Order Value"
        value={stats.averagePrice}
        change={stats.averagePriceChange}
        isCurrency
      />
    </div>
  );
}
