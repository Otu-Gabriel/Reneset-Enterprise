import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Permission } from "@prisma/client";
import { hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auditLogger, getRequestMetadata } from "@/lib/audit";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !hasPermission(session.user.permissions, Permission.VIEW_INSTALLMENTS)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payments = await prisma.installmentPayment.findMany({
      where: { installmentPlanId: id },
      orderBy: { installmentNumber: "asc" },
    });

    return NextResponse.json({ payments });
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !hasPermission(session.user.permissions, Permission.RECORD_PAYMENTS)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { paymentIds, amount, paymentMethod, notes } = body;

    if (!paymentIds || !Array.isArray(paymentIds) || paymentIds.length === 0) {
      return NextResponse.json(
        { error: "Payment IDs are required" },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Valid payment amount is required" },
        { status: 400 }
      );
    }

    // Get the installment plan
    const plan = await prisma.installmentPlan.findUnique({
      where: { id: id },
      include: {
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

    // Get the payments to update
    const paymentsToUpdate = await prisma.installmentPayment.findMany({
      where: {
        id: { in: paymentIds },
        installmentPlanId: id,
      },
      orderBy: { installmentNumber: "asc" },
    });

    if (paymentsToUpdate.length === 0) {
      return NextResponse.json(
        { error: "No valid payments found" },
        { status: 400 }
      );
    }

    // Calculate total due for selected payments
    const totalDue = paymentsToUpdate.reduce(
      (sum, payment) => sum + (payment.amount - payment.paidAmount),
      0
    );

    if (amount > totalDue) {
      return NextResponse.json(
        { error: `Payment amount exceeds total due (${totalDue})` },
        { status: 400 }
      );
    }

    // Distribute payment across selected installments
    let remainingAmount = amount;
    const updatedPayments = [];

    for (const payment of paymentsToUpdate) {
      if (remainingAmount <= 0) break;

      const remainingDue = payment.amount - payment.paidAmount;
      if (remainingDue <= 0) continue;

      const paymentAmount = Math.min(remainingAmount, remainingDue);
      const newPaidAmount = payment.paidAmount + paymentAmount;
      const isFullyPaid = newPaidAmount >= payment.amount;
      const isPartial = newPaidAmount > 0 && newPaidAmount < payment.amount;

      // Determine status
      let status = payment.status;
      if (isFullyPaid) {
        status = "paid";
      } else if (isPartial) {
        status = "partial";
      }

      const updatedPayment = await prisma.installmentPayment.update({
        where: { id: payment.id },
        data: {
          paidAmount: newPaidAmount,
          status,
          paymentDate: new Date(),
          paymentMethod: paymentMethod || payment.paymentMethod,
          notes: notes || payment.notes,
        },
      });

      updatedPayments.push(updatedPayment);
      remainingAmount -= paymentAmount;
    }

    // Recalculate total paid correctly
    const allPayments = await prisma.installmentPayment.findMany({
      where: { installmentPlanId: id },
    });
    const actualTotalPaid = allPayments.reduce((sum, p) => sum + p.paidAmount, 0);

    let planStatus = plan.status;
    if (actualTotalPaid >= plan.remainingAmount) {
      planStatus = "completed";
    } else {
      // Check for overdue payments
      const now = new Date();
      const hasOverdue = allPayments.some(
        (p) => (p.status === "pending" || p.status === "partial") && new Date(p.dueDate) < now
      );
      if (hasOverdue && planStatus === "active") {
        // Keep as active, individual payments will show overdue status
      }
    }

    await prisma.installmentPlan.update({
      where: { id: id },
      data: { status: planStatus },
    });

    // Update overdue status for pending payments
    const now = new Date();
    await prisma.installmentPayment.updateMany({
      where: {
        installmentPlanId: id,
        status: "pending",
        dueDate: { lt: now },
      },
      data: { status: "overdue" },
    });

    // Log audit for each payment recorded
    const metadata = getRequestMetadata(request);

    for (const payment of updatedPayments) {
      const oldPayment = paymentsToUpdate.find((p) => p.id === payment.id);
      const paymentAmount = payment.paidAmount - (oldPayment?.paidAmount || 0);
      
      if (paymentAmount > 0) {
        await auditLogger.paymentRecorded(
          session.user.id,
          payment.id,
          id,
          paymentAmount,
          metadata
        );
      }
    }

    return NextResponse.json({
      message: "Payment recorded successfully",
      payments: updatedPayments,
    });
  } catch (error) {
    console.error("Error recording payment:", error);
    return NextResponse.json(
      { error: "Failed to record payment" },
      { status: 500 }
    );
  }
}

