/**
 * ClientBadge component for displaying client status (VIP, Loyal, Blacklisted)
 * Supports multiple badges - clients can have any combination of statuses
 * If no flags are set, no badge is displayed
 */

import { Badge, type BadgeProps, Group } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import {
  CLIENT_VIP_BG,
  CLIENT_VIP_TEXT,
  CLIENT_LOYAL_BG,
  CLIENT_LOYAL_TEXT,
  CLIENT_BLACKLISTED_BG,
  CLIENT_BLACKLISTED_TEXT,
} from '@/utils/colorConstants';

interface ClientBadgeProps {
  isVip?: boolean;
  isLoyal?: boolean;
  isBlacklisted?: boolean;
  size?: BadgeProps['size'];
}

/**
 * Renders all applicable badges for a client in a group
 * Shows badges only for active statuses (0 to 3 badges)
 * If no statuses are active, shows nothing
 * @param isVip - Whether the client is VIP
 * @param isLoyal - Whether the client is loyal/regular
 * @param isBlacklisted - Whether the client is blacklisted
 * @param size - Size of the badges
 */
export function ClientBadges({ isVip, isLoyal, isBlacklisted, size = 'sm' }: ClientBadgeProps) {
  const { t } = useTranslation();

  return (
    <Group gap={4} wrap="nowrap">
      {isVip && (
        <Badge
          variant="filled"
          style={{
            backgroundColor: CLIENT_VIP_BG,
            color: CLIENT_VIP_TEXT,
          }}
          size={size}
        >
          {t('clients.vip', 'VIP')}
        </Badge>
      )}
      {isLoyal && (
        <Badge
          variant="filled"
          style={{
            backgroundColor: CLIENT_LOYAL_BG,
            color: CLIENT_LOYAL_TEXT,
          }}
          size={size}
        >
          {t('clients.loyal', 'Loyal')}
        </Badge>
      )}
      {isBlacklisted && (
        <Badge
          variant="filled"
          style={{
            backgroundColor: CLIENT_BLACKLISTED_BG,
            color: CLIENT_BLACKLISTED_TEXT,
          }}
          size={size}
        >
          {t('clients.blacklisted', 'Blacklisted')}
        </Badge>
      )}
    </Group>
  );
}

// For backwards compatibility - export as both ClientBadge and ClientBadges
export const ClientBadge = ClientBadges;
