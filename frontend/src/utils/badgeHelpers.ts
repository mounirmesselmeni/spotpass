/**
 * Badge helper utilities for consistent badge usage across the app
 */

import type { MantineColor } from '@mantine/core';

/**
 * Get badge color for availability status
 */
export function getAvailabilityBadgeColor(isAvailable: boolean): MantineColor {
  return isAvailable ? 'green' : 'red';
}

/**
 * Get badge variant for different contexts
 */
export function getBadgeVariant(
  context: 'status' | 'count' | 'info'
): 'filled' | 'light' | 'outline' {
  switch (context) {
    case 'status':
      return 'filled';
    case 'count':
      return 'light';
    case 'info':
      return 'outline';
    default:
      return 'light';
  }
}

/**
 * Get badge size for different contexts
 */
export function getBadgeSize(
  context: 'large' | 'default' | 'small' | 'tiny'
): 'lg' | 'md' | 'sm' | 'xs' {
  switch (context) {
    case 'large':
      return 'lg';
    case 'default':
      return 'md';
    case 'small':
      return 'sm';
    case 'tiny':
      return 'xs';
    default:
      return 'sm';
  }
}
