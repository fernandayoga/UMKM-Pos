import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format number to Indonesian Rupiah (Rp X.XXX)
 * Example: 12500 -> "Rp 12.500"
 */
export function formatRupiah(amount: number): string {
  if (isNaN(amount)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount).replace(/\s/g, " ");
}

/**
 * Format ISO date string or Date to Indonesian readable format
 * Example: "16 Sep 2026, 14:30"
 */
export function formatDate(date: string | Date, withTime: boolean = true): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(d);
}

/**
 * Generate unique Invoice Number: INV-YYYYMMDD-XXXX
 * Example: INV-20260916-4821
 */
export function generateInvoiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000); // 4 digits
  return `INV-${year}${month}${day}-${randomSuffix}`;
}
