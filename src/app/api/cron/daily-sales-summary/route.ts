import { NextRequest, NextResponse } from "next/server";
import { runDailySalesSummaryJob } from "@/lib/email/daily-sales-summary";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Call from a scheduler (e.g. every 5 minutes) with header:
 *   Authorization: Bearer <CRON_SECRET>
 * Same value as process.env.CRON_SECRET
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not set on the server" },
      { status: 503 }
    );
  }

  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const querySecret = request.nextUrl.searchParams.get("secret");
  const token = bearer || querySecret;
  if (token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runDailySalesSummaryJob();
  if ("error" in result && result.error) {
    return NextResponse.json(
      { ok: false, sent: false, error: result.error },
      { status: 500 }
    );
  }
  if ("reason" in result) {
    return NextResponse.json({
      ok: true,
      sent: result.sent,
      reason: result.reason,
    });
  }
  return NextResponse.json({ ok: true, sent: true });
}
