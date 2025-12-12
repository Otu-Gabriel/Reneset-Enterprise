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
      !hasPermission(session.user.permissions, Permission.VIEW_CUSTOMERS)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }
    if (status) {
      where.status = status;
    }

    const customers = await prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { sales: true },
        },
      },
    });

    // Calculate statistics for each customer
    const customersWithStats = await Promise.all(
      customers.map(async (customer) => {
        const sales = await prisma.sale.findMany({
          where: { customerId: customer.id },
          select: { totalAmount: true },
        });

        const totalSpent = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);

        return {
          ...customer,
          totalSales: sales.length,
          totalSpent,
        };
      })
    );

    // Generate CSV
    const headers = [
      "Name",
      "Email",
      "Phone",
      "Address",
      "City",
      "State",
      "Country",
      "Postal Code",
      "Status",
      "Tags",
      "Total Sales",
      "Total Spent",
      "Created At",
    ];

    const rows = customersWithStats.map((customer) => [
      customer.name,
      customer.email || "",
      customer.phone || "",
      customer.address || "",
      customer.city || "",
      customer.state || "",
      customer.country || "",
      customer.postalCode || "",
      customer.status,
      customer.tags.join("; "),
      customer.totalSales.toString(),
      customer.totalSpent.toString(),
      customer.createdAt.toISOString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="customers-export-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error exporting customers:", error);
    return NextResponse.json(
      { error: "Failed to export customers" },
      { status: 500 }
    );
  }
}


