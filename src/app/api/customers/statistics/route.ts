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
      !hasPermission(session.user.permissions, Permission.VIEW_CUSTOMERS)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get total customers
    const totalCustomers = await prisma.customer.count();

    // Get active customers
    const activeCustomers = await prisma.customer.count({
      where: { status: "active" },
    });

    // Get new customers this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newCustomersThisMonth = await prisma.customer.count({
      where: {
        createdAt: {
          gte: startOfMonth,
        },
      },
    });

    // Get top customers by total spent
    const topCustomers = await prisma.customer.findMany({
      include: {
        sales: {
          select: {
            totalAmount: true,
          },
        },
      },
      take: 10,
    });

    const customersWithTotal = topCustomers.map((customer) => ({
      id: customer.id,
      name: customer.name,
      totalSpent: customer.sales.reduce(
        (sum, sale) => sum + sale.totalAmount,
        0
      ),
      totalSales: customer.sales.length,
    }));

    customersWithTotal.sort((a, b) => b.totalSpent - a.totalSpent);

    // Get customers with pending payments
    const customersWithPendingPayments = await prisma.customer.findMany({
      include: {
        sales: {
          include: {
            installmentPlan: {
              include: {
                payments: true,
              },
            },
          },
        },
      },
    });

    const customersWithPayments = customersWithPendingPayments
      .map((customer) => {
        const pendingAmount = customer.sales
          .flatMap((sale) => sale.installmentPlan?.payments || [])
          .filter(
            (payment) =>
              payment.status === "pending" || payment.status === "overdue"
          )
          .reduce(
            (sum, payment) => sum + (payment.amount - payment.paidAmount),
            0
          );

        return {
          id: customer.id,
          name: customer.name,
          pendingAmount,
        };
      })
      .filter((c) => c.pendingAmount > 0)
      .sort((a, b) => b.pendingAmount - a.pendingAmount)
      .slice(0, 10);

    return NextResponse.json({
      totalCustomers,
      activeCustomers,
      newCustomersThisMonth,
      topCustomers: customersWithTotal.slice(0, 5),
      customersWithPendingPayments: customersWithPayments.length,
    });
  } catch (error) {
    console.error("Error fetching customer statistics:", error);
    return NextResponse.json(
      { error: "Failed to fetch customer statistics" },
      { status: 500 }
    );
  }
}


