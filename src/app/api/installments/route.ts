import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Permission } from "@prisma/client";
import { hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !hasPermission(session.user.permissions, Permission.VIEW_INSTALLMENTS)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    // Build where clause
    const where: any = {
      sale: {
        ...(search && {
          OR: [
            { customerName: { contains: search, mode: "insensitive" as any } },
            { saleNumber: { contains: search, mode: "insensitive" as any } },
            { customerEmail: { contains: search, mode: "insensitive" as any } },
            { customerPhone: { contains: search, mode: "insensitive" as any } },
          ],
        }),
      },
    };

    if (status) {
      where.status = status;
    }

    const [plans, total] = await Promise.all([
      prisma.installmentPlan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          sale: {
            include: {
              items: {
                include: {
                  product: true,
                },
              },
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
          payments: {
            orderBy: { installmentNumber: "asc" },
          },
        },
      }),
      prisma.installmentPlan.count({ where }),
    ]);

    // Calculate payment statistics for each plan
    const plansWithStats = plans.map((plan) => {
      const totalPaid = plan.payments.reduce(
        (sum, payment) => sum + payment.paidAmount,
        0
      );
      const paidInstallments = plan.payments.filter(
        (p) => p.status === "paid"
      ).length;
      const overduePayments = plan.payments.filter(
        (p) => p.status === "overdue"
      ).length;
      const nextPayment = plan.payments.find((p) => p.status === "pending");

      return {
        ...plan,
        statistics: {
          totalPaid,
          remainingAmount: plan.remainingAmount - totalPaid,
          paidInstallments,
          remainingInstallments: plan.numberOfInstallments - paidInstallments,
          overduePayments,
          nextPaymentDue: nextPayment?.dueDate || null,
        },
      };
    });

    return NextResponse.json({
      plans: plansWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching installments:", error);
    return NextResponse.json(
      { error: "Failed to fetch installments" },
      { status: 500 }
    );
  }
}

