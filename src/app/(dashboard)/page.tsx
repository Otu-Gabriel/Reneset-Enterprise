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
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const previous7Days = new Date(last7Days.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Get current period stats
  const currentSales = await prisma.sale.findMany({
    where: {
      saleDate: {
        gte: last7Days,
      },
    },
    include: {
      items: true,
    },
  });

  // Get previous period stats
  const previousSales = await prisma.sale.findMany({
    where: {
      saleDate: {
        gte: previous7Days,
        lt: last7Days,
      },
    },
    include: {
      items: true,
    },
  });

  const currentRevenue = currentSales.reduce(
    (sum, sale) => sum + sale.totalAmount,
    0
  );
  const previousRevenue = previousSales.reduce(
    (sum, sale) => sum + sale.totalAmount,
    0
  );

  const currentOrders = currentSales.length;
  const previousOrders = previousSales.length;

  const currentAvgPrice =
    currentOrders > 0 ? currentRevenue / currentOrders : 0;
  const previousAvgPrice =
    previousOrders > 0 ? previousRevenue / previousOrders : 0;

  const revenueChange =
    previousRevenue > 0
      ? Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100)
      : currentRevenue > 0
        ? 100
        : 0;

  const ordersChange =
    previousOrders > 0
      ? Math.round(((currentOrders - previousOrders) / previousOrders) * 100)
      : currentOrders > 0
        ? 100
        : 0;

  const avgPriceChange =
    previousAvgPrice > 0
      ? Math.round(
          ((currentAvgPrice - previousAvgPrice) / previousAvgPrice) * 100
        )
      : currentAvgPrice > 0
        ? 100
        : 0;

  return {
    totalRevenue: currentRevenue,
    totalOrders: currentOrders,
    averagePrice: currentAvgPrice,
    revenueChange,
    ordersChange,
    averagePriceChange: avgPriceChange,
  };
}

async function getSalesOverview() {
  const now = new Date();
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const previous7Days = new Date(last7Days.getTime() - 7 * 24 * 60 * 60 * 1000);

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const data = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const currentSales = await prisma.sale.findMany({
      where: {
        saleDate: {
          gte: date,
          lt: nextDate,
        },
      },
    });

    const previousDate = new Date(date);
    previousDate.setDate(previousDate.getDate() - 7);

    const previousNextDate = new Date(previousDate);
    previousNextDate.setDate(previousNextDate.getDate() + 1);

    const previousSales = await prisma.sale.findMany({
      where: {
        saleDate: {
          gte: previousDate,
          lt: previousNextDate,
        },
      },
    });

    data.push({
      date: days[date.getDay()],
      current: currentSales.reduce((sum, s) => sum + s.totalAmount, 0),
      previous: previousSales.reduce((sum, s) => sum + s.totalAmount, 0),
    });
  }

  return data;
}

async function getCategorySales() {
  const sales = await prisma.sale.findMany({
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
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);

  return data;
}

async function getRecentTransactions() {
  const transactions = await prisma.sale.findMany({
    take: 4,
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
        <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Welcome to your inventory management system
        </p>
      </div>

      <StatsCards stats={stats} />

      <div className="grid gap-4 md:grid-cols-2">
        <SalesOverview data={salesOverview} />
        <SalesByCategory data={categorySales} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.slice(0, 2).map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium">
                      #{transaction.saleNumber}
                    </TableCell>
                    <TableCell>{transaction.customerName}</TableCell>
                    <TableCell>{formatDate(transaction.saleDate)}</TableCell>
                    <TableCell>
                      {formatCurrency(transaction.totalAmount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
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
                    <TableCell>{formatDate(transaction.saleDate)}</TableCell>
                    <TableCell>
                      {formatCurrency(transaction.totalAmount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
