import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Permission } from "@prisma/client";
import { hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saleItemLineCogs } from "@/lib/product-variations";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function convertToCSV(data: any[], headers: string[]): string {
  const rows = data.map((row) =>
    headers.map((header) => {
      const value = row[header];
      if (value === null || value === undefined) return "";
      if (typeof value === "object") return JSON.stringify(value);
      return String(value).replace(/"/g, '""');
    })
  );

  const csvContent = [
    headers.map((h) => `"${h}"`).join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  return csvContent;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !hasPermission(session.user.permissions, Permission.EXPORT_REPORTS)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canViewProductCost = hasPermission(
      session.user.permissions,
      Permission.VIEW_PRODUCT_COST
    );

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get("type") || "sales";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let start: Date | undefined;
    let end: Date | undefined;

    if (startDate) {
      start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
    }
    if (endDate) {
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    }

    const dateFilter = start || end ? {
      ...(start && { gte: start }),
      ...(end && { lte: end }),
    } : undefined;

    let csvContent = "";
    let filename = "";

    switch (reportType) {
      case "sales": {
        const sales = await prisma.sale.findMany({
          where: {
            ...(dateFilter && { saleDate: dateFilter }),
          },
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

        const exportData = sales.flatMap((sale) =>
          sale.items.map((item) => ({
            "Sale Number": sale.saleNumber,
            "Sale Date": sale.saleDate.toISOString().split("T")[0],
            "Customer Name": sale.customerName,
            "Customer Email": sale.customerEmail || "",
            "Customer Phone": sale.customerPhone || "",
            "Product Name": item.product.name,
            "Product SKU": item.product.sku,
            "Category": item.product.category,
            "Quantity": item.quantity,
            "Unit Price": item.price,
            "Discount": item.discount,
            "Subtotal": item.subtotal,
            "Total Amount": sale.totalAmount,
            "Payment Method": sale.paymentMethod || "",
            "Status": sale.status,
            "Sales Person": sale.user.name,
            "Sales Person Email": sale.user.email,
          }))
        );

        csvContent = convertToCSV(exportData, [
          "Sale Number",
          "Sale Date",
          "Customer Name",
          "Customer Email",
          "Customer Phone",
          "Product Name",
          "Product SKU",
          "Category",
          "Quantity",
          "Unit Price",
          "Discount",
          "Subtotal",
          "Total Amount",
          "Payment Method",
          "Status",
          "Sales Person",
          "Sales Person Email",
        ]);
        filename = `sales-report-${new Date().toISOString().split("T")[0]}.csv`;
        break;
      }

      case "inventory": {
        const products = await prisma.product.findMany({
          include: {
            brand: {
              select: {
                name: true,
                category: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        });

        const exportData = products.map((product) => ({
          "Product Name": product.name,
          "SKU": product.sku,
          "Category": product.category,
          "Brand": product.brand?.name || "",
          "Price": product.price,
          ...(canViewProductCost ? { Cost: product.cost ?? 0 } : {}),
          "Stock": product.stock,
          "Min Stock": product.minStock,
          "Unit": product.unit,
          "Stock Value": product.price * product.stock,
          "Status": product.stock === 0 ? "Out of Stock" : product.stock <= product.minStock ? "Low Stock" : "In Stock",
        }));

        const headers = [
          "Product Name",
          "SKU",
          "Category",
          "Brand",
          "Price",
          ...(canViewProductCost ? (["Cost"] as const) : []),
          "Stock",
          "Min Stock",
          "Unit",
          "Stock Value",
          "Status",
        ];
        csvContent = convertToCSV(exportData, headers);
        filename = `inventory-report-${new Date().toISOString().split("T")[0]}.csv`;
        break;
      }

      case "employees": {
        const employees = await prisma.employee.findMany({
          include: {
            createdBy: {
              select: {
                name: true,
              },
            },
          },
        });

        const exportData = employees.map((employee) => ({
          "Name": employee.name,
          "Email": employee.email,
          "Phone": employee.phone || "",
          "Position": employee.position,
          "Department": employee.department || "",
          "Status": employee.status,
          "Hire Date": employee.hireDate.toISOString().split("T")[0],
          "Salary": employee.salary || 0,
          "Address": employee.address || "",
        }));

        csvContent = convertToCSV(exportData, [
          "Name",
          "Email",
          "Phone",
          "Position",
          "Department",
          "Status",
          "Hire Date",
          "Salary",
          "Address",
        ]);
        filename = `employees-report-${new Date().toISOString().split("T")[0]}.csv`;
        break;
      }

      case "financial": {
        const sales = await prisma.sale.findMany({
          where: {
            ...(dateFilter && { saleDate: dateFilter }),
          },
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        });

        // Group by month
        const monthlyMap = new Map<string, { revenue: number; cost: number; profit: number }>();
        sales.forEach((sale) => {
          const monthKey = `${sale.saleDate.getFullYear()}-${String(sale.saleDate.getMonth() + 1).padStart(2, "0")}`;
          const existing = monthlyMap.get(monthKey) || { revenue: 0, cost: 0, profit: 0 };
          const saleRevenue = sale.totalAmount;
          const saleCost = sale.items.reduce(
            (sum, item) => sum + saleItemLineCogs(item),
            0
          );
          monthlyMap.set(monthKey, {
            revenue: existing.revenue + saleRevenue,
            cost: existing.cost + saleCost,
            profit: existing.profit + (saleRevenue - saleCost),
          });
        });

        const exportDataFull = Array.from(monthlyMap.entries())
          .map(([month, data]) => ({
            Month: month,
            Revenue: data.revenue,
            ...(canViewProductCost
              ? {
                  Cost: data.cost,
                  Profit: data.profit,
                  "Profit Margin":
                    data.revenue > 0
                      ? ((data.profit / data.revenue) * 100).toFixed(2)
                      : "0.00",
                }
              : {}),
          }))
          .sort((a, b) => a.Month.localeCompare(b.Month));

        csvContent = convertToCSV(
          exportDataFull,
          [
            "Month",
            "Revenue",
            ...(canViewProductCost
              ? (["Cost", "Profit", "Profit Margin"] as const)
              : []),
          ]
        );
        filename = `financial-report-${new Date().toISOString().split("T")[0]}.csv`;
        break;
      }

      default:
        return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
    }

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error exporting report:", error);
    return NextResponse.json(
      { error: "Failed to export report" },
      { status: 500 }
    );
  }
}

