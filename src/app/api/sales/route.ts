import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Permission } from "@prisma/client";
import { hasPermission } from "@/lib/auth";
import { auditLogger, getRequestMetadata } from "@/lib/audit";

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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const productId = searchParams.get("productId") || "";

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { customerName: { contains: search, mode: "insensitive" as any } },
        { saleNumber: { contains: search, mode: "insensitive" as any } },
        { customerEmail: { contains: search, mode: "insensitive" as any } },
        { customerPhone: { contains: search, mode: "insensitive" as any } },
      ];
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

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        skip,
        take: limit,
        orderBy: { saleDate: "desc" },
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
      }),
      prisma.sale.count({ where }),
    ]);

    return NextResponse.json({
      sales,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching sales:", error);
    return NextResponse.json(
      { error: "Failed to fetch sales" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !hasPermission(session.user.permissions, Permission.CREATE_SALES)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      items,
      status = "completed",
      paymentMethod = "cash",
      notes,
      installmentPlan, // { downPayment, numberOfInstallments, frequency, startDate }
    } = body;

    if ((!customerId && !customerName) || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Find or create customer (only if Customer model exists)
    let customerIdToUse: string | null = null;
    try {
      if (customerId) {
        // Verify customer exists
        const customer = await prisma.customer.findUnique({
          where: { id: customerId },
        });
        if (customer) {
          customerIdToUse = customerId;
        }
      } else if (customerName) {
        // Try to find existing customer by email or phone
        const existingCustomer = await prisma.customer.findFirst({
          where: {
            OR: [
              ...(customerEmail ? [{ email: customerEmail }] : []),
              ...(customerPhone ? [{ phone: customerPhone }] : []),
            ],
          },
        });

        if (existingCustomer) {
          customerIdToUse = existingCustomer.id;
        } else {
          // Create new customer
          const newCustomer = await prisma.customer.create({
            data: {
              name: customerName,
              email: customerEmail || null,
              phone: customerPhone || null,
              status: "active",
            },
          });
          customerIdToUse = newCustomer.id;
        }
      }
    } catch (error: any) {
      // If Customer model doesn't exist yet, continue without linking
      // This allows sales to work before migration is run
      console.warn("Customer model not available, continuing without customer link:", error.message);
      customerIdToUse = null;
    }

    // Calculate total amount
    let totalAmount = 0;
    const saleItems = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        return NextResponse.json(
          { error: `Product ${item.productId} not found` },
          { status: 404 }
        );
      }

      if (product.stock < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${product.name}` },
          { status: 400 }
        );
      }

      const itemDiscount = item.discount || 0;
      const subtotal = product.price * item.quantity - itemDiscount;
      totalAmount += subtotal;

      saleItems.push({
        productId: item.productId,
        quantity: item.quantity,
        price: product.price,
        subtotal,
        discount: itemDiscount,
      });
    }

    // Generate unique sale number
    // Find the highest existing sale number and increment
    let saleNumber: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      // Find the highest sale number
      // Get recent sales and find the maximum numeric value
      const recentSales = await prisma.sale.findMany({
        select: { saleNumber: true },
        orderBy: { createdAt: "desc" },
        take: 100, // Get last 100 sales to find max
      });

      let maxNumber = 2000;
      if (recentSales.length > 0) {
        // Extract all numbers and find the maximum
        const numbers = recentSales
          .map((s) => {
            const num = parseInt(s.saleNumber.replace("#", ""));
            return isNaN(num) ? 2000 : num;
          })
          .filter((n) => n >= 2000);
        
        if (numbers.length > 0) {
          maxNumber = Math.max(...numbers);
        }
      }

      const nextNumber = maxNumber + 1;
      saleNumber = `#${String(nextNumber).padStart(4, "0")}`;

      // Try to create the sale with this number
      try {
        const sale = await prisma.sale.create({
          data: {
            saleNumber,
            customerId: customerIdToUse,
            customerName,
            customerEmail,
            customerPhone,
            totalAmount,
            status,
            paymentMethod,
            notes,
            userId: session.user.id,
            items: {
              create: saleItems,
            },
          },
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        });

        // Create installment plan if provided
        let installmentPlanData = null;
        if (installmentPlan && installmentPlan.numberOfInstallments > 0) {
          // Check if Prisma Client has been regenerated
          if (!prisma.installmentPlan) {
            console.error("Prisma Client not regenerated. Please run: npm run db:generate");
            return NextResponse.json(
              { error: "Installment feature not available. Please regenerate Prisma Client." },
              { status: 500 }
            );
          }

          const {
            downPayment = 0,
            numberOfInstallments,
            frequency,
            startDate,
          } = installmentPlan;

          const remainingAmount = totalAmount - downPayment;
          const installmentAmount = remainingAmount / numberOfInstallments;

          // Create the installment plan
          const plan = await prisma.installmentPlan.create({
            data: {
              saleId: sale.id,
              totalAmount,
              downPayment,
              remainingAmount,
              numberOfInstallments,
              installmentAmount,
              frequency,
              startDate: startDate ? new Date(startDate) : new Date(),
              status: "active",
            },
          });

          // Create payment schedule
          const payments = [];
          const start = startDate ? new Date(startDate) : new Date();
          let daysToAdd = 0;

          switch (frequency) {
            case "weekly":
              daysToAdd = 7;
              break;
            case "bi-weekly":
              daysToAdd = 14;
              break;
            case "monthly":
              daysToAdd = 30;
              break;
            default:
              daysToAdd = 30;
          }

          for (let i = 0; i < numberOfInstallments; i++) {
            const dueDate = new Date(start);
            dueDate.setDate(dueDate.getDate() + i * daysToAdd);

            payments.push({
              installmentPlanId: plan.id,
              installmentNumber: i + 1,
              dueDate,
              amount: installmentAmount,
              paidAmount: 0,
              status: "pending",
            });
          }

          // Check if Prisma Client has been regenerated for payments
          if (!prisma.installmentPayment) {
            console.error("Prisma Client not regenerated. Please run: npm run db:generate");
            // Delete the plan if payment creation fails
            await prisma.installmentPlan.delete({ where: { id: plan.id } });
            return NextResponse.json(
              { error: "Installment feature not available. Please regenerate Prisma Client." },
              { status: 500 }
            );
          }

          await prisma.installmentPayment.createMany({
            data: payments,
          });

          installmentPlanData = await prisma.installmentPlan.findUnique({
            where: { id: plan.id },
            include: {
              payments: {
                orderBy: { installmentNumber: "asc" },
              },
            },
          });
        }

        // Update product stock only if status is "completed" and not installment
        if (status === "completed" && !installmentPlan) {
          for (const item of saleItems) {
            await prisma.product.update({
              where: { id: item.productId },
              data: {
                stock: {
                  decrement: items.find((i: any) => i.productId === item.productId)
                    .quantity,
                },
              },
            });
          }
        } else if (installmentPlan) {
          // For installments, update stock immediately (customer gets the product)
          for (const item of saleItems) {
            await prisma.product.update({
              where: { id: item.productId },
              data: {
                stock: {
                  decrement: items.find((i: any) => i.productId === item.productId)
                    .quantity,
                },
              },
            });
          }
        }

        // Log audit
        const metadata = getRequestMetadata(request);
        await auditLogger.saleCreated(
          session.user.id,
          sale.id,
          sale.saleNumber,
          sale.totalAmount,
          metadata
        );

        return NextResponse.json(
          {
            ...sale,
            installmentPlan: installmentPlanData,
          },
          { status: 201 }
        );
      } catch (error: any) {
        // If it's a unique constraint error and we haven't exceeded max attempts, retry
        if (
          error.code === "P2002" &&
          error.meta?.target?.includes("saleNumber") &&
          attempts < maxAttempts
        ) {
          attempts++;
          // Wait a bit before retrying (exponential backoff)
          await new Promise((resolve) => setTimeout(resolve, 100 * attempts));
          continue;
        }
        // If it's not a unique constraint error or we've exceeded attempts, throw
        throw error;
      }
    } while (attempts < maxAttempts);

    // If we've exhausted all attempts, return an error
    return NextResponse.json(
      { error: "Failed to generate unique sale number. Please try again." },
      { status: 500 }
    );
  } catch (error) {
    console.error("Error creating sale:", error);
    return NextResponse.json(
      { error: "Failed to create sale" },
      { status: 500 }
    );
  }
}

