import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Permission, AuditAction, AuditEntity } from "@prisma/client";
import { hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    // Get all payments for this installment plan
    const payments = await prisma.installmentPayment.findMany({
      where: { installmentPlanId: id },
      orderBy: { paymentDate: "desc" },
    });

    // Get audit logs for these payments
    const paymentIds = payments
      .filter((p) => p.paymentDate !== null)
      .map((p) => p.id);

    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entity: AuditEntity.INSTALLMENT_PAYMENT,
        entityId: { in: paymentIds },
        action: AuditAction.CREATE,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Combine payment data with audit log data
    const paymentHistory = payments
      .filter((p) => p.paymentDate !== null)
      .map((payment) => {
        const auditLog = auditLogs.find((log) => log.entityId === payment.id);
        return {
          paymentId: payment.id,
          installmentNumber: payment.installmentNumber,
          amount: payment.paidAmount,
          paymentDate: payment.paymentDate,
          paymentMethod: payment.paymentMethod,
          notes: payment.notes,
          recordedBy: auditLog
            ? {
                name: auditLog.user.name,
                email: auditLog.user.email,
                recordedAt: auditLog.createdAt,
              }
            : null,
        };
      })
      .sort(
        (a, b) =>
          new Date(b.paymentDate!).getTime() -
          new Date(a.paymentDate!).getTime()
      );

    return NextResponse.json({ paymentHistory });
  } catch (error) {
    console.error("Error fetching payment history:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment history" },
      { status: 500 }
    );
  }
}

