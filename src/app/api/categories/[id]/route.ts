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
      !hasPermission(session.user.permissions, Permission.VIEW_CATEGORIES)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const category = await prisma.category.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { brands: true },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error("Error fetching category:", error);
    return NextResponse.json(
      { error: "Failed to fetch category" },
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
      !hasPermission(session.user.permissions, Permission.EDIT_CATEGORIES)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description } = body;

    // Check if name is being changed and if it already exists
    if (name) {
      const existingCategory = await prisma.category.findUnique({
        where: { name },
      });

      if (existingCategory && existingCategory.id !== params.id) {
        return NextResponse.json(
          { error: "Category name already exists" },
          { status: 400 }
        );
      }
    }

    // Get old category data for audit
    const oldCategory = await prisma.category.findUnique({
      where: { id: params.id },
    });

    const category = await prisma.category.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
      },
    });

    // Log audit
    const rawMetadata = getRequestMetadata(request);
    const metadata = {
      ipAddress: rawMetadata.ipAddress ?? undefined,
      userAgent: rawMetadata.userAgent ?? undefined,
    };
    const changes: Record<string, any> = {};
    if (oldCategory) {
      if (name && name !== oldCategory.name)
        changes.name = { from: oldCategory.name, to: name };
      if (description !== undefined && description !== oldCategory.description)
        changes.description = {
          from: oldCategory.description,
          to: description,
        };
    }
    await auditLogger.categoryUpdated(
      session.user.id,
      category.id,
      category.name,
      changes,
      metadata
    );

    return NextResponse.json(category);
  } catch (error) {
    console.error("Error updating category:", error);
    return NextResponse.json(
      { error: "Failed to update category" },
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
      !hasPermission(session.user.permissions, Permission.DELETE_CATEGORIES)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if category has brands
    const category = await prisma.category.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { brands: true },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    if (category._count.brands > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete category with associated brands. Please delete brands first.",
        },
        { status: 400 }
      );
    }

    await prisma.category.delete({
      where: { id: params.id },
    });

    // Log audit
    const rawMetadata = getRequestMetadata(request);
    const metadata = {
      ipAddress: rawMetadata.ipAddress ?? undefined,
      userAgent: rawMetadata.userAgent ?? undefined,
    };
    await auditLogger.categoryDeleted(
      session.user.id,
      category.id,
      category.name,
      metadata
    );

    return NextResponse.json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    );
  }
}
