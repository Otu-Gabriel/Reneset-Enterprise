"use client";

import { useSystemSettings } from "./useSystemSettings";
import { formatCurrency as baseFormatCurrency } from "@/lib/utils";

/**
 * Client-side hook for formatting currency using system settings
 * Returns a function that formats amounts with the current system currency
 */
export function useCurrency() {
  const { settings } = useSystemSettings();
  const currency = settings?.currency || "USD";

  return (amount: number) => {
    return baseFormatCurrency(amount, currency);
  };
}

