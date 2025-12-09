import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Permission } from "@prisma/client";
import { hasPermission } from "@/lib/auth";

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

    // Get sales for different periods
    const [todaySales, weekSales, monthSales, allSales] = await Promise.all([
      prisma.sale.findMany({
        where: {
          saleDate: { gte: todayStart },
          status: "completed",
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      }),
      prisma.sale.findMany({
        where: {
          saleDate: { gte: weekStart },
          status: "completed",
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      }),
      prisma.sale.findMany({
        where: {
          saleDate: { gte: monthStart },
          status: "completed",
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      }),
      prisma.sale.findMany({
        where: {
          status: "completed",
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      }),
    ]);

    // Calculate totals
    const todayTotal = todaySales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const weekTotal = weekSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const monthTotal = monthSales.reduce((sum, sale) => sum + sale.totalAmount, 0);

    // Find best selling product
    const productSales = new Map<string, { name: string; quantity: number; revenue: number }>();

    allSales.forEach((sale) => {
      sale.items.forEach((item) => {
        const productId = item.productId;
        const productName = item.product.name;
        const existing = productSales.get(productId) || {
          name: productName,
          quantity: 0,
          revenue: 0,
        };
        productSales.set(productId, {
          name: productName,
          quantity: existing.quantity + item.quantity,
          revenue: existing.revenue + item.subtotal,
        });
      });
    });

    let bestSellingProduct = { name: "N/A", quantity: 0, revenue: 0 };
    if (productSales.size > 0) {
      const sorted = Array.from(productSales.values()).sort(
        (a, b) => b.quantity - a.quantity
      );
      bestSellingProduct = sorted[0];
    }

    return NextResponse.json({
      today: {
        total: todayTotal,
        count: todaySales.length,
      },
      week: {
        total: weekTotal,
        count: weekSales.length,
      },
      month: {
        total: monthTotal,
        count: monthSales.length,
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

