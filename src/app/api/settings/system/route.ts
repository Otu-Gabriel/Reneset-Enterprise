import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Permission } from "@prisma/client";
import { hasPermission } from "@/lib/auth";

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
          currency: "USD",
          dateFormat: "MM/DD/YYYY",
          timeFormat: "12h",
          language: "en",
        },
      });
    }

    return NextResponse.json(settings);
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
    const { currency, dateFormat, timeFormat, language } = body;

    // Validate inputs
    const validCurrencies = ["USD", "EUR", "GBP", "NGN", "JPY", "CNY"];
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

    // Update or create settings
    const settings = await prisma.systemSettings.upsert({
      where: { id: "system" },
      update: {
        ...(currency && { currency }),
        ...(dateFormat && { dateFormat }),
        ...(timeFormat && { timeFormat }),
        ...(language && { language }),
        updatedById: session.user.id,
      },
      create: {
        id: "system",
        currency: currency || "USD",
        dateFormat: dateFormat || "MM/DD/YYYY",
        timeFormat: timeFormat || "12h",
        language: language || "en",
        updatedById: session.user.id,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error updating system settings:", error);
    return NextResponse.json(
      { error: "Failed to update system settings" },
      { status: 500 }
    );
  }
}
