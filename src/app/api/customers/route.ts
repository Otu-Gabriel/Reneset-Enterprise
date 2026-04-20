import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Permission } from "@prisma/client";
import { hasPermission } from "@/lib/auth";
import { auditLogger, getRequestMetadata } from "@/lib/audit";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !hasPermission(session.user.permissions, Permission.VIEW_CUSTOMERS)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }
    if (status) {
      where.status = status;
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { sales: true },
          },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    // Calculate statistics for each customer
    const customersWithStats = await Promise.all(
      customers.map(async (customer) => {
        const sales = await prisma.sale.findMany({
          where: { customerId: customer.id },
          select: { totalAmount: true, saleDate: true },
        });

        const totalSpent = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const lastPurchaseDate = sales.length > 0
          ? sales.sort((a, b) => b.saleDate.getTime() - a.saleDate.getTime())[0].saleDate
          : null;

        return {
          ...customer,
          statistics: {
            totalSales: sales.length,
            totalSpent,
            lastPurchaseDate,
          },
        };
      })
    );

    return NextResponse.json({
      customers: customersWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching customers:", error);
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !hasPermission(session.user.permissions, Permission.CREATE_CUSTOMERS)
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
      status = "active",
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Customer name is required" },
        { status: 400 }
      );
    }

    // Check if customer with same email or phone already exists
    if (email || phone) {
      const existing = await prisma.customer.findFirst({
        where: {
          OR: [
            ...(email ? [{ email }] : []),
            ...(phone ? [{ phone }] : []),
          ],
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: "Customer with this email or phone already exists" },
          { status: 400 }
        );
      }
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        email: email || null,
        phone: phone || null,
        address: address || null,
        city: city || null,
        state: state || null,
        country: country || null,
        postalCode: postalCode || null,
        notes: notes || null,
        tags: tags || [],
        status,
      },
    });

    // Log audit
    const metadata = getRequestMetadata(request);
    await auditLogger.customerCreated(
      session.user.id,
      customer.id,
      customer.name,
      metadata
    );

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    console.error("Error creating customer:", error);
    return NextResponse.json(
      { error: "Failed to create customer" },
      { status: 500 }
    );
  }
}








