import { StatsCards } from "./components/StatsCards";
import { SalesOverview, SalesByCategory } from "./components/Chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { Permission } from "@prisma/client";
import { hasPermission } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

async function getDashboardStats() {
  const now = new Date();

  // Today's date range (start of today to end of today)
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  // Yesterday's date range
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const yesterdayEnd = new Date(todayEnd);
  yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);

  // Get today's sales
  const todaySales = await prisma.sale.findMany({
    where: {
      saleDate: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
    include: {
      items: true,
    },
  });

  // Get yesterday's sales
  const yesterdaySales = await prisma.sale.findMany({
    where: {
      saleDate: {
        gte: yesterdayStart,
        lte: yesterdayEnd,
      },
    },
    include: {
      items: true,
    },
  });

  const todayRevenue = todaySales.reduce(
    (sum, sale) => sum + sale.totalAmount,
    0
  );
  const yesterdayRevenue = yesterdaySales.reduce(
    (sum, sale) => sum + sale.totalAmount,
    0
  );

  const todayOrders = todaySales.length;
  const yesterdayOrders = yesterdaySales.length;

  const todayAvgPrice = todayOrders > 0 ? todayRevenue / todayOrders : 0;
  const yesterdayAvgPrice =
    yesterdayOrders > 0 ? yesterdayRevenue / yesterdayOrders : 0;

  const revenueChange =
    yesterdayRevenue > 0
      ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100)
      : todayRevenue > 0
        ? 100
        : 0;

  const ordersChange =
    yesterdayOrders > 0
      ? Math.round(((todayOrders - yesterdayOrders) / yesterdayOrders) * 100)
      : todayOrders > 0
        ? 100
        : 0;

  const avgPriceChange =
    yesterdayAvgPrice > 0
      ? Math.round(
          ((todayAvgPrice - yesterdayAvgPrice) / yesterdayAvgPrice) * 100
        )
      : todayAvgPrice > 0
        ? 100
        : 0;

  return {
    totalRevenue: todayRevenue,
    totalOrders: todayOrders,
    averagePrice: todayAvgPrice,
    revenueChange,
    ordersChange,
    averagePriceChange: avgPriceChange,
  };
}

async function getSalesOverview() {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  // Get hourly data for today
  const data = [];

  for (let hour = 0; hour < 24; hour++) {
    const hourStart = new Date(todayStart);
    hourStart.setHours(hour, 0, 0, 0);
    const hourEnd = new Date(todayStart);
    hourEnd.setHours(hour, 59, 59, 999);

    const sales = await prisma.sale.findMany({
      where: {
        saleDate: {
          gte: hourStart,
          lte: hourEnd,
        },
      },
    });

    const revenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);

    data.push({
      hour: hour.toString().padStart(2, "0") + ":00",
      revenue: revenue,
    });
  }

  return data;
}

async function getCategorySales() {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  // Get only today's sales
  const sales = await prisma.sale.findMany({
    where: {
      saleDate: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  const categoryMap = new Map<string, number>();

  sales.forEach((sale) => {
    sale.items.forEach((item) => {
      const category = item.product.category;
      const current = categoryMap.get(category) || 0;
      categoryMap.set(category, current + item.subtotal);
    });
  });

  const total = Array.from(categoryMap.values()).reduce(
    (sum, val) => sum + val,
    0
  );

  const data = Array.from(categoryMap.entries())
    .map(([category, value]) => ({
      category,
      value,
      percentage: total > 0 ? Math.round((value / total) * 100) : 0,
    }))
    .sort((a, b) => b.value - a.value);

  return data;
}

async function getRecentTransactions() {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  // Get only today's transactions
  const transactions = await prisma.sale.findMany({
    where: {
      saleDate: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
    take: 10,
    orderBy: {
      saleDate: "desc",
    },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  return transactions;
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (
    !session ||
    !hasPermission(session.user.permissions, Permission.VIEW_DASHBOARD)
  ) {
    redirect("/login");
  }

  const stats = await getDashboardStats();
  const salesOverview = await getSalesOverview();
  const categorySales = await getCategorySales();
  const recentTransactions = await getRecentTransactions();

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Dashboard - Today</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Overview of today's sales and performance
        </p>
      </div>

      <StatsCards stats={stats} />

      <div className="grid gap-4 md:grid-cols-2">
        <SalesOverview data={salesOverview} />
        <SalesByCategory data={categorySales} />
      </div>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Today's Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions today
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">
                        #{transaction.saleNumber}
                      </TableCell>
                      <TableCell>{transaction.customerName}</TableCell>
                      <TableCell>
                        {new Date(transaction.saleDate).toLocaleTimeString(
                          "en-US",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(transaction.totalAmount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
