import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Permission } from "@prisma/client";
import { hasPermission } from "@/lib/auth";
import { auditLogger, getRequestMetadata } from "@/lib/audit";
import * as XLSX from "xlsx";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !hasPermission(session.user.permissions, Permission.CREATE_CUSTOMERS)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet) as any[];

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2; // +2 because Excel is 1-indexed and we have headers

      try {
        const name = row["Name"] || row["name"];
        if (!name) {
          results.failed++;
          results.errors.push(`Row ${rowNum}: Name is required`);
          continue;
        }

        const email = row["Email"] || row["email"] || null;
        const phone = row["Phone"] || row["phone"] || null;
        const address = row["Address"] || row["address"] || null;
        const city = row["City"] || row["city"] || null;
        const state = row["State"] || row["state"] || null;
        const country = row["Country"] || row["country"] || null;
        const postalCode = row["Postal Code"] || row["Postal Code"] || row["postalCode"] || null;
        const notes = row["Notes"] || row["notes"] || null;
        const tagsStr = row["Tags"] || row["tags"] || "";
        const tags = tagsStr
          ? tagsStr.split(",").map((tag: string) => tag.trim()).filter(Boolean)
          : [];
        const status = row["Status"] || row["status"] || "active";

        // Check if customer already exists
        const existing = await prisma.customer.findFirst({
          where: {
            OR: [
              ...(email ? [{ email }] : []),
              ...(phone ? [{ phone }] : []),
            ],
          },
        });

        if (existing) {
          results.failed++;
          results.errors.push(
            `Row ${rowNum}: Customer with email "${email}" or phone "${phone}" already exists`
          );
          continue;
        }

        const customer = await prisma.customer.create({
          data: {
            name,
            email,
            phone,
            address,
            city,
            state,
            country,
            postalCode,
            notes,
            tags,
            status,
          },
        });

        // Log audit
        const metadata = getRequestMetadata(request);
        await auditLogger.customerCreated(
          session.user.id,
          customer.id,
          customer.name,
          metadata
        );

        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(
          `Row ${rowNum}: ${error.message || "Unknown error"}`
        );
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Error importing customers:", error);
    return NextResponse.json(
      { error: "Failed to import customers" },
      { status: 500 }
    );
  }
}


