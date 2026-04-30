import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Permission } from "@prisma/client";
import { hasPermission } from "@/lib/auth";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !hasPermission(session.user.permissions, Permission.VIEW_SALES)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const monthStart = new Date(now);
    monthStart.setMonth(monthStart.getMonth() - 1);
    monthStart.setHours(0, 0, 0, 0);

    const completed = { status: "completed" as const };

    const [todayAgg, weekAgg, monthAgg, itemsByProduct] = await Promise.all([
      prisma.sale.aggregate({
        where: { ...completed, saleDate: { gte: todayStart } },
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
      prisma.sale.aggregate({
        where: { ...completed, saleDate: { gte: weekStart } },
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
      prisma.sale.aggregate({
        where: { ...completed, saleDate: { gte: monthStart } },
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
      prisma.saleItem.groupBy({
        by: ["productId"],
        where: {
          sale: { status: "completed" },
        },
        _sum: {
          quantity: true,
          subtotal: true,
        },
      }),
    ]);

    const todayTotal = todayAgg._sum.totalAmount ?? 0;
    const weekTotal = weekAgg._sum.totalAmount ?? 0;
    const monthTotal = monthAgg._sum.totalAmount ?? 0;

    let bestSellingProduct = { name: "N/A", quantity: 0, revenue: 0 };
    if (itemsByProduct.length > 0) {
      const sorted = [...itemsByProduct].sort(
        (a, b) => (b._sum.quantity ?? 0) - (a._sum.quantity ?? 0)
      );
      const top = sorted[0];
      const product = await prisma.product.findUnique({
        where: { id: top.productId },
        select: { name: true },
      });
      bestSellingProduct = {
        name: product?.name ?? "N/A",
        quantity: top._sum.quantity ?? 0,
        revenue: top._sum.subtotal ?? 0,
      };
    }

    return NextResponse.json({
      today: {
        total: todayTotal,
        count: todayAgg._count._all,
      },
      week: {
        total: weekTotal,
        count: weekAgg._count._all,
      },
      month: {
        total: monthTotal,
        count: monthAgg._count._all,
      },
      bestSellingProduct,
    });
  } catch (error) {
    console.error("Error fetching sales statistics:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}

