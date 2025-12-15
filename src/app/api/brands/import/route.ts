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
      !hasPermission(session.user.permissions, Permission.CREATE_BRANDS)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Read file buffer
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet) as any[];

    if (data.length === 0) {
      return NextResponse.json(
        { error: "Excel file is empty" },
        { status: 400 }
      );
    }

    // Expected columns: Name, Category (category name), Description (optional)
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    const rawMetadata = getRequestMetadata(request);
    const metadata = {
      ipAddress: rawMetadata.ipAddress ?? undefined,
      userAgent: rawMetadata.userAgent ?? undefined,
    };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const name = row.Name || row.name || row["Brand Name"];
      const categoryName = row.Category || row.category || row["Category Name"];
      const description = row.Description || row.description || null;

      if (!name || !categoryName) {
        results.failed++;
        results.errors.push(
          `Row ${i + 2}: Missing brand name or category name`
        );
        continue;
      }

      try {
        // Find category by name
        const category = await prisma.category.findUnique({
          where: { name: String(categoryName).trim() },
        });

        if (!category) {
          results.failed++;
          results.errors.push(
            `Row ${i + 2}: Category "${categoryName}" not found`
          );
          continue;
        }

        // Check if brand already exists in this category
        const existing = await prisma.brand.findUnique({
          where: {
            name_categoryId: {
              name: String(name).trim(),
              categoryId: category.id,
            },
          },
        });

        if (existing) {
          results.failed++;
          results.errors.push(
            `Row ${i + 2}: Brand "${name}" already exists in category "${categoryName}"`
          );
          continue;
        }

        const brand = await prisma.brand.create({
          data: {
            name: String(name).trim(),
            description: description ? String(description).trim() : null,
            categoryId: category.id,
          },
        });

        await auditLogger.brandCreated(
          session.user.id,
          brand.id,
          brand.name,
          metadata
        );

        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(
          `Row ${i + 2}: ${error.message || "Unknown error"}`
        );
      }
    }

    return NextResponse.json({
      message: `Import completed: ${results.success} succeeded, ${results.failed} failed`,
      results,
    });
  } catch (error: any) {
    console.error("Error importing brands:", error);
    return NextResponse.json(
      { error: error.message || "Failed to import brands" },
      { status: 500 }
    );
  }
}
