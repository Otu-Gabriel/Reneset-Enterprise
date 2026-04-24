import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Permission } from "@prisma/client";
import { hasPermission } from "@/lib/auth";
import { clearSettingsCache } from "@/lib/settings";

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
