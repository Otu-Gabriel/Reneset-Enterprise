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

    // Verify the user exists in the database
    const userExists = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    });

    if (!userExists) {
      console.error(
        `User ID ${session.user.id} from session does not exist in database`
      );
      return NextResponse.json(
        {
          error:
            "Your session is invalid. Please log out and log back in.",
          code: "INVALID_SESSION",
        },
        { status: 401 }
      );
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

    // Find or create customer - MANDATORY when customerName is provided
    let customerIdToUse: string | null = null;
    let finalCustomerName = customerName;

    if (customerId) {
      // Verify customer exists
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
      });
      if (!customer) {
        return NextResponse.json(
          { error: "Customer not found" },
          { status: 404 }
        );
      }
      customerIdToUse = customerId;
    } else if (customerName) {
      // Trim and validate customer name
      const trimmedName = customerName.trim();
      if (!trimmedName || trimmedName.length === 0) {
        return NextResponse.json(
          { error: "Customer name cannot be empty" },
          { status: 400 }
        );
      }

      // Try to find existing customer by name, email, or phone
      const existingCustomer = await prisma.customer.findFirst({
        where: {
          OR: [
            { name: { equals: trimmedName, mode: "insensitive" } },
            ...(customerEmail ? [{ email: customerEmail.trim() }] : []),
            ...(customerPhone ? [{ phone: customerPhone.trim() }] : []),
          ],
        },
      });

      if (existingCustomer) {
        customerIdToUse = existingCustomer.id;
        // Update customer info if we have more details
        try {
          const updateData: any = {};
          if (customerEmail && !existingCustomer.email) {
            updateData.email = customerEmail;
          }
          if (customerPhone && !existingCustomer.phone) {
            updateData.phone = customerPhone;
          }
          if (Object.keys(updateData).length > 0) {
            await prisma.customer.update({
              where: { id: existingCustomer.id },
              data: updateData,
            });
          }
        } catch (updateError: any) {
          console.error("Error updating customer info:", updateError);
          // Continue even if update fails - customer exists and is linked
        }
      } else {
        // Create new customer - MANDATORY
        try {
          const newCustomer = await prisma.customer.create({
            data: {
              name: trimmedName,
              email: customerEmail?.trim() || null,
              phone: customerPhone?.trim() || null,
              status: "active",
            },
          });
          customerIdToUse = newCustomer.id;
          console.log(
            `Created new customer: ${newCustomer.id} - ${newCustomer.name}`
          );

          // Log audit for customer creation
          const metadata = getRequestMetadata(request);
          try {
            await auditLogger.customerCreated(
              session.user.id,
              newCustomer.id,
              newCustomer.name,
              metadata
            );
          } catch (auditError) {
            // Don't fail sale creation if audit logging fails
            console.error("Error logging customer creation audit:", auditError);
          }
        } catch (createError: any) {
          console.error("Error creating customer:", createError);
          // Return error - customer creation is mandatory
          return NextResponse.json(
            {
              error: "Failed to create customer",
              details: createError.message || "Unknown error occurred",
            },
            { status: 500 }
          );
        }
      }
    } else {
      // No customerId and no customerName - this should not happen due to validation above
      return NextResponse.json(
        { error: "Customer information is required" },
        { status: 400 }
      );
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

      // Ensure customerId is set when customerName was provided
      // This is a safety check - customerIdToUse should always be set at this point
      if (customerName && !customerIdToUse) {
        console.error(
          "Critical error: customerName provided but customerIdToUse is null"
        );
        return NextResponse.json(
          {
            error:
              "Failed to create or link customer to sale. Please try again.",
          },
          { status: 500 }
        );
      }

      // Try to create the sale with this number
      try {
        const sale = await prisma.sale.create({
          data: {
            saleNumber,
            customerId: customerIdToUse,
            customerName: finalCustomerName,
            customerEmail: customerEmail?.trim() || null,
            customerPhone: customerPhone?.trim() || null,
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
            console.error(
              "Prisma Client not regenerated. Please run: npm run db:generate"
            );
            return NextResponse.json(
              {
                error:
                  "Installment feature not available. Please regenerate Prisma Client.",
              },
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
            console.error(
              "Prisma Client not regenerated. Please run: npm run db:generate"
            );
            // Delete the plan if payment creation fails
            await prisma.installmentPlan.delete({ where: { id: plan.id } });
            return NextResponse.json(
              {
                error:
                  "Installment feature not available. Please regenerate Prisma Client.",
              },
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
                  decrement: items.find(
                    (i: any) => i.productId === item.productId
                  ).quantity,
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
                  decrement: items.find(
                    (i: any) => i.productId === item.productId
                  ).quantity,
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
