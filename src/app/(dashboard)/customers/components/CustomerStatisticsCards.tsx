"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrency } from "@/hooks/useCurrency";
import { Users, UserPlus, TrendingUp, CreditCard, Loader2 } from "lucide-react";

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
              <div className="flex items-center justify-center h-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
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
            Total Customers
          </CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalCustomers}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.activeCustomers} active
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            New This Month
          </CardTitle>
          <UserPlus className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.newCustomersThisMonth}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            New customers added
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Top Customer
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {stats.topCustomers.length > 0 ? (
            <>
              <div className="text-lg font-bold">
                {stats.topCustomers[0].name}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatCurrency(stats.topCustomers[0].totalSpent)} lifetime value
              </p>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground mt-1">No data</p>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Pending Payments
          </CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.customersWithPendingPayments}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Customers with installments
          </p>
        </CardContent>
      </Card>
    </div>
  );
}








