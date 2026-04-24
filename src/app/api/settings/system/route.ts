import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Permission } from "@prisma/client";
import { hasPermission } from "@/lib/auth";
import { clearSettingsCache } from "@/lib/settings";
import { isMidnightEndWindowTime } from "@/lib/daily-summary-time";
import { DateTime } from "luxon";

// Force dynamic rendering - prevent static generation/prerendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    // Get system settings (no auth required for reading)
    let settings = await prisma.systemSettings.findUnique({
      where: { id: "system" },
    });

    // If settings don't exist, create default ones
    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: {
          id: "system",
          companyName: "GabyGod Technologies",
          currency: "USD",
          dateFormat: "MM/DD/YYYY",
          timeFormat: "12h",
          language: "en",
        },
      });
    }

    return NextResponse.json(settings, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error fetching system settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch system settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !hasPermission(
        session.user.permissions,
        Permission.MANAGE_SYSTEM_SETTINGS
      )
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      companyName,
      logoUrl,
      faviconUrl,
      businessAddress,
      businessPhone,
      currency,
      dateFormat,
      timeFormat,
      language,
      uiFontScale,
      dailySummaryEnabled,
      dailySummaryEmail,
      dailySummaryTime,
      dailySummaryTimezone,
    } = body;

    // Validate inputs
    const validCurrencies = ["USD", "EUR", "GBP", "NGN", "GHS", "JPY", "CNY"];
    const validDateFormats = [
      "MM/DD/YYYY",
      "DD/MM/YYYY",
      "YYYY-MM-DD",
      "DD MMM YYYY",
    ];
    const validTimeFormats = ["12h", "24h"];
    const validLanguages = ["en", "es", "fr", "de", "zh", "ja"];

    if (currency && !validCurrencies.includes(currency)) {
      return NextResponse.json({ error: "Invalid currency" }, { status: 400 });
    }

    if (dateFormat && !validDateFormats.includes(dateFormat)) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      );
    }

    if (timeFormat && !validTimeFormats.includes(timeFormat)) {
      return NextResponse.json(
        { error: "Invalid time format" },
        { status: 400 }
      );
    }

    if (language && !validLanguages.includes(language)) {
      return NextResponse.json({ error: "Invalid language" }, { status: 400 });
    }

    if (uiFontScale !== undefined) {
      const n = Number(uiFontScale);
      if (
        !Number.isInteger(n) ||
        n < 75 ||
        n > 120
      ) {
        return NextResponse.json(
          { error: "UI font scale must be an integer between 75 and 120 (percent)" },
          { status: 400 }
        );
      }
    }

    const hmRe = /^([01]?\d|2[0-3]):[0-5]\d$/;
    if (dailySummaryTime !== undefined && dailySummaryTime !== null) {
      const t = String(dailySummaryTime).trim();
      if (!hmRe.test(t)) {
        return NextResponse.json(
          { error: "Daily summary time must be 24-hour HH:MM (e.g. 09:00)." },
          { status: 400 }
        );
      }
      if (isMidnightEndWindowTime(t)) {
        return NextResponse.json(
          {
            error:
              "Daily send time cannot be 00:00. The report is from that day's midnight through your send time, so 00:00 would be an empty window. Choose 00:01 or later.",
          },
          { status: 400 }
        );
      }
    }
    if (dailySummaryTimezone !== undefined && dailySummaryTimezone !== null) {
      const z = String(dailySummaryTimezone).trim();
      if (z && !DateTime.now().setZone(z).isValid) {
        return NextResponse.json(
          { error: "Invalid time zone. Use a valid IANA name (e.g. Africa/Accra)." },
          { status: 400 }
        );
      }
    }
    if (dailySummaryEnabled === true) {
      const e = String(dailySummaryEmail ?? "").trim();
      if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
        return NextResponse.json(
          {
            error:
              "A valid email address is required when daily sales summary is turned on.",
          },
          { status: 400 }
        );
      }
    }

    // Session must map to a real user (stale cookies after DB reset would otherwise break the FK)
    const sessionUserId = session.user.id;
    if (!sessionUserId) {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      );
    }
    const editor = await prisma.user.findUnique({
      where: { id: sessionUserId },
      select: { id: true },
    });
    if (!editor) {
      return NextResponse.json(
        {
          error:
            "Your account was not found in the database. Sign out and sign in again.",
        },
        { status: 401 }
      );
    }
    const updatedById = editor.id;

    // Update or create settings
    const settings = await prisma.systemSettings.upsert({
      where: { id: "system" },
      update: {
        ...(companyName !== undefined && { companyName }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(faviconUrl !== undefined && { faviconUrl }),
        ...(businessAddress !== undefined && { businessAddress }),
        ...(businessPhone !== undefined && { businessPhone }),
        ...(currency && { currency }),
        ...(dateFormat && { dateFormat }),
        ...(timeFormat && { timeFormat }),
        ...(language && { language }),
        ...(uiFontScale !== undefined && { uiFontScale: Number(uiFontScale) }),
        ...(dailySummaryEnabled !== undefined && {
          dailySummaryEnabled: Boolean(dailySummaryEnabled),
        }),
        ...(dailySummaryEmail !== undefined && {
          dailySummaryEmail: dailySummaryEmail
            ? String(dailySummaryEmail).trim() || null
            : null,
        }),
        ...(dailySummaryTime !== undefined &&
          dailySummaryTime !== null && {
            dailySummaryTime: String(dailySummaryTime).trim(),
          }),
        ...(dailySummaryTimezone !== undefined &&
          dailySummaryTimezone !== null && {
            dailySummaryTimezone: String(dailySummaryTimezone).trim() || "UTC",
          }),
        updatedById,
      },
      create: {
        id: "system",
        companyName: companyName || "GabyGod Technologies",
        logoUrl: logoUrl || null,
        faviconUrl: faviconUrl || null,
        businessAddress: businessAddress || null,
        businessPhone: businessPhone || null,
        currency: currency || "USD",
        dateFormat: dateFormat || "MM/DD/YYYY",
        timeFormat: timeFormat || "12h",
        language: language || "en",
        uiFontScale: uiFontScale !== undefined ? Number(uiFontScale) : 90,
        dailySummaryEnabled: Boolean(dailySummaryEnabled),
        dailySummaryEmail: dailySummaryEmail
          ? String(dailySummaryEmail).trim() || null
          : null,
        dailySummaryTime: dailySummaryTime
          ? String(dailySummaryTime).trim()
          : "09:00",
        dailySummaryTimezone: dailySummaryTimezone
          ? String(dailySummaryTimezone).trim()
          : "UTC",
        updatedById,
      },
    });

    clearSettingsCache();

    return NextResponse.json(settings, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error updating system settings:", error);
    return NextResponse.json(
      { error: "Failed to update system settings" },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
