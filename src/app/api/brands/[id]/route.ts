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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !hasPermission(session.user.permissions, Permission.VIEW_BRANDS)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const brand = await prisma.brand.findUnique({
      where: { id: id },
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !hasPermission(session.user.permissions, Permission.EDIT_BRANDS)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, categoryId: categoryIdFromBody } = body;

    const currentBrand = await prisma.brand.findUnique({
      where: { id: id },
    });
    if (!currentBrand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    const nextName =
      name && String(name).trim() ? String(name).trim() : currentBrand.name;

    let nextCategoryId: string | null = currentBrand.categoryId;
    if (Object.prototype.hasOwnProperty.call(body, "categoryId")) {
      if (categoryIdFromBody && String(categoryIdFromBody).trim()) {
        nextCategoryId = String(categoryIdFromBody).trim();
        const category = await prisma.category.findUnique({
          where: { id: nextCategoryId },
        });
        if (!category) {
          return NextResponse.json(
            { error: "Category not found" },
            { status: 400 }
          );
        }
      } else {
        nextCategoryId = null;
      }
    }

    const dupe = await prisma.brand.findFirst({
      where: {
        name: nextName,
        categoryId: nextCategoryId,
        NOT: { id },
      },
    });
    if (dupe) {
      return NextResponse.json(
        {
          error: nextCategoryId
            ? "A brand with this name already exists for that category"
            : "A standalone brand with this name already exists",
        },
        { status: 400 }
      );
    }

    const oldBrand = currentBrand;

    const brand = await prisma.brand.update({
      where: { id: id },
      data: {
        ...(name && String(name).trim() ? { name: String(name).trim() } : {}),
        ...(description !== undefined && { description }),
        ...(Object.prototype.hasOwnProperty.call(body, "categoryId")
          ? { categoryId: nextCategoryId }
          : {}),
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
    const rawMetadata = getRequestMetadata(request);
    const metadata = {
      ipAddress: rawMetadata.ipAddress ?? undefined,
      userAgent: rawMetadata.userAgent ?? undefined,
    };
    const changes: Record<string, any> = {};
    if (oldBrand) {
      if (name && String(name).trim() !== oldBrand.name)
        changes.name = { from: oldBrand.name, to: String(name).trim() };
      if (
        Object.prototype.hasOwnProperty.call(body, "categoryId") &&
        nextCategoryId !== oldBrand.categoryId
      ) {
        changes.categoryId = { from: oldBrand.categoryId, to: nextCategoryId };
      }
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !hasPermission(session.user.permissions, Permission.DELETE_BRANDS)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get brand data before deletion for audit
    const brand = await prisma.brand.findUnique({
      where: { id: id },
    });

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    await prisma.brand.delete({
      where: { id: id },
    });

    // Log audit
    const rawMetadata = getRequestMetadata(request);
    const metadata = {
      ipAddress: rawMetadata.ipAddress ?? undefined,
      userAgent: rawMetadata.userAgent ?? undefined,
    };
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
