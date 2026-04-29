import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Permission, Prisma } from "@prisma/client";
import { hasPermission } from "@/lib/auth";
import { auditLogger, getRequestMetadata } from "@/lib/audit";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !hasPermission(session.user.permissions, Permission.VIEW_BRANDS)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;
    const search = searchParams.get("search") || "";
    const categoryId = searchParams.get("categoryId") || "";

    const forCategoryId = searchParams.get("forCategoryId") || "";
    const conditions: Prisma.BrandWhereInput[] = [];

    if (search) {
      conditions.push({
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      });
    }
    if (forCategoryId) {
      conditions.push({
        OR: [{ categoryId: forCategoryId }, { categoryId: null }],
      });
    } else if (categoryId === "standalone") {
      conditions.push({ categoryId: null });
    } else if (categoryId) {
      conditions.push({ categoryId });
    }

    const where = conditions.length ? { AND: conditions } : {};

    const [brands, total] = await Promise.all([
      prisma.brand.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.brand.count({ where }),
    ]);

    return NextResponse.json({
      brands,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching brands:", error);
    return NextResponse.json(
      { error: "Failed to fetch brands" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !hasPermission(session.user.permissions, Permission.CREATE_BRANDS)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, categoryId } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json(
        { error: "Brand name is required" },
        { status: 400 }
      );
    }

    const trimmed = String(name).trim();
    const parsedCategoryId =
      categoryId && String(categoryId).trim() ? String(categoryId).trim() : null;

    if (parsedCategoryId) {
      const category = await prisma.category.findUnique({
        where: { id: parsedCategoryId },
      });
      if (!category) {
        return NextResponse.json(
          { error: "Category not found" },
          { status: 400 }
        );
      }
    }

    const existingBrand = await prisma.brand.findFirst({
      where: {
        name: trimmed,
        categoryId: parsedCategoryId,
      },
    });

    if (existingBrand) {
      return NextResponse.json(
        {
          error: parsedCategoryId
            ? "A brand with this name already exists for that category"
            : "A standalone brand with this name already exists",
        },
        { status: 400 }
      );
    }

    const brand = await prisma.brand.create({
      data: {
        name: trimmed,
        description: description || null,
        categoryId: parsedCategoryId,
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
    await auditLogger.brandCreated(
      session.user.id,
      brand.id,
      brand.name,
      metadata
    );

    return NextResponse.json(brand, { status: 201 });
  } catch (error) {
    console.error("Error creating brand:", error);
    return NextResponse.json(
      { error: "Failed to create brand" },
      { status: 500 }
    );
  }
}
