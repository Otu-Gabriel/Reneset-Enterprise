import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Permission } from "@prisma/client";
import { hasPermission } from "@/lib/auth";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !hasPermission(session.user.permissions, Permission.VIEW_SALES)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const status = searchParams.get("status");
    const productId = searchParams.get("productId");

    // Build where clause
    const where: any = {};

    if (startDate && endDate) {
      where.saleDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (startDate) {
      where.saleDate = {
        gte: new Date(startDate),
      };
    } else if (endDate) {
      where.saleDate = {
        lte: new Date(endDate),
      };
    }

    if (status) {
      where.status = status;
    }

    if (productId) {
      where.items = {
        some: {
          productId: productId,
        },
      };
    }

    // Fetch sales with all necessary data
    const sales = await prisma.sale.findMany({
      where,
      include: {
        items: {
          include: {
            product: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        saleDate: "desc",
      },
    });

    // Convert to CSV format
    const csvRows = [];
    
    // Header row
    csvRows.push([
      "Sale Number",
      "Date",
      "Customer Name",
      "Customer Email",
      "Customer Phone",
      "Product",
      "SKU",
      "Quantity",
      "Unit Price",
      "Discount",
      "Subtotal",
      "Total Amount",
      "Payment Method",
      "Status",
      "Sales Person",
    ].join(","));

    // Data rows
    sales.forEach((sale) => {
      if (sale.items.length === 0) {
        // Sale with no items
        csvRows.push([
          sale.saleNumber,
          sale.saleDate.toISOString().split("T")[0],
          `"${sale.customerName}"`,
          sale.customerEmail || "",
          sale.customerPhone || "",
          "",
          "",
          "",
          "",
          "",
          "",
          sale.totalAmount.toString(),
          sale.paymentMethod || "",
          sale.status,
          sale.user?.name || "",
        ].join(","));
      } else {
        // Sale with items - one row per item
        sale.items.forEach((item, index) => {
          csvRows.push([
            sale.saleNumber,
            sale.saleDate.toISOString().split("T")[0],
            `"${sale.customerName}"`,
            sale.customerEmail || "",
            sale.customerPhone || "",
            `"${item.product.name}"`,
            item.product.sku,
            item.quantity.toString(),
            item.price.toString(),
            (item.discount || 0).toString(),
            item.subtotal.toString(),
            index === 0 ? sale.totalAmount.toString() : "", // Only show total on first row
            index === 0 ? (sale.paymentMethod || "") : "",
            index === 0 ? sale.status : "",
            index === 0 ? (sale.user?.name || "") : "",
          ].join(","));
        });
      }
    });

    const csvContent = csvRows.join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="sales-export-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error exporting sales:", error);
    return NextResponse.json(
      { error: "Failed to export sales" },
      { status: 500 }
    );
  }
}

