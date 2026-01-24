import dayjs from 'dayjs';
import 'dayjs/locale/fr';

/**
 * Formats a date string to French locale date format (DD/MM/YYYY)
 * @param dateString - ISO date string or Date object
 * @returns Formatted date string in French format
 */
export function formatDate(dateString: string | Date): string {
  return dayjs(dateString).locale('fr').format('DD/MM/YYYY');
}

/**
 * Formats a date string to French locale time format (HH:mm)
 * @param dateString - ISO date string or Date object
 * @returns Formatted time string in French format
 */
export function formatTime(dateString: string | Date): string {
  return dayjs(dateString).locale('fr').format('HH:mm');
}

/**
 * Formats a date string to French locale datetime format (DD/MM/YYYY à HH:mm)
 * @param dateString - ISO date string or Date object
 * @returns Formatted datetime string in French format
 */
export function formatDateTime(dateString: string | Date): string {
  return dayjs(dateString).locale('fr').format('DD/MM/YYYY à HH:mm');
}

/**
 * Formats a date string for display in two parts: date and time
 * Useful for table cells with separate date and time display
 * @param dateString - ISO date string or Date object
 * @returns Object with date and time formatted strings
 */
export function formatDateTimeParts(dateString: string | Date): {
  date: string;
  time: string;
} {
  const date = dayjs(dateString).locale('fr');
  return {
    date: date.format('DD/MM/YYYY'),
    time: date.format('HH:mm'),
  };
}
