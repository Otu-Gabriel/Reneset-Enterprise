import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Permission } from "@prisma/client";
import { hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auditLogger, getRequestMetadata } from "@/lib/audit";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Users can always view their own profile
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            sales: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get user statistics
    const salesCount = user._count.sales;
    const totalSalesRevenue = await prisma.sale.aggregate({
      where: { userId: user.id },
      _sum: {
        totalAmount: true,
      },
    });

    return NextResponse.json({
      ...user,
      statistics: {
        salesCount,
        totalRevenue: totalSalesRevenue._sum.totalAmount || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Users can always edit their own profile (EDIT_OWN_PROFILE is implicit for own profile)
    // But we check if they have the permission for additional validation
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, email } = body;

    // Check if email is being changed and if it already exists
    if (email && email !== session.user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "Email already exists" },
          { status: 400 }
        );
      }
    }

    // Get old user data for audit
    const oldUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    });

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        updatedAt: true,
      },
    });

    // Log audit
    const metadata = getRequestMetadata(request);
    const changes: Record<string, any> = {};
    if (oldUser) {
      if (name && name !== oldUser.name) changes.name = { from: oldUser.name, to: name };
      if (email && email !== oldUser.email) changes.email = { from: oldUser.email, to: email };
    }
    await auditLogger.profileUpdated(session.user.id, changes, metadata);

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}

