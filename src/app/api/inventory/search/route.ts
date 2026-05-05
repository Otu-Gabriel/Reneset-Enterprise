import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Permission } from "@prisma/client";
import { hasPermission } from "@/lib/auth";
import { redactProductsCosts } from "@/lib/product-cost-access";

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

    const canViewCost = hasPermission(
      session.user.permissions,
      Permission.VIEW_PRODUCT_COST
    );

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";
    const category = searchParams.get("category") || "";
    const limit = parseInt(searchParams.get("limit") || "20");
    const inStockOnly = searchParams.get("inStockOnly") === "true";

    if (!query || query.length < 1) {
      return NextResponse.json({ products: [] });
    }

    const queryLower = query.toLowerCase();

    // Build search conditions with priority ranking
    // Priority: 1. Product name, 2. SKU, 3. Description, 4. Category, 5. Brand name
    const where: any = {
      OR: [
        // Priority 1: Product name matches (exact or contains)
        { name: { contains: query, mode: "insensitive" } },
        // Priority 2: SKU matches
        { sku: { contains: query, mode: "insensitive" } },
        // Priority 3: Description matches
        { description: { contains: query, mode: "insensitive" } },
        // Priority 4: Category name matches
        { category: { contains: query, mode: "insensitive" } },
        // Priority 5: Brand name matches (via relation)
        {
          brand: {
            name: { contains: query, mode: "insensitive" },
          },
        },
      ],
    };

    // Apply category filter if specified (exact match filter, not search)
    if (category) {
      where.category = category;
    }

    // Apply stock filter if specified
    if (inStockOnly) {
      where.stock = { gt: 0 };
    }

    // Fetch products with all matches
    const allProducts = await prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        sku: true,
        description: true,
        category: true,
        price: true,
        stock: true,
        unit: true,
        baseUnit: true,
        variations: true,
        brand: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Rank products by match priority
    const rankedProducts = allProducts
      .map((product) => {
        const nameLower = product.name.toLowerCase();
        const skuLower = product.sku.toLowerCase();
        const categoryLower = product.category.toLowerCase();
        const brandNameLower = product.brand?.name.toLowerCase() || "";
        const descriptionLower = (product.description || "").toLowerCase();

        let priority = 999; // Lower number = higher priority

        // Priority 1: Exact product name match
        if (nameLower === queryLower) {
          priority = 1;
        }
        // Priority 2: Product name starts with query
        else if (nameLower.startsWith(queryLower)) {
          priority = 2;
        }
        // Priority 3: Exact SKU match
        else if (skuLower === queryLower) {
          priority = 3;
        }
        // Priority 4: SKU starts with query
        else if (skuLower.startsWith(queryLower)) {
          priority = 4;
        }
        // Priority 5: Product name contains query
        else if (nameLower.includes(queryLower)) {
          priority = 5;
        }
        // Priority 6: SKU contains query
        else if (skuLower.includes(queryLower)) {
          priority = 6;
        }
        // Priority 7: Description contains query
        else if (descriptionLower.includes(queryLower)) {
          priority = 7;
        }
        // Priority 8: Category name matches
        else if (categoryLower.includes(queryLower)) {
          priority = 8;
        }
        // Priority 9: Brand name matches
        else if (brandNameLower.includes(queryLower)) {
          priority = 9;
        }

        return { product, priority };
      })
      .sort((a, b) => {
        // Sort by priority first
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        // Then by stock (in stock first)
        if (a.product.stock !== b.product.stock) {
          return b.product.stock - a.product.stock;
        }
        // Finally by name alphabetically
        return a.product.name.localeCompare(b.product.name);
      })
      .map((item) => item.product)
      .slice(0, limit); // Apply limit after ranking

    return NextResponse.json({
      products: redactProductsCosts(
        rankedProducts as Record<string, unknown>[],
        canViewCost
      ),
    });
  } catch (error) {
    console.error("Error searching products:", error);
    return NextResponse.json(
      { error: "Failed to search products" },
      { status: 500 }
    );
  }
}


