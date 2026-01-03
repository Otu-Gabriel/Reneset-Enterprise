import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Permission } from "@prisma/client";
import { hasPermission } from "@/lib/auth";

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
    const query = searchParams.get("q") || "";
    const category = searchParams.get("category") || "";
    const limit = parseInt(searchParams.get("limit") || "20");
    const inStockOnly = searchParams.get("inStockOnly") === "true";

    if (!query || query.length < 1) {
      return NextResponse.json({ products: [] });
    }

    const where: any = {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { sku: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ],
    };

    if (category) {
      where.category = category;
    }

    if (inStockOnly) {
      where.stock = { gt: 0 };
    }

    const products = await prisma.product.findMany({
      where,
      take: limit,
      orderBy: [
        // Prioritize exact SKU matches
        { sku: query === query.toUpperCase() ? "asc" : "desc" },
        // Then by stock (in stock first)
        { stock: "desc" },
        // Then by name
        { name: "asc" },
      ],
      include: {
        brand: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error("Error searching products:", error);
    return NextResponse.json(
      { error: "Failed to search products" },
      { status: 500 }
    );
  }
}

