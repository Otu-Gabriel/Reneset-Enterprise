import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Permission } from "@prisma/client";
import { hasPermission } from "@/lib/auth";
import { auditLogger, getRequestMetadata } from "@/lib/audit";

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
      !hasPermission(session.user.permissions, Permission.VIEW_CUSTOMERS)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
      include: {
        sales: {
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
            installmentPlan: {
              include: {
                payments: true,
              },
            },
          },
          orderBy: {
            saleDate: "desc",
          },
        },
        _count: {
          select: { sales: true },
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Calculate comprehensive statistics
    const sales = customer.sales;
    const totalSpent = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const averageOrderValue = sales.length > 0 ? totalSpent / sales.length : 0;
    const lastPurchaseDate =
      sales.length > 0
        ? sales.sort((a, b) => b.saleDate.getTime() - a.saleDate.getTime())[0]
            .saleDate
        : null;
    const firstPurchaseDate =
      sales.length > 0
        ? sales.sort((a, b) => a.saleDate.getTime() - b.saleDate.getTime())[0]
            .saleDate
        : null;

    // Active installments
    const activeInstallments = sales.filter(
      (sale) => sale.installmentPlan && sale.installmentPlan.status === "active"
    ).length;

    // Total pending payments
    const pendingPayments = sales
      .flatMap((sale) => sale.installmentPlan?.payments || [])
      .filter((payment) => payment.status === "pending" || payment.status === "overdue")
      .reduce((sum, payment) => sum + (payment.amount - payment.paidAmount), 0);

    return NextResponse.json({
      ...customer,
      statistics: {
        totalSales: sales.length,
        totalSpent,
        averageOrderValue,
        lastPurchaseDate,
        firstPurchaseDate,
        activeInstallments,
        pendingPayments,
      },
    });
  } catch (error) {
    console.error("Error fetching customer:", error);
    return NextResponse.json(
      { error: "Failed to fetch customer" },
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
      !hasPermission(session.user.permissions, Permission.EDIT_CUSTOMERS)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      email,
      phone,
      address,
      city,
      state,
      country,
      postalCode,
      notes,
      tags,
      status,
    } = body;

    // Check if customer exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { id: params.id },
    });

    if (!existingCustomer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Check if email or phone conflicts with another customer
    if (email || phone) {
      const conflict = await prisma.customer.findFirst({
        where: {
          id: { not: params.id },
          OR: [
            ...(email ? [{ email }] : []),
            ...(phone ? [{ phone }] : []),
          ],
        },
      });

      if (conflict) {
        return NextResponse.json(
          { error: "Email or phone already belongs to another customer" },
          { status: 400 }
        );
      }
    }

    const customer = await prisma.customer.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(email !== undefined && { email: email || null }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(address !== undefined && { address: address || null }),
        ...(city !== undefined && { city: city || null }),
        ...(state !== undefined && { state: state || null }),
        ...(country !== undefined && { country: country || null }),
        ...(postalCode !== undefined && { postalCode: postalCode || null }),
        ...(notes !== undefined && { notes: notes || null }),
        ...(tags !== undefined && { tags: tags || [] }),
        ...(status && { status }),
      },
    });

    // Log audit
    const metadata = getRequestMetadata(request);
    await auditLogger.customerUpdated(
      session.user.id,
      customer.id,
      customer.name,
      body,
      {
        ipAddress: metadata.ipAddress ?? undefined,
        userAgent: metadata.userAgent ?? undefined,
      }
    );

    return NextResponse.json(customer);
  } catch (error) {
    console.error("Error updating customer:", error);
    return NextResponse.json(
      { error: "Failed to update customer" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !hasPermission(session.user.permissions, Permission.DELETE_CUSTOMERS)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Check if customer has sales
    const salesCount = await prisma.sale.count({
      where: { customerId: params.id },
    });

    if (salesCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete customer with ${salesCount} sale(s). Please remove or reassign sales first.`,
        },
        { status: 400 }
      );
    }

    await prisma.customer.delete({
      where: { id: params.id },
    });

    // Log audit
    const metadata = getRequestMetadata(request);
    await auditLogger.customerDeleted(
      session.user.id,
      customer.id,
      customer.name,
      {
        ipAddress: metadata.ipAddress ?? undefined,
        userAgent: metadata.userAgent ?? undefined,
      }
    );

    return NextResponse.json({ message: "Customer deleted successfully" });
  } catch (error) {
    console.error("Error deleting customer:", error);
    return NextResponse.json(
      { error: "Failed to delete customer" },
      { status: 500 }
    );
  }
}








