import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Permission } from "@prisma/client";
import { hasPermission } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !hasPermission(session.user.permissions, Permission.CREATE_CUSTOMERS)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Starting customer extraction from sales...");

    // Get all unique customer combinations from sales
    const sales = await prisma.sale.findMany({
      select: {
        customerName: true,
        customerEmail: true,
        customerPhone: true,
      },
      distinct: ["customerName", "customerEmail", "customerPhone"],
    });

    console.log(`Found ${sales.length} unique customer combinations`);

    let created = 0;
    let skipped = 0;
    let linked = 0;
    const errors: string[] = [];

    for (const sale of sales) {
      if (!sale.customerName) {
        skipped++;
        continue;
      }

      try {
        // Check if customer already exists
        const existing = await prisma.customer.findFirst({
          where: {
            OR: [
              ...(sale.customerEmail
                ? [{ email: sale.customerEmail }]
                : []),
              ...(sale.customerPhone
                ? [{ phone: sale.customerPhone }]
                : []),
            ],
          },
        });

        let customerId: string;

        if (existing) {
          customerId = existing.id;
          skipped++;
        } else {
          // Create new customer
          const customer = await prisma.customer.create({
            data: {
              name: sale.customerName,
              email: sale.customerEmail || null,
              phone: sale.customerPhone || null,
              status: "active",
            },
          });
          customerId = customer.id;
          created++;
        }

        // Link all sales with this customer info to the customer
        const updateResult = await prisma.sale.updateMany({
          where: {
            customerName: sale.customerName,
            ...(sale.customerEmail ? { customerEmail: sale.customerEmail } : {}),
            ...(sale.customerPhone ? { customerPhone: sale.customerPhone } : {}),
            customerId: null,
          },
          data: {
            customerId,
          },
        });

        linked += updateResult.count;
      } catch (error: any) {
        errors.push(
          `Error processing customer ${sale.customerName}: ${error.message}`
        );
        console.error(
          `Error processing customer ${sale.customerName}:`,
          error.message
        );
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        customersCreated: created,
        customersSkipped: skipped,
        salesLinked: linked,
        errors: errors.length,
      },
      errors: errors.slice(0, 10), // Return first 10 errors
    });
  } catch (error: any) {
    console.error("Error during customer extraction:", error);
    return NextResponse.json(
      { error: error.message || "Failed to extract customers" },
      { status: 500 }
    );
  }
}


