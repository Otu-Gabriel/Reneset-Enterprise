"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrency } from "@/hooks/useCurrency";
import { Users, UserPlus, TrendingUp, CreditCard, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  dashboardKpiCardClass,
  dashboardKpiCardContentClass,
  dashboardKpiCardHeaderClass,
  dashboardKpiCardTitleClass,
} from "@/lib/dashboard-card";
import { StatCardsSkeleton } from "@/components/ui/table-skeletons";

interface Statistics {
  totalCustomers: number;
  activeCustomers: number;
  newCustomersThisMonth: number;
  topCustomers: Array<{
    id: string;
    name: string;
    totalSpent: number;
    totalSales: number;
  }>;
  customersWithPendingPayments: number;
}

export function CustomerStatisticsCards() {
  const formatCurrency = useCurrency();
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      const response = await fetch("/api/customers/statistics");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching customer statistics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <StatCardsSkeleton count={4} />;
  }

  if (!stats) return null;

  const iconWrap = (Icon: LucideIcon, tone: string) => (
    <div
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
        tone
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
    </div>
  );

  return (
    <div className="grid min-w-0 gap-3 md:grid-cols-2 lg:grid-cols-4">
      <Card className={dashboardKpiCardClass}>
        <CardHeader className={dashboardKpiCardHeaderClass}>
          <CardTitle className={dashboardKpiCardTitleClass}>
            Total Customers
          </CardTitle>
          {iconWrap(
            Users,
            "bg-primary/15 text-primary dark:bg-primary/25 dark:text-primary"
          )}
        </CardHeader>
        <CardContent className={dashboardKpiCardContentClass}>
          <div className="text-base font-bold tabular-nums text-foreground sm:text-lg">
            {stats.totalCustomers}
          </div>
          <p className="mt-1 text-[0.625rem] font-medium text-muted-foreground sm:text-[0.6875rem]">
            {stats.activeCustomers} active
          </p>
        </CardContent>
      </Card>

      <Card className={dashboardKpiCardClass}>
        <CardHeader className={dashboardKpiCardHeaderClass}>
          <CardTitle className={dashboardKpiCardTitleClass}>
            New This Month
          </CardTitle>
          {iconWrap(
            UserPlus,
            "bg-sky-500/15 text-sky-700 dark:bg-sky-500/25 dark:text-sky-300"
          )}
        </CardHeader>
        <CardContent className={dashboardKpiCardContentClass}>
          <div className="text-base font-bold tabular-nums text-foreground sm:text-lg">
            {stats.newCustomersThisMonth}
          </div>
          <p className="mt-1 text-[0.625rem] font-medium text-muted-foreground sm:text-[0.6875rem]">
            New customers added
          </p>
        </CardContent>
      </Card>

      <Card className={dashboardKpiCardClass}>
        <CardHeader className={dashboardKpiCardHeaderClass}>
          <CardTitle className={dashboardKpiCardTitleClass}>
            Top Customer
          </CardTitle>
          {iconWrap(
            TrendingUp,
            "bg-amber-500/15 text-amber-700 dark:bg-amber-500/25 dark:text-amber-300"
          )}
        </CardHeader>
        <CardContent className={dashboardKpiCardContentClass}>
          {stats.topCustomers.length > 0 ? (
            <>
              <div className="text-base font-bold tabular-nums text-foreground sm:text-lg">
                {stats.topCustomers[0].name}
              </div>
              <p className="mt-1 text-[0.625rem] font-medium text-muted-foreground sm:text-[0.6875rem]">
                {formatCurrency(stats.topCustomers[0].totalSpent)} lifetime value
              </p>
            </>
          ) : (
            <>
              <div className="text-base font-bold tabular-nums text-foreground sm:text-lg">
                -
              </div>
              <p className="mt-1 text-[0.625rem] font-medium text-muted-foreground sm:text-[0.6875rem]">
                No data
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card className={dashboardKpiCardClass}>
        <CardHeader className={dashboardKpiCardHeaderClass}>
          <CardTitle className={dashboardKpiCardTitleClass}>
            Pending Payments
          </CardTitle>
          {iconWrap(
            CreditCard,
            "bg-violet-500/15 text-violet-700 dark:bg-violet-500/25 dark:text-violet-300"
          )}
        </CardHeader>
        <CardContent className={dashboardKpiCardContentClass}>
          <div className="text-base font-bold tabular-nums text-foreground sm:text-lg">
            {stats.customersWithPendingPayments}
          </div>
          <p className="mt-1 text-[0.625rem] font-medium text-muted-foreground sm:text-[0.6875rem]">
            Customers with installments
          </p>
        </CardContent>
      </Card>
    </div>
  );
}








