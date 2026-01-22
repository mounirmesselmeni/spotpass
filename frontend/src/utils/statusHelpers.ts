/**
 * Utility functions for reservation status handling
 */

import type { MantineColor } from '@mantine/core';

export type ReservationStatus = 'pending' | 'accepted' | 'refused' | 'canceled';

/**
 * Get the appropriate color for a reservation status badge
 * @param status - The reservation status
 * @returns The Mantine color to use for the badge
 */
export function getReservationStatusColor(status: string): MantineColor {
  switch (status) {
    case 'pending':
      return 'yellow';
    case 'accepted':
      return 'green';
    case 'refused':
      return 'red';
    case 'canceled':
      return 'gray';
    default:
      return 'blue';
  }
}

/**
 * Get the background color style for a status badge (direct hex values)
 * Used as fallback when Mantine color resolution doesn't work
 */
export function getReservationStatusBgColor(status: string): string {
  switch (status) {
    case 'pending':
      return '#EAB308'; // yellow.6
    case 'accepted':
      return '#22C55E'; // green.6
    case 'refused':
      return '#EF4444'; // red.6
    case 'canceled':
      return '#64748B'; // gray.6
    default:
      return '#0052FF'; // blue.6
  }
}

/**
 * Get the variant for status badges (filled for better visibility)
 */
export const STATUS_BADGE_VARIANT = 'filled' as const;
