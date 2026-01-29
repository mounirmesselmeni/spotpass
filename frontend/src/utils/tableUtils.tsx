import { IconBeach, IconDesk, IconHome } from '@tabler/icons-react';
import { ReactElement } from 'react';

/**
 * Get the appropriate icon for a table type
 */
export const getTableTypeIcon = (type: string, size: number = 20): ReactElement => {
  switch (type) {
    case 'parasol':
      return <IconBeach size={size} />;
    case 'hut':
      return <IconHome size={size} />;
    default:
      return <IconDesk size={size} />;
  }
};

/**
 * Get the color for a table type
 */
export const getTableTypeColor = (type: string): string => {
  switch (type) {
    case 'parasol':
      return 'orange';
    case 'hut':
      return 'teal';
    default:
      return 'blue';
  }
};

/**
 * Get the translated label for a table type
 */
export const getTableTypeLabel = (
  type: string,
  t: (key: string, fallback: string) => string
): string => {
  switch (type) {
    case 'parasol':
      return t('tables.typeParasol', 'Parasol');
    case 'hut':
      return t('tables.typeHut', 'Cabane');
    default:
      return t('tables.typeTable', 'Table');
  }
};
