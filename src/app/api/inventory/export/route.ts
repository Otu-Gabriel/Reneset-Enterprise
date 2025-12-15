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
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const stockStatus = searchParams.get("stockStatus") || "";

    // Build where clause (same logic as GET /api/inventory)
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
    } else if (stockStatus === "low_stock") {
      where.stock = { gt: 0 };
    } else if (stockStatus === "in_stock") {
      where.stock = { gt: 0 };
    }

    // Fetch all products matching filters (no pagination for export)
    let products = await prisma.product.findMany({
      where,
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

    // Apply stock status filtering for low_stock and in_stock
    if (stockStatus === "low_stock") {
      products = products.filter((p) => p.stock > 0 && p.stock <= p.minStock);
    } else if (stockStatus === "in_stock") {
      products = products.filter((p) => p.stock > p.minStock);
    }

    // Convert to CSV format
    const csvRows = [];
    
    // Header row
    csvRows.push([
      "Name",
      "SKU",
      "Description",
      "Category",
      "Brand",
      "Price",
      "Cost",
      "Stock",
      "Min Stock",
      "Unit",
      "Status",
      "Image URL",
    ].join(","));

    // Data rows
    products.forEach((product) => {
      let status = "In Stock";
      if (product.stock === 0) {
        status = "Out of Stock";
      } else if (product.stock <= product.minStock) {
        status = "Low Stock";
      }

      csvRows.push([
        `"${product.name}"`,
        product.sku,
        product.description ? `"${product.description.replace(/"/g, '""')}"` : "",
        product.category,
        product.brand?.name || "",
        product.price.toString(),
        product.cost?.toString() || "",
        product.stock.toString(),
        product.minStock.toString(),
        product.unit,
        status,
        product.imageUrl || "",
      ].join(","));
    });

    const csvContent = csvRows.join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="products-export-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error exporting inventory:", error);
    return NextResponse.json(
      { error: "Failed to export inventory" },
      { status: 500 }
    );
  }
}




