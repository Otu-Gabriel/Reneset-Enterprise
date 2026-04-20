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

    // Get all sales with customer information
    const allSales = await prisma.sale.findMany({
      select: {
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        customerId: true,
      },
    });

    // Create a map to track unique customer combinations
    const uniqueCustomers = new Map<
      string,
      {
        customerName: string;
        customerEmail: string | null;
        customerPhone: string | null;
      }
    >();

    // Extract unique customer combinations
    for (const sale of allSales) {
      if (!sale.customerName) continue;

      // Create a unique key based on name, email, and phone
      const key = `${sale.customerName.toLowerCase()}|${sale.customerEmail?.toLowerCase() || ""}|${sale.customerPhone || ""}`;

      if (!uniqueCustomers.has(key)) {
        uniqueCustomers.set(key, {
          customerName: sale.customerName,
          customerEmail: sale.customerEmail,
          customerPhone: sale.customerPhone,
        });
      }
    }

    const sales = Array.from(uniqueCustomers.values());

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
        // Check if customer already exists by name, email, or phone
        const existing = await prisma.customer.findFirst({
          where: {
            OR: [
              { name: { equals: sale.customerName, mode: "insensitive" } },
              ...(sale.customerEmail ? [{ email: sale.customerEmail }] : []),
              ...(sale.customerPhone ? [{ phone: sale.customerPhone }] : []),
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
            ...(sale.customerEmail
              ? { customerEmail: sale.customerEmail }
              : {}),
            ...(sale.customerPhone
              ? { customerPhone: sale.customerPhone }
              : {}),
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
