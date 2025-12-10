import { getSystemSettings } from "./settings";
import {
  formatCurrency as baseFormatCurrency,
  formatDate as baseFormatDate,
  formatDateTime as baseFormatDateTime,
} from "./utils";

// Server-side formatting functions that use system settings
export async function formatCurrencyWithSettings(
  amount: number
): Promise<string> {
  const settings = await getSystemSettings();
  return baseFormatCurrency(amount, settings.currency);
}

export async function formatDateWithSettings(
  date: Date | string
): Promise<string> {
  const settings = await getSystemSettings();
  return baseFormatDate(date, settings.dateFormat, settings.timeFormat);
}

export async function formatDateTimeWithSettings(
  date: Date | string
): Promise<string> {
  const settings = await getSystemSettings();
  return baseFormatDateTime(date, settings.dateFormat, settings.timeFormat);
}
