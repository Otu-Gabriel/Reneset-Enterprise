import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Permission } from "@prisma/client";
import { hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !hasPermission(session.user.permissions, Permission.VIEW_INSTALLMENTS)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const plan = await prisma.installmentPlan.findUnique({
      where: { id: params.id },
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
    });

    if (!plan) {
      return NextResponse.json(
        { error: "Installment plan not found" },
        { status: 404 }
      );
    }

    // Calculate statistics
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

    return NextResponse.json({
      ...plan,
      statistics: {
        totalPaid,
        remainingAmount: plan.remainingAmount - totalPaid,
        paidInstallments,
        remainingInstallments: plan.numberOfInstallments - paidInstallments,
        overduePayments,
      },
    });
  } catch (error) {
    console.error("Error fetching installment plan:", error);
    return NextResponse.json(
      { error: "Failed to fetch installment plan" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !hasPermission(session.user.permissions, Permission.MANAGE_INSTALLMENTS)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { status, notes } = body;

    const updatedPlan = await prisma.installmentPlan.update({
      where: { id: params.id },
      data: {
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        sale: true,
        payments: {
          orderBy: { installmentNumber: "asc" },
        },
      },
    });

    return NextResponse.json(updatedPlan);
  } catch (error) {
    console.error("Error updating installment plan:", error);
    return NextResponse.json(
      { error: "Failed to update installment plan" },
      { status: 500 }
    );
  }
}

