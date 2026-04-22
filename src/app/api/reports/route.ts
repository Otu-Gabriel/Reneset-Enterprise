import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Permission } from "@prisma/client";
import { hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saleItemLineCogs } from "@/lib/product-variations";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !hasPermission(session.user.permissions, Permission.VIEW_REPORTS)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get("type") || "sales";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let start: Date | undefined;
    let end: Date | undefined;

    // Only create dates if valid date strings are provided
    if (startDate && startDate.trim() !== "") {
      const parsedStart = new Date(startDate);
      if (!isNaN(parsedStart.getTime())) {
        start = parsedStart;
        start.setHours(0, 0, 0, 0);
      }
    }
    if (endDate && endDate.trim() !== "") {
      const parsedEnd = new Date(endDate);
      if (!isNaN(parsedEnd.getTime())) {
        end = parsedEnd;
        end.setHours(23, 59, 59, 999);
      }
    }

    const dateFilter = start || end ? {
      ...(start && { gte: start }),
      ...(end && { lte: end }),
    } : undefined;

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

        const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const totalOrders = sales.length;
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // Sales by category
        const categoryMap = new Map<string, number>();
        sales.forEach((sale) => {
          sale.items.forEach((item) => {
            const category = item.product.category;
            const current = categoryMap.get(category) || 0;
            categoryMap.set(category, current + item.subtotal);
          });
        });

        // Top products
        const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();
        sales.forEach((sale) => {
          sale.items.forEach((item) => {
            const existing = productMap.get(item.productId) || {
              name: item.product.name,
              quantity: 0,
              revenue: 0,
            };
            productMap.set(item.productId, {
              name: item.product.name,
              quantity: existing.quantity + item.quantity,
              revenue: existing.revenue + item.subtotal,
            });
          });
        });

        const topProducts = Array.from(productMap.values())
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10);

        // Daily sales for chart
        const dailySalesMap = new Map<string, number>();
        sales.forEach((sale) => {
          const dateKey = sale.saleDate.toISOString().split("T")[0];
          const current = dailySalesMap.get(dateKey) || 0;
          dailySalesMap.set(dateKey, current + sale.totalAmount);
        });

        const dailySales = Array.from(dailySalesMap.entries())
          .map(([date, revenue]) => ({ date, revenue }))
          .sort((a, b) => a.date.localeCompare(b.date));

        // Sales by payment method
        const paymentMethodMap = new Map<string, number>();
        sales.forEach((sale) => {
          const method = sale.paymentMethod || "cash";
          const current = paymentMethodMap.get(method) || 0;
          paymentMethodMap.set(method, current + sale.totalAmount);
        });

        return NextResponse.json({
          type: "sales",
          summary: {
            totalRevenue,
            totalOrders,
            averageOrderValue,
          },
          categorySales: Array.from(categoryMap.entries()).map(([category, value]) => ({
            category,
            value,
          })),
          topProducts,
          dailySales,
          paymentMethods: Array.from(paymentMethodMap.entries()).map(([method, value]) => ({
            method,
            value,
          })),
          sales: sales.slice(0, 100), // Limit for performance
        });
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
            saleItems: {
              where: dateFilter ? {
                createdAt: dateFilter,
              } : undefined,
              include: {
                sale: true,
              },
            },
          },
        });

        const totalProducts = products.length;
        const totalStockValue = products.reduce(
          (sum, p) => sum + p.price * p.stock,
          0
        );
        const lowStockItems = products.filter((p) => p.stock <= p.minStock);
        const outOfStockItems = products.filter((p) => p.stock === 0);

        // Inventory by category
        const categoryMap = new Map<string, { count: number; value: number }>();
        products.forEach((product) => {
          const category = product.category;
          const existing = categoryMap.get(category) || { count: 0, value: 0 };
          categoryMap.set(category, {
            count: existing.count + 1,
            value: existing.value + product.price * product.stock,
          });
        });

        // Most sold products
        const productSalesMap = new Map<string, { name: string; quantity: number; revenue: number }>();
        products.forEach((product) => {
          const totalQuantity = product.saleItems.reduce((sum, item) => sum + item.quantity, 0);
          const totalRevenue = product.saleItems.reduce((sum, item) => sum + item.subtotal, 0);
          if (totalQuantity > 0) {
            productSalesMap.set(product.id, {
              name: product.name,
              quantity: totalQuantity,
              revenue: totalRevenue,
            });
          }
        });

        const mostSoldProducts = Array.from(productSalesMap.values())
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 10);

        return NextResponse.json({
          type: "inventory",
          summary: {
            totalProducts,
            totalStockValue,
            lowStockCount: lowStockItems.length,
            outOfStockCount: outOfStockItems.length,
          },
          categoryBreakdown: Array.from(categoryMap.entries()).map(([category, data]) => ({
            category,
            ...data,
          })),
          lowStockItems: lowStockItems.map((p) => ({
            id: p.id,
            name: p.name,
            stock: p.stock,
            minStock: p.minStock,
            category: p.category,
          })),
          mostSoldProducts,
        });
      }

      case "employees": {
        // Always fetch ALL employees for accurate stats (not filtered by date)
        // Date filter only affects sales performance data and employee list display
        const allEmployees = await prisma.employee.findMany({
          orderBy: {
            hireDate: "desc",
          },
        });

        // Calculate stats from ALL employees (always current/live data)
        const totalEmployees = allEmployees.length;
        // Count active employees - check for various active status values
        const activeEmployees = allEmployees.filter((e) => {
          const status = (e.status || "").toLowerCase().trim();
          return status === "active" || status === "";
        }).length;
        const inactiveEmployees = totalEmployees - activeEmployees;

        // For display, optionally filter by hire date if date range is provided
        // Only filter if BOTH start and end dates are valid
        let employees = allEmployees;
        if (dateFilter && start && end) {
          employees = allEmployees.filter((e) => {
            const hireDate = new Date(e.hireDate);
            hireDate.setHours(0, 0, 0, 0);
            return hireDate >= start && hireDate <= end;
          });
        }

        // Employees by department - use ALL employees for accurate breakdown
        const departmentMap = new Map<string, number>();
        allEmployees.forEach((employee) => {
          const dept = employee.department || "Unassigned";
          const current = departmentMap.get(dept) || 0;
          departmentMap.set(dept, current + 1);
        });

        // Employees by position - use ALL employees for accurate breakdown
        const positionMap = new Map<string, number>();
        allEmployees.forEach((employee) => {
          const pos = employee.position;
          const current = positionMap.get(pos) || 0;
          positionMap.set(pos, current + 1);
        });

        // Get sales by employee (if user has sales)
        const salesByEmployee = await prisma.sale.groupBy({
          by: ["userId"],
          where: dateFilter ? {
            saleDate: dateFilter,
          } : undefined,
          _count: {
            id: true,
          },
          _sum: {
            totalAmount: true,
          },
        });

        const employeeSales = await Promise.all(
          salesByEmployee.map(async (sale) => {
            const user = await prisma.user.findUnique({
              where: { id: sale.userId },
              select: { name: true, email: true },
            });
            return {
              userId: sale.userId,
              name: user?.name || "Unknown",
              email: user?.email || "",
              salesCount: sale._count.id,
              totalRevenue: sale._sum.totalAmount || 0,
            };
          })
        );

        // Find employee with highest sales
        const topSalesEmployee = employeeSales.length > 0
          ? employeeSales.sort((a, b) => b.totalRevenue - a.totalRevenue)[0]
          : null;

        const mappedEmployees = employees.map((e) => {
          // Ensure all fields are properly mapped
          return {
            id: e.id,
            name: e.name || "",
            email: e.email || "",
            phone: e.phone || null,
            position: e.position || "",
            department: e.department || null,
            salary: e.salary || null,
            status: e.status || "active",
            hireDate: e.hireDate,
            address: e.address || null,
            createdAt: e.createdAt,
            updatedAt: e.updatedAt,
          };
        });

        const responseData = {
          type: "employees",
          summary: {
            totalEmployees,
            activeEmployees,
            inactiveEmployees,
            topSalesEmployee: topSalesEmployee ? {
              name: topSalesEmployee.name,
              email: topSalesEmployee.email,
              salesCount: topSalesEmployee.salesCount,
              totalRevenue: topSalesEmployee.totalRevenue,
            } : null,
          },
          departmentBreakdown: Array.from(departmentMap.entries()).map(([department, count]) => ({
            department,
            count,
          })),
          positionBreakdown: Array.from(positionMap.entries()).map(([position, count]) => ({
            position,
            count,
          })),
          employeeSales: employeeSales.sort((a, b) => b.totalRevenue - a.totalRevenue),
          employees: mappedEmployees,
        };
        
        return NextResponse.json(responseData);
      }

      case "financial": {
        const sales = await prisma.sale.findMany({
          where: dateFilter ? {
            saleDate: dateFilter,
          } : undefined,
          include: {
            items: {
              include: {
                product: true,
              },
            },
            installmentPlan: {
              include: {
                payments: true,
              },
            },
          },
        });

        const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const totalCost = sales.reduce((sum, sale) => {
          const saleCost = sale.items.reduce(
            (itemSum, item) => itemSum + saleItemLineCogs(item),
            0
          );
          return sum + saleCost;
        }, 0);
        const grossProfit = totalRevenue - totalCost;
        const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

        // Installment statistics
        const installmentSales = sales.filter((s) => s.installmentPlan);
        const totalInstallmentAmount = installmentSales.reduce(
          (sum, sale) => sum + sale.totalAmount,
          0
        );
        const totalInstallmentPaid = installmentSales.reduce((sum, sale) => {
          if (sale.installmentPlan) {
            const paid = sale.installmentPlan.payments.reduce(
              (pSum, p) => pSum + p.paidAmount,
              0
            );
            return sum + paid;
          }
          return sum;
        }, 0);
        const totalInstallmentOutstanding = totalInstallmentAmount - totalInstallmentPaid;

        // Monthly breakdown
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

        const monthlyBreakdown = Array.from(monthlyMap.entries())
          .map(([month, data]) => ({
            month,
            ...data,
            margin: data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0,
          }))
          .sort((a, b) => a.month.localeCompare(b.month));

        return NextResponse.json({
          type: "financial",
          summary: {
            totalRevenue,
            totalCost,
            grossProfit,
            profitMargin: Math.round(profitMargin * 100) / 100,
            installmentStats: {
              totalInstallmentAmount,
              totalInstallmentPaid,
              totalInstallmentOutstanding,
              installmentCount: installmentSales.length,
            },
          },
          monthlyBreakdown,
        });
      }

      default:
        return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error fetching report:", error);
    return NextResponse.json(
      { error: "Failed to fetch report" },
      { status: 500 }
    );
  }
}

