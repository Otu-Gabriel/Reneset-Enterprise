import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format currency with optional currency code (defaults to USD)
export function formatCurrency(
  amount: number,
  currency: string = "USD"
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(amount);
}

// Format date with optional format (defaults to US format)
export function formatDate(
  date: Date | string,
  dateFormat: string = "MM/DD/YYYY",
  timeFormat: string = "12h"
): string {
  const dateObj = new Date(date);

  // Handle different date formats
  let options: Intl.DateTimeFormatOptions = {};

  switch (dateFormat) {
    case "DD/MM/YYYY":
      options = { day: "2-digit", month: "2-digit", year: "numeric" };
      break;
    case "YYYY-MM-DD":
      options = { year: "numeric", month: "2-digit", day: "2-digit" };
      break;
    case "DD MMM YYYY":
      options = { day: "numeric", month: "short", year: "numeric" };
      break;
    case "MM/DD/YYYY":
    default:
      options = { month: "short", day: "numeric", year: "numeric" };
      break;
  }

  return new Intl.DateTimeFormat("en-US", options).format(dateObj);
}

// Format date and time together
export function formatDateTime(
  date: Date | string,
  dateFormat: string = "MM/DD/YYYY",
  timeFormat: string = "12h"
): string {
  const dateObj = new Date(date);

  let dateOptions: Intl.DateTimeFormatOptions = {};
  let timeOptions: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    hour12: timeFormat === "12h",
  };

  switch (dateFormat) {
    case "DD/MM/YYYY":
      dateOptions = { day: "2-digit", month: "2-digit", year: "numeric" };
      break;
    case "YYYY-MM-DD":
      dateOptions = { year: "numeric", month: "2-digit", day: "2-digit" };
      break;
    case "DD MMM YYYY":
      dateOptions = { day: "numeric", month: "short", year: "numeric" };
      break;
    case "MM/DD/YYYY":
    default:
      dateOptions = { month: "short", day: "numeric", year: "numeric" };
      break;
  }

  const dateStr = new Intl.DateTimeFormat("en-US", dateOptions).format(dateObj);
  const timeStr = new Intl.DateTimeFormat("en-US", timeOptions).format(dateObj);

  return `${dateStr} ${timeStr}`;
}

export function calculatePercentageChange(
  current: number,
  previous: number
): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}
