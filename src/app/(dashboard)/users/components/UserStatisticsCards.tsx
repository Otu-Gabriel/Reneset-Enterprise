"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Shield, UserCheck, UserX } from "lucide-react";

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
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-card">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Loading...
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">---</div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Users
          </CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Registered users
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Admins
          </CardTitle>
          <Shield className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.byRole.admin}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.byRole.manager} Managers, {stats.byRole.employee} Employees
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Full Access
          </CardTitle>
          <UserCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.withFullAccess}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Users with full access
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Active Users
          </CardTitle>
          <UserX className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.activeUsers}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Currently active
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

