import { DateTime } from "luxon";
import { prisma } from "@/lib/prisma";
import { isMidnightEndWindowTime } from "@/lib/daily-summary-time";
import { sendSmtpEmail, isSmtpConfigured } from "@/lib/email/smtp";

/** If `lastDailySummarySentOn` is missing, never backfill more than this many days. */
const MAX_CATCH_UP_DAYS = 14;

function parseHm(s: string): { h: number; m: number } {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(s?.trim() || "");
  if (!m) return { h: 9, m: 0 };
  return { h: parseInt(m[1], 10), m: parseInt(m[2], 10) };
}

function isValidIanaTimeZone(tz: string): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    DateTime.now().setZone(tz).isValid;
    return DateTime.now().setZone(tz).isValid;
  } catch {
    return false;
  }
}

/**
 * In `timeZone`, on `reportYmd` (ISO date): from 00:00 through scheduled HH:MM that day.
 * Example: 6:00pm send in Accra → sales from that day 00:00–18:00 Accra (UTC instants).
 */
function getDayWindowThroughScheduleUtc(
  timeZone: string,
  scheduleHm: string,
  reportYmd: string
): { start: Date; end: Date; dateYmd: string; endTimeLabel: string; zone: string } {
  const zone = isValidIanaTimeZone(timeZone) ? timeZone : "UTC";
  const { h, m } = parseHm(scheduleHm);
  const dayStart = DateTime.fromISO(reportYmd, { zone }).startOf("day");
  if (!dayStart.isValid) {
    const fallback = DateTime.now().setZone(zone).startOf("day");
    return getDayWindowThroughScheduleUtc(timeZone, scheduleHm, fallback.toISODate()!);
  }
  const windowEnd = dayStart.set({ hour: h, minute: m, second: 0, millisecond: 0 });
  const endTimeLabel = windowEnd.toFormat("h:mm a");
  return {
    start: dayStart.toUTC().toJSDate(),
    end: windowEnd.toUTC().toJSDate(),
    dateYmd: dayStart.toISODate()!,
    endTimeLabel,
    zone,
  };
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return amount.toFixed(2) + " " + currency;
  }
}

export type TodayWindowStats = Awaited<ReturnType<typeof computeTodayWindowSalesStats>>;

export async function computeTodayWindowSalesStats(
  timeZone: string,
  scheduleHm: string,
  reportYmd?: string
) {
  const zone = isValidIanaTimeZone(timeZone) ? timeZone : "UTC";
  const ymd =
    reportYmd ?? DateTime.now().setZone(zone).toISODate()!;
  const { start, end, dateYmd, endTimeLabel, zone: z } =
    getDayWindowThroughScheduleUtc(timeZone, scheduleHm, ymd);
  const [agg, topProducts] = await Promise.all([
    prisma.sale.aggregate({
      where: {
        saleDate: { gte: start, lte: end },
      },
      _sum: { totalAmount: true },
      _count: { id: true },
    }),
    prisma.saleItem.groupBy({
      by: ["productId"],
      where: {
        sale: { saleDate: { gte: start, lte: end } },
      },
      _sum: { subtotal: true, quantity: true },
      orderBy: { _sum: { subtotal: "desc" } },
      take: 5,
    }),
  ]);

  const productNames: Record<string, string> = {};
  if (topProducts.length) {
    const products = await prisma.product.findMany({
      where: { id: { in: topProducts.map((p) => p.productId) } },
      select: { id: true, name: true },
    });
    for (const p of products) productNames[p.id] = p.name;
  }

  return {
    dateYmd,
    endTimeLabel,
    timeZone: z,
    count: agg._count.id,
    total: agg._sum.totalAmount ?? 0,
    topLines: topProducts.map((r) => ({
      name: productNames[r.productId] || r.productId,
      quantity: r._sum.quantity ?? 0,
      subtotal: r._sum.subtotal ?? 0,
    })),
  };
}

function buildEmailHtml(company: string, currency: string, stats: TodayWindowStats) {
  const rows = stats.topLines
    .map(
      (l) =>
        `<tr><td style="padding:8px;border:1px solid #e5e7eb">${escapeHtml(
          l.name
        )}</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:right">${l.quantity}</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:right">${formatMoney(
          l.subtotal,
          currency
        )}</td></tr>`
    )
    .join("");

  return `<!DOCTYPE html><html><body style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#111827">
  <h1 style="font-size:18px">Daily sales summary</h1>
  <p style="color:#4b5563"><strong>${escapeHtml(company)}</strong></p>
  <p>Reporting period: <strong>${stats.dateYmd}</strong> — from midnight to <strong>${escapeHtml(
    stats.endTimeLabel
  )}</strong> <span style="color:#6b7280">(${escapeHtml(stats.timeZone)})</span></p>
  <p>Orders: <strong>${stats.count}</strong> &nbsp;|&nbsp; Total: <strong>${formatMoney(
    stats.total,
    currency
  )}</strong></p>
  <h2 style="font-size:15px;margin-top:20px">Top products by revenue</h2>
  <table style="border-collapse:collapse;width:100%;max-width:560px">
    <thead><tr>
      <th style="text-align:left;padding:8px;border:1px solid #e5e7eb">Product</th>
      <th style="text-align:right;padding:8px;border:1px solid #e5e7eb">Qty</th>
      <th style="text-align:right;padding:8px;border:1px solid #e5e7eb">Subtotal</th>
    </tr></thead>
    <tbody>${rows || "<tr><td colspan=3 style=\"padding:8px\">No line items</td></tr>"}</tbody>
  </table>
  <p style="margin-top:24px;font-size:12px;color:#6b7280">This is an automated message from your inventory system.</p>
  </body></html>`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Earliest local calendar day (after lastSentYmd) whose reporting window has ended
 * and that is still due. For daily cron: one send per run, oldest pending first.
 */
export function findPendingReportYmd(
  timeZone: string,
  dailyTimeHm: string,
  lastSentYmd: string | null
): { reportYmd: string } | { reason: string } {
  const zone = isValidIanaTimeZone(timeZone) ? timeZone : "UTC";
  const { h, m } = parseHm(dailyTimeHm);
  const nowZ = DateTime.now().setZone(zone);
  const todayStart = nowZ.startOf("day");

  if (!lastSentYmd) {
    let d = todayStart;
    for (let i = 0; i < MAX_CATCH_UP_DAYS; i++) {
      const close = d.set({ hour: h, minute: m, second: 0, millisecond: 0 });
      if (nowZ >= close) {
        return { reportYmd: d.toISODate()! };
      }
      d = d.minus({ days: 1 });
    }
    return { reason: "nothing_pending" };
  }

  let d = DateTime.fromISO(lastSentYmd, { zone }).plus({ days: 1 }).startOf("day");
  const minDay = todayStart.minus({ days: MAX_CATCH_UP_DAYS });
  if (d < minDay) {
    d = minDay;
  }

  while (d <= todayStart) {
    const ymd = d.toISODate()!;
    const close = d.set({ hour: h, minute: m, second: 0, millisecond: 0 });
    if (nowZ >= close) {
      return { reportYmd: ymd };
    }
    d = d.plus({ days: 1 });
  }

  return { reason: "nothing_pending" };
}

export type SendResult =
  | { sent: true }
  | { sent: false; reason: string }
  | { sent: false; error: string };

/**
 * Run from daily cron (Hobby: once/day UTC). Sends one pending report if the local
 * reporting window for that calendar day has closed. Ignores schedule guards if forceTest.
 */
export async function runDailySalesSummaryJob(options: { forceTest?: boolean } = {}): Promise<SendResult> {
  if (!isSmtpConfigured()) {
    return { sent: false, reason: "smtp_not_configured" };
  }

  const row = await prisma.systemSettings.findUnique({ where: { id: "system" } });
  if (!row) {
    return { sent: false, reason: "no_settings" };
  }
  if (!options.forceTest && !row.dailySummaryEnabled) {
    return { sent: false, reason: "disabled" };
  }
  if (!row.dailySummaryEmail?.trim()) {
    return { sent: false, reason: "no_recipient" };
  }

  const tz = row.dailySummaryTimezone || "UTC";
  const timeStr = row.dailySummaryTime || "09:00";

  if (isMidnightEndWindowTime(timeStr)) {
    return { sent: false, reason: "invalid_send_time" };
  }

  let reportYmd: string | undefined;
  if (!options.forceTest) {
    const pending = findPendingReportYmd(tz, timeStr, row.lastDailySummarySentOn);
    if ("reason" in pending) {
      return { sent: false, reason: pending.reason };
    }
    reportYmd = pending.reportYmd;
  }

  const stats = await computeTodayWindowSalesStats(tz, timeStr, reportYmd);
  const company = row.companyName || "Inventory";
  const currency = row.currency || "USD";

  const text = `Daily sales summary – ${company}
Date: ${stats.dateYmd} (midnight through ${stats.endTimeLabel} ${stats.timeZone})
Orders: ${stats.count}
Total: ${formatMoney(stats.total, currency)}
`;

  try {
    await sendSmtpEmail({
      to: row.dailySummaryEmail.trim(),
      subject: options.forceTest
        ? `[Test] Sales today (${stats.dateYmd} → ${stats.endTimeLabel})`
        : `Sales today (${stats.dateYmd} → ${stats.endTimeLabel})`,
      text,
      html: buildEmailHtml(company, currency, stats),
    });

    if (!options.forceTest) {
      await prisma.systemSettings.update({
        where: { id: "system" },
        data: { lastDailySummarySentOn: stats.dateYmd },
      });
    }

    return { sent: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "send_failed";
    return { sent: false, error: msg };
  }
}
