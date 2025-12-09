import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Permission } from "@prisma/client";
import { hasPermission } from "@/lib/auth";
import { auditLogger, getRequestMetadata } from "@/lib/audit";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !hasPermission(session.user.permissions, Permission.VIEW_BRANDS)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const brand = await prisma.brand.findUnique({
      where: { id: params.id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    return NextResponse.json(brand);
  } catch (error) {
    console.error("Error fetching brand:", error);
    return NextResponse.json(
      { error: "Failed to fetch brand" },
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
      !hasPermission(session.user.permissions, Permission.EDIT_BRANDS)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, categoryId } = body;

    // Check if category is being changed and if it exists
    if (categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
      });

      if (!category) {
        return NextResponse.json(
          { error: "Category not found" },
          { status: 400 }
        );
      }
    }

    // Check if name is being changed and if it already exists in the category
    if (name) {
      const currentBrand = await prisma.brand.findUnique({
        where: { id: params.id },
      });

      const targetCategoryId = categoryId || currentBrand?.categoryId;

      if (targetCategoryId) {
        const existingBrand = await prisma.brand.findUnique({
          where: {
            name_categoryId: {
              name,
              categoryId: targetCategoryId,
            },
          },
        });

        if (existingBrand && existingBrand.id !== params.id) {
          return NextResponse.json(
            { error: "Brand already exists in this category" },
            { status: 400 }
          );
        }
      }
    }

    // Get old brand data for audit
    const oldBrand = await prisma.brand.findUnique({
      where: { id: params.id },
    });

    const brand = await prisma.brand.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(categoryId && { categoryId }),
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Log audit
    const metadata = getRequestMetadata(request);
    const changes: Record<string, any> = {};
    if (oldBrand) {
      if (name && name !== oldBrand.name) changes.name = { from: oldBrand.name, to: name };
      if (categoryId && categoryId !== oldBrand.categoryId) changes.categoryId = { from: oldBrand.categoryId, to: categoryId };
    }
    await auditLogger.brandUpdated(
      session.user.id,
      brand.id,
      brand.name,
      changes,
      metadata
    );

    return NextResponse.json(brand);
  } catch (error) {
    console.error("Error updating brand:", error);
    return NextResponse.json(
      { error: "Failed to update brand" },
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
      !hasPermission(session.user.permissions, Permission.DELETE_BRANDS)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get brand data before deletion for audit
    const brand = await prisma.brand.findUnique({
      where: { id: params.id },
    });

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    await prisma.brand.delete({
      where: { id: params.id },
    });

    // Log audit
    const metadata = getRequestMetadata(request);
    await auditLogger.brandDeleted(
      session.user.id,
      brand.id,
      brand.name,
      metadata
    );

    return NextResponse.json({ message: "Brand deleted successfully" });
  } catch (error) {
    console.error("Error deleting brand:", error);
    return NextResponse.json(
      { error: "Failed to delete brand" },
      { status: 500 }
    );
  }
}

