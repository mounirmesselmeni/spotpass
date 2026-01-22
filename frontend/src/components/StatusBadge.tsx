/**
 * StatusBadge component for displaying reservation status with proper colors
 */

import { Badge, type BadgeProps } from '@mantine/core';
import { getReservationStatusBgColor } from '@/utils/statusHelpers';

interface StatusBadgeProps extends Omit<BadgeProps, 'color' | 'variant' | 'style'> {
  status: string;
}

/**
 * A specialized Badge component for reservation statuses with guaranteed color rendering
 */
export function StatusBadge({ status, children, ...props }: StatusBadgeProps) {
  const bgColor = getReservationStatusBgColor(status);

  return (
    <Badge
      variant="filled"
      style={{
        background: bgColor,
        color: 'white',
      }}
      {...props}
    >
      {children}
    </Badge>
  );
}
