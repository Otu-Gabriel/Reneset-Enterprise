import { StatsCards } from "./components/StatsCards";
import {
  SalesOverview,
  SalesByCategory,
  TopProductsToday,
} from "./components/Chart";
import { DashboardPaginatedTables } from "./components/DashboardPaginatedTables";
import { prisma } from "@/lib/prisma";
import { Permission, Role } from "@prisma/client";
import { hasPermission } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

async function getDayGrossProfit(dayStart: Date, dayEnd: Date): Promise<number> {
  const result = await prisma.$queryRaw<Array<{ profit: number }>>`
    SELECT COALESCE(SUM(si.subtotal - COALESCE(si."lineCOGS", 0)), 0)::float AS profit
    FROM "SaleItem" si
    INNER JOIN "Sale" s ON s.id = si."saleId"
    WHERE s."saleDate" >= ${dayStart} AND s."saleDate" <= ${dayEnd}
  `;
  return Number(result[0]?.profit ?? 0);
}

async function getDashboardStats() {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const yesterdayEnd = new Date(todayEnd);
  yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);

  const [todayAgg, yesterdayAgg] = await Promise.all([
    prisma.sale.aggregate({
      where: { saleDate: { gte: todayStart, lte: todayEnd } },
      _sum: { totalAmount: true },
      _count: { _all: true },
    }),
    prisma.sale.aggregate({
      where: {
        saleDate: { gte: yesterdayStart, lte: yesterdayEnd },
      },
      _sum: { totalAmount: true },
      _count: { _all: true },
    }),
  ]);

  const todayRevenue = todayAgg._sum.totalAmount ?? 0;
  const yesterdayRevenue = yesterdayAgg._sum.totalAmount ?? 0;
  const todayOrders = todayAgg._count._all;
  const yesterdayOrders = yesterdayAgg._count._all;

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
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const rows = await prisma.$queryRaw<Array<{ hour: number; revenue: number }>>`
    SELECT EXTRACT(HOUR FROM s."saleDate")::int AS hour,
           COALESCE(SUM(s."totalAmount"), 0)::float AS revenue
    FROM "Sale" s
    WHERE s."saleDate" >= ${todayStart} AND s."saleDate" <= ${todayEnd}
    GROUP BY EXTRACT(HOUR FROM s."saleDate")
    ORDER BY hour ASC
  `;

  const byHour = new Map<number, number>();
  for (const r of rows) {
    byHour.set(r.hour, Number(r.revenue));
  }

  const data: Array<{ hour: string; revenue: number }> = [];
  for (let hour = 0; hour < 24; hour++) {
    data.push({
      hour: hour.toString().padStart(2, "0") + ":00",
      revenue: byHour.get(hour) ?? 0,
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

  return Array.from(categoryMap.entries())
    .map(([category, value]) => ({
      category,
      value,
      percentage: total > 0 ? Math.round((value / total) * 100) : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

async function getTopProductsSoldToday() {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const grouped = await prisma.saleItem.groupBy({
    by: ["productId"],
    where: {
      sale: {
        saleDate: { gte: todayStart, lte: todayEnd },
      },
    },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 8,
  });

  if (grouped.length === 0) {
    return [] as Array<{ name: string; quantity: number }>;
  }

  const products = await prisma.product.findMany({
    where: { id: { in: grouped.map((g) => g.productId) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(products.map((p) => [p.id, p.name]));

  return grouped.map((g) => ({
    name: nameById.get(g.productId) ?? "Unknown",
    quantity: g._sum.quantity ?? 0,
  }));
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (
    !session ||
    !hasPermission(session.user.permissions, Permission.VIEW_DASHBOARD)
  ) {
    redirect("/login");
  }

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const yesterdayEnd = new Date(todayEnd);
  yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);

  const canSeeProfit = session.user.role === Role.ADMIN;

  const profitPromise = canSeeProfit
    ? Promise.all([
        getDayGrossProfit(todayStart, todayEnd),
        getDayGrossProfit(yesterdayStart, yesterdayEnd),
      ]).then(([todayProfit, yesterdayProfit]) => {
        const profitChange =
          yesterdayProfit > 0
            ? Math.round(
                ((todayProfit - yesterdayProfit) / yesterdayProfit) * 100
              )
            : todayProfit > 0
              ? 100
              : 0;
        return { todayProfit, profitChange };
      })
    : Promise.resolve(undefined);

  const [stats, salesOverview, categorySales, topProductsToday, adminProfit] =
    await Promise.all([
      getDashboardStats(),
      getSalesOverview(),
      getCategorySales(),
      getTopProductsSoldToday(),
      profitPromise,
    ]);

  return (
    <div className="space-y-4 sm:space-y-5">
      <div>
        <h1 className="text-base font-semibold tracking-tight text-foreground sm:text-xl">
          Dashboard - Today
        </h1>
        <p className="text-xs text-muted-foreground sm:text-sm">
          Overview of today&apos;s sales and performance
        </p>
      </div>

      <StatsCards stats={stats} adminProfit={adminProfit} />

      <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-3">
        <SalesOverview data={salesOverview} />
        <SalesByCategory data={categorySales} />
        <TopProductsToday data={topProductsToday} />
      </div>

      <DashboardPaginatedTables />
    </div>
  );
}
