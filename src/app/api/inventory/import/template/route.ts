import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Permission } from "@prisma/client";
import { hasPermission } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HEADER =
  "ProductSKU,ProductName,Category,BaseUnit,Brand,Description,Stock,MinStock,FallbackCost,ImageURL,VariationName,QuantityInBaseUnit,VariationPrice,VariationCost,Price";

/** 15 columns; escape fields that might contain commas by quoting (none in samples). */
function csvRow(cols: string[]): string {
  return cols.join(",");
}

/**
 * Continuation row: same SKU, product columns 2–10 empty (9 cells), then variation + optional Price.
 * Columns: 1=SKU, 2–10=name…image (9 empties), 11–15=variation…price
 */
function continuationRow(
  sku: string,
  variationName: string,
  quantityInBaseUnit: string,
  variationPrice: string,
  variationCost: string,
  legacyPrice = ""
): string {
  const nineEmptyProductFields = Array(9).fill("");
  return csvRow([
    sku,
    ...nineEmptyProductFields,
    variationName,
    quantityInBaseUnit,
    variationPrice,
    variationCost,
    legacyPrice,
  ]);
}

function buildTemplateCsv(): string {
  // Multi-variation: one phone accessory sold as single unit or 2-pack (whole-number base quantities only).
  const multiFirst = csvRow([
    "SAM-S25-GLASS-CLR",
    "Samsung Galaxy S25 Ultra Tempered Glass Screen Protector (clear)",
    "Phones & accessories",
    "unit",
    "Samsung",
    "Stock is counted per single protector. Twin-pack removes 2 units from stock.",
    "360",
    "24",
    "6.50",
    "",
    "Single",
    "1",
    "24.99",
    "9.80",
    "",
  ]);

  const multiSecond = continuationRow(
    "SAM-S25-GLASS-CLR",
    "Twin-pack",
    "2",
    "44.99",
    "17.50",
    ""
  );

  // Another multi-variation: charger cable — each vs sealed retail box of 10 cables.
  const cableFirst = csvRow([
    "ANK-C2C-240W-1M",
    "Anker Prime 240W USB-C to USB-C Cable (1 meter)",
    "Electronics - Cables",
    "unit",
    "Anker",
    "Base unit is one cable. Carton sells 10 cables from the same pool.",
    "500",
    "40",
    "11.00",
    "",
    "Each",
    "1",
    "22.99",
    "13.25",
    "",
  ]);

  const cableSecond = continuationRow(
    "ANK-C2C-240W-1M",
    "Carton-10",
    "10",
    "199.99",
    "118.00",
    ""
  );

  // Legacy single row: Price column only (no variation names); good for simple SKUs.
  const legacy = csvRow([
    "PAN-ENLOOP-AA4",
    "Panasonic Eneloop AA Rechargeable Batteries (4-pack card)",
    "Electronics - Batteries",
    "card",
    "Panasonic",
    "One retail card per row. Use Price for the card; cost optional.",
    "120",
    "15",
    "7.25",
    "",
    "",
    "",
    "",
    "8.40",
    "14.99",
  ]);

  const rows = [HEADER, multiFirst, multiSecond, cableFirst, cableSecond, legacy];
  return `\uFEFF${rows.join("\r\n")}\r\n`;
}

const TEMPLATE_CSV = buildTemplateCsv();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !hasPermission(session.user.permissions, Permission.CREATE_INVENTORY)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return new NextResponse(TEMPLATE_CSV, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="inventory-import-template.csv"',
      },
    });
  } catch (error) {
    console.error("Error serving import template:", error);
    return NextResponse.json(
      { error: "Failed to generate template" },
      { status: 500 }
    );
  }
}
