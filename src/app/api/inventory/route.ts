import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Permission, Prisma } from "@prisma/client";
import { hasPermission } from "@/lib/auth";
import { auditLogger, getRequestMetadata } from "@/lib/audit";
import { normalizeVariationsForStorage } from "@/lib/product-variations";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !hasPermission(session.user.permissions, Permission.VIEW_INVENTORY)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const stockStatus = searchParams.get("stockStatus") || "";

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }
    if (category) {
      where.category = category;
    }
    
    // Filter by stock status
    if (stockStatus === "out_of_stock") {
      where.stock = 0;
    }

    // For low_stock and in_stock, we need to compare stock with minStock
    // Prisma doesn't support field-to-field comparison in where clause, so we use raw SQL
    let products: any[];
    let total: number;

    if (stockStatus === "low_stock") {
      // Low stock: stock > 0 AND stock <= minStock
      const conditions: Prisma.Sql[] = [Prisma.sql`p.stock > 0 AND p.stock <= p."minStock"`];
      
      if (search) {
        const searchPattern = `%${search}%`;
        conditions.push(Prisma.sql`(LOWER(p.name) LIKE LOWER(${searchPattern}) OR LOWER(p.sku) LIKE LOWER(${searchPattern}) OR LOWER(p.description) LIKE LOWER(${searchPattern}))`);
      }
      
      if (category) {
        conditions.push(Prisma.sql`p.category = ${category}`);
      }
      
      const whereClause = Prisma.join(conditions, " AND ");
      
      // Count query
      const countResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::int as count
        FROM "Product" p
        WHERE ${whereClause}
      `;
      total = Number(countResult[0]?.count || 0);

      // Fetch query with pagination
      const rawProducts = await prisma.$queryRaw<Array<any>>`
        SELECT p.*, b.id as "brandId", b.name as "brandName"
        FROM "Product" p
        LEFT JOIN "Brand" b ON p."brandId" = b.id
        WHERE ${whereClause}
        ORDER BY p."createdAt" DESC
        LIMIT ${limit} OFFSET ${skip}
      `;
      
      // Transform raw results to match Prisma format
      products = rawProducts.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        sku: p.sku,
        category: p.category,
        categoryId: p.category,
        brandId: p.brandId,
        price: Number(p.price),
        cost: p.cost ? Number(p.cost) : null,
        baseUnit: p.baseUnit || "item",
        variations: p.variations || [],
        stock: Number(p.stock),
        minStock: Number(p.minStock),
        unit: p.unit,
        imageUrl: p.imageUrl,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        brand: p.brandId ? { id: p.brandId, name: p.brandName } : null,
      }));
    } else if (stockStatus === "in_stock") {
      // In stock: stock > minStock
      const conditions: Prisma.Sql[] = [Prisma.sql`p.stock > p."minStock"`];
      
      if (search) {
        const searchPattern = `%${search}%`;
        conditions.push(Prisma.sql`(LOWER(p.name) LIKE LOWER(${searchPattern}) OR LOWER(p.sku) LIKE LOWER(${searchPattern}) OR LOWER(p.description) LIKE LOWER(${searchPattern}))`);
      }
      
      if (category) {
        conditions.push(Prisma.sql`p.category = ${category}`);
      }
      
      const whereClause = Prisma.join(conditions, " AND ");
      
      // Count query
      const countResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::int as count
        FROM "Product" p
        WHERE ${whereClause}
      `;
      total = Number(countResult[0]?.count || 0);

      // Fetch query with pagination
      const rawProducts = await prisma.$queryRaw<Array<any>>`
        SELECT p.*, b.id as "brandId", b.name as "brandName"
        FROM "Product" p
        LEFT JOIN "Brand" b ON p."brandId" = b.id
        WHERE ${whereClause}
        ORDER BY p."createdAt" DESC
        LIMIT ${limit} OFFSET ${skip}
      `;
      
      // Transform raw results to match Prisma format
      products = rawProducts.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        sku: p.sku,
        category: p.category,
        categoryId: p.category,
        brandId: p.brandId,
        price: Number(p.price),
        cost: p.cost ? Number(p.cost) : null,
        baseUnit: p.baseUnit || "item",
        variations: p.variations || [],
        stock: Number(p.stock),
        minStock: Number(p.minStock),
        unit: p.unit,
        imageUrl: p.imageUrl,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        brand: p.brandId ? { id: p.brandId, name: p.brandName } : null,
      }));
    } else {
      // Standard Prisma query for other cases
      products = await prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          brand: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
      total = await prisma.product.count({ where });
    }

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !hasPermission(session.user.permissions, Permission.CREATE_INVENTORY)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      sku,
      categoryId,
      brandId,
      price,
      cost,
      baseUnit,
      variations,
      stock,
      minStock,
      unit,
      imageUrl,
    } = body;

    const normalizedVariations = normalizeVariationsForStorage(variations);

    if (!name || !sku || !categoryId || !baseUnit || normalizedVariations.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get category name from categoryId
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 400 }
      );
    }

    // Validate brand if provided
    if (brandId) {
      const brand = await prisma.brand.findUnique({
        where: { id: brandId },
      });

      if (!brand) {
        return NextResponse.json(
          { error: "Brand not found" },
          { status: 400 }
        );
      }

      if (brand.categoryId && brand.categoryId !== categoryId) {
        return NextResponse.json(
          { error: "This brand is tied to a different category" },
          { status: 400 }
        );
      }
    }

    // Check if SKU already exists
    const existingProduct = await prisma.product.findUnique({
      where: { sku },
    });

    if (existingProduct) {
      return NextResponse.json(
        { error: "SKU already exists" },
        { status: 400 }
      );
    }

    const primaryPrice =
      normalizedVariations.find((v) => v.quantityInBaseUnit === 1)?.price ??
      normalizedVariations[0].price;

    const product = await prisma.product.create({
      data: {
        name,
        description: description || null,
        sku,
        category: category.name,
        brandId: brandId || null,
        price: parseFloat(String(price ?? primaryPrice)),
        cost: cost ? parseFloat(cost) : null,
        baseUnit: String(baseUnit),
        variations: normalizedVariations as unknown as Prisma.InputJsonValue,
        imageUrl: imageUrl || null,
        stock: parseInt(stock || "0"),
        minStock: parseInt(minStock || "0"),
        unit: unit || "pcs",
      },
    });

    // Log audit
    const metadata = getRequestMetadata(request);
    await auditLogger.productCreated(
      session.user.id,
      product.id,
      product.name,
      metadata
    );

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}

