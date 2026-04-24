import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Permission } from "@prisma/client";
import { hasPermission } from "@/lib/auth";
import { isSmtpConfigured } from "@/lib/email/smtp";
import { runDailySalesSummaryJob } from "@/lib/email/daily-sales-summary";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Sends a one-off test email (subject prefixed [Test]). Does not update last-sent. */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    !hasPermission(session.user.permissions, Permission.MANAGE_SYSTEM_SETTINGS)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSmtpConfigured()) {
    return NextResponse.json(
      {
        error:
          "SMTP is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM in the server environment.",
      },
      { status: 400 }
    );
  }

  const result = await runDailySalesSummaryJob({ forceTest: true });
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  if (!result.sent && "reason" in result) {
    if (result.reason === "invalid_send_time") {
      return NextResponse.json(
        {
          error:
            "Daily send time cannot be 00:00 (empty reporting window). Set a time of 00:01 or later, then save and try again.",
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: `Cannot send test: ${result.reason}` },
      { status: 400 }
    );
  }
  return NextResponse.json({ success: true });
}
