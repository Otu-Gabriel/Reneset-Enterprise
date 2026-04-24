"use client";

import { useState, useEffect } from "react";

interface SystemSettings {
  companyName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  businessAddress: string | null;
  businessPhone: string | null;
  currency: string;
  dateFormat: string;
  timeFormat: string;
  language: string;
  /** Root font size as % of browser default; scales all `rem` typography */
  uiFontScale: number;
}

function normalizeSystemSettings(data: Record<string, unknown>): SystemSettings {
  const scale = data.uiFontScale;
  return {
    companyName: (data.companyName as string) || "GabyGod Technologies",
    logoUrl: (data.logoUrl as string | null) ?? null,
    faviconUrl: (data.faviconUrl as string | null) ?? null,
    businessAddress: (data.businessAddress as string | null) ?? null,
    businessPhone: (data.businessPhone as string | null) ?? null,
    currency: (data.currency as string) || "USD",
    dateFormat: (data.dateFormat as string) || "MM/DD/YYYY",
    timeFormat: (data.timeFormat as string) || "12h",
    language: (data.language as string) || "en",
    uiFontScale: typeof scale === "number" && Number.isFinite(scale) ? scale : 90,
  };
}

export function useSystemSettings() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/settings/system");
      if (response.ok) {
        const data = await response.json();
        setSettings(normalizeSystemSettings(data));
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<SystemSettings>) => {
    try {
      const response = await fetch("/api/settings/system", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newSettings),
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(normalizeSystemSettings(data));
        return { success: true };
      } else {
        const error = await response.json();
        return { success: false, error: error.error };
      }
    } catch (error) {
      return { success: false, error: "Failed to update settings" };
    }
  };

  return { settings, loading, updateSettings, refresh: fetchSettings };
}
