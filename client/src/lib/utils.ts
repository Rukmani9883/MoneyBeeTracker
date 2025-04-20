import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, isToday, isYesterday, isThisWeek, isThisMonth } from "date-fns";

/**
 * Merges class names using clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a date for display, using relative terms when applicable
 */
export function formatDateRelative(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isToday(dateObj)) {
    return 'Today';
  } else if (isYesterday(dateObj)) {
    return 'Yesterday';
  } else if (isThisWeek(dateObj)) {
    return format(dateObj, 'EEEE'); // Day name
  } else if (isThisMonth(dateObj)) {
    return format(dateObj, 'MMM d'); // e.g. Apr 15
  } else {
    return format(dateObj, 'MMM d, yyyy'); // e.g. Apr 15, 2023
  }
}

/**
 * Formats currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Calculates percentage
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

/**
 * Generates a random hash color based on string
 */
export function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const colors = [
    'var(--chart-1)',
    'var(--chart-2)',
    'var(--chart-3)',
    'var(--chart-4)',
    'var(--chart-5)',
  ];
  
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Truncates text with ellipsis
 */
export function truncateText(text: string, length: number): string {
  if (!text) return '';
  return text.length <= length ? text : `${text.substring(0, length)}...`;
}

/**
 * Checks if the date is in past, current month, or future
 */
export function getDateStatus(date: Date | string): 'past' | 'current' | 'future' {
  const compareDate = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  if (compareDate < today) {
    return 'past';
  } else if (compareDate >= firstDayOfMonth && compareDate <= lastDayOfMonth) {
    return 'current';
  } else {
    return 'future';
  }
}

/**
 * Gets the current month name and year
 */
export function getCurrentMonthYear(): string {
  return format(new Date(), 'MMMM yyyy');
}

/**
 * Gets month name from number (0-11)
 */
export function getMonthName(monthIndex: number): string {
  return format(new Date(2000, monthIndex, 1), 'MMMM');
}
