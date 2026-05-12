import type { PrismaClient } from "@prisma/client";

const SALE_REF_PREFIX = "REC";

/** Calendar date in local timezone as YYYYMMDD (matches typical receipt numbering). */
export function formatSaleRefDatePart(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

const saleRefPattern = new RegExp(`^${SALE_REF_PREFIX}-\\d{8}-(\\d{4})$`);

/**
 * Compact label for tables/lists: REC-20260512-0001 → REC-0001 (prefix + daily sequence only).
 * Hover via `title={saleNumber}` on the cell. Legacy values (e.g. #02001) unchanged.
 */
export function formatSaleNumberShort(saleNumber: string): string {
  const rec = saleNumber.match(/^([A-Za-z]+)-\d{8}-(\d{4})$/);
  if (rec) return `${rec[1]}-${rec[2]}`;
  return saleNumber;
}

/**
 * Next human-readable sale reference: REC-YYYYMMDD-0001 (sequence resets per calendar day, local time).
 */
export async function allocateNextSaleNumber(
  prisma: PrismaClient,
  at: Date = new Date(),
): Promise<string> {
  const datePart = formatSaleRefDatePart(at);
  const prefix = `${SALE_REF_PREFIX}-${datePart}-`;

  const rows = await prisma.sale.findMany({
    where: { saleNumber: { startsWith: prefix } },
    select: { saleNumber: true },
  });

  let maxSeq = 0;
  for (const { saleNumber } of rows) {
    const m = saleNumber.match(saleRefPattern);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!Number.isNaN(n)) maxSeq = Math.max(maxSeq, n);
    }
  }

  const next = maxSeq + 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}
