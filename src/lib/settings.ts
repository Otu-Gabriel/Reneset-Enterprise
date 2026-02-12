import { prisma } from "@/lib/prisma";

// Cache settings to avoid repeated database queries
let cachedSettings: {
  companyName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  businessAddress: string | null;
  businessPhone: string | null;
  currency: string;
  dateFormat: string;
  timeFormat: string;
  language: string;
} | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60000; // 1 minute cache

export async function getSystemSettings() {
  const now = Date.now();

  // Return cached settings if still valid
  if (cachedSettings && now - cacheTimestamp < CACHE_DURATION) {
    return cachedSettings;
  }

  try {
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

    cachedSettings = {
      companyName: settings.companyName || "GabyGod Technologies",
      logoUrl: settings.logoUrl || null,
      faviconUrl: settings.faviconUrl || null,
      businessAddress: settings.businessAddress || null,
      businessPhone: settings.businessPhone || null,
      currency: settings.currency,
      dateFormat: settings.dateFormat,
      timeFormat: settings.timeFormat,
      language: settings.language,
    };
    cacheTimestamp = now;

    return cachedSettings;
  } catch (error) {
    console.error("Error fetching system settings:", error);
    // Return defaults on error
    return {
      companyName: "GabyGod Technologies",
      logoUrl: null,
      faviconUrl: null,
      businessAddress: null,
      businessPhone: null,
      currency: "USD",
      dateFormat: "MM/DD/YYYY",
      timeFormat: "12h",
      language: "en",
    };
  }
}

export function clearSettingsCache() {
  cachedSettings = null;
  cacheTimestamp = 0;
}
