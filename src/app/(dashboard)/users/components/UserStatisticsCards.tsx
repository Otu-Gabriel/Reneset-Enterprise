"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Shield, UserCheck, UserX, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  dashboardKpiCardClass,
  dashboardKpiCardContentClass,
  dashboardKpiCardHeaderClass,
  dashboardKpiCardTitleClass,
} from "@/lib/dashboard-card";
import { StatCardsSkeleton } from "@/components/ui/table-skeletons";

interface Statistics {
  total: number;
  byRole: {
    admin: number;
    manager: number;
    employee: number;
  };
  withFullAccess: number;
  activeUsers: number;
}

export function UserStatisticsCards() {
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      const response = await fetch("/api/users?limit=1000");
      if (response.ok) {
        const data = await response.json();
        const users = data.users || [];
        
        const statistics: Statistics = {
          total: users.length,
          byRole: {
            admin: users.filter((u: any) => u.role === "ADMIN").length,
            manager: users.filter((u: any) => u.role === "MANAGER").length,
            employee: users.filter((u: any) => u.role === "EMPLOYEE").length,
          },
          withFullAccess: users.filter((u: any) =>
            u.permissions.includes("FULL_ACCESS")
          ).length,
          activeUsers: users.length, // All users are considered active for now
        };
        
        setStats(statistics);
      }
    } catch (error) {
      console.error("Error fetching statistics:", error);
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
          <CardTitle className={dashboardKpiCardTitleClass}>Total Users</CardTitle>
          {iconWrap(
            Users,
            "bg-primary/15 text-primary dark:bg-primary/25 dark:text-primary"
          )}
        </CardHeader>
        <CardContent className={dashboardKpiCardContentClass}>
          <div className="text-base font-bold tabular-nums text-foreground sm:text-lg">
            {stats.total}
          </div>
          <p className="mt-1 text-[0.625rem] font-medium text-muted-foreground sm:text-[0.6875rem]">
            Registered users
          </p>
        </CardContent>
      </Card>

      <Card className={dashboardKpiCardClass}>
        <CardHeader className={dashboardKpiCardHeaderClass}>
          <CardTitle className={dashboardKpiCardTitleClass}>Admins</CardTitle>
          {iconWrap(
            Shield,
            "bg-purple-500/15 text-purple-700 dark:bg-purple-500/25 dark:text-purple-300"
          )}
        </CardHeader>
        <CardContent className={dashboardKpiCardContentClass}>
          <div className="text-base font-bold tabular-nums text-foreground sm:text-lg">
            {stats.byRole.admin}
          </div>
          <p className="mt-1 text-[0.625rem] font-medium text-muted-foreground sm:text-[0.6875rem]">
            {stats.byRole.manager} Managers, {stats.byRole.employee} Employees
          </p>
        </CardContent>
      </Card>

      <Card className={dashboardKpiCardClass}>
        <CardHeader className={dashboardKpiCardHeaderClass}>
          <CardTitle className={dashboardKpiCardTitleClass}>Full Access</CardTitle>
          {iconWrap(
            UserCheck,
            "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/25 dark:text-emerald-300"
          )}
        </CardHeader>
        <CardContent className={dashboardKpiCardContentClass}>
          <div className="text-base font-bold tabular-nums text-foreground sm:text-lg">
            {stats.withFullAccess}
          </div>
          <p className="mt-1 text-[0.625rem] font-medium text-muted-foreground sm:text-[0.6875rem]">
            Users with full access
          </p>
        </CardContent>
      </Card>

      <Card className={dashboardKpiCardClass}>
        <CardHeader className={dashboardKpiCardHeaderClass}>
          <CardTitle className={dashboardKpiCardTitleClass}>Active Users</CardTitle>
          {iconWrap(
            UserX,
            "bg-sky-500/15 text-sky-700 dark:bg-sky-500/25 dark:text-sky-300"
          )}
        </CardHeader>
        <CardContent className={dashboardKpiCardContentClass}>
          <div className="text-base font-bold tabular-nums text-foreground sm:text-lg">
            {stats.activeUsers}
          </div>
          <p className="mt-1 text-[0.625rem] font-medium text-muted-foreground sm:text-[0.6875rem]">
            Currently active
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

