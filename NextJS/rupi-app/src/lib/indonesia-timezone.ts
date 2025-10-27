/**
 * Utility functions for handling Indonesia timezone (Asia/Jakarta)
 * Indonesia is UTC+7 (WIB - Western Indonesian Time)
 */

/**
 * Get current date and time in Indonesia timezone
 */
export function getIndonesiaDate(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
}

/**
 * Convert a date to Indonesia timezone
 */
export function toIndonesiaDate(date: Date): Date {
  return new Date(date.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
}

/**
 * Get start of day in Indonesia timezone
 */
export function getIndonesiaStartOfDay(date: Date = new Date()): Date {
  const indonesiaDate = toIndonesiaDate(date);
  return new Date(indonesiaDate.getFullYear(), indonesiaDate.getMonth(), indonesiaDate.getDate());
}

/**
 * Get end of day in Indonesia timezone
 */
export function getIndonesiaEndOfDay(date: Date = new Date()): Date {
  const indonesiaDate = toIndonesiaDate(date);
  const endOfDay = new Date(indonesiaDate.getFullYear(), indonesiaDate.getMonth(), indonesiaDate.getDate(), 23, 59, 59, 999);
  return endOfDay;
}

/**
 * Get start of month in Indonesia timezone
 */
export function getIndonesiaStartOfMonth(date: Date = new Date()): Date {
  const indonesiaDate = toIndonesiaDate(date);
  return new Date(indonesiaDate.getFullYear(), indonesiaDate.getMonth(), 1);
}

/**
 * Get end of month in Indonesia timezone
 */
export function getIndonesiaEndOfMonth(date: Date = new Date()): Date {
  const indonesiaDate = toIndonesiaDate(date);
  return new Date(indonesiaDate.getFullYear(), indonesiaDate.getMonth() + 1, 0, 23, 59, 59, 999);
}

/**
 * Format date as YYYY-MM-DD in Indonesia timezone
 */
export function formatIndonesiaDate(date: Date): string {
  const indonesiaDate = toIndonesiaDate(date);
  const year = indonesiaDate.getFullYear();
  const month = String(indonesiaDate.getMonth() + 1).padStart(2, '0');
  const day = String(indonesiaDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a date string and convert to Indonesia timezone
 */
export function parseIndonesiaDate(dateString: string): Date {
  const date = new Date(dateString);
  return toIndonesiaDate(date);
}

/**
 * Check if a date is within Indonesia timezone range
 */
export function isWithinIndonesiaRange(date: Date, startDate: Date, endDate: Date): boolean {
  const indonesiaDate = toIndonesiaDate(date);
  const indonesiaStart = toIndonesiaDate(startDate);
  const indonesiaEnd = toIndonesiaDate(endDate);
  
  return indonesiaDate >= indonesiaStart && indonesiaDate <= indonesiaEnd;
}

/**
 * Get date range for current month in Indonesia timezone
 */
export function getIndonesiaCurrentMonthRange(): { startDate: Date; endDate: Date } {
  const now = getIndonesiaDate();
  const startDate = getIndonesiaStartOfMonth(now);
  const endDate = getIndonesiaEndOfMonth(now);
  return { startDate, endDate };
}

/**
 * Get date range for last month in Indonesia timezone
 */
export function getIndonesiaLastMonthRange(): { startDate: Date; endDate: Date } {
  const now = getIndonesiaDate();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const startDate = getIndonesiaStartOfMonth(lastMonth);
  const endDate = getIndonesiaEndOfMonth(lastMonth);
  return { startDate, endDate };
}

/**
 * Get date range for last N days in Indonesia timezone
 */
export function getIndonesiaLastDaysRange(days: number): { startDate: Date; endDate: Date } {
  const now = getIndonesiaDate();
  const endDate = getIndonesiaEndOfDay(now);
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - (days - 1));
  startDate.setHours(0, 0, 0, 0);
  return { startDate, endDate };
}
