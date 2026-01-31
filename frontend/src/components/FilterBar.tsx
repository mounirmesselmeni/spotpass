/**
 * FilterBar - Reusable filter component with search, filters, and clear functionality
 *
 * Features:
 * - Responsive layout
 * - Search input with icon
 * - Multiple filter dropdowns
 * - Clear all filters button
 * - Customizable filters
 */

import { Button, Group, Select, Stack, Text, TextInput } from '@mantine/core';
import { IconFilter, IconSearch, IconX } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  placeholder: string;
  options: FilterOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  clearable?: boolean;
}

export interface FilterBarProps {
  // Search
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  showSearch?: boolean;

  // Filters
  filters?: FilterConfig[];

  // Clear functionality
  onClearAll?: () => void;
  hasActiveFilters?: boolean;

  // Layout
  fullWidth?: boolean;
}

export function FilterBar({
  searchValue = '',
  searchPlaceholder = 'Search...',
  onSearchChange,
  showSearch = true,
  filters = [],
  onClearAll,
  hasActiveFilters = false,
  fullWidth = false,
}: FilterBarProps) {
  const { t } = useTranslation();

  return (
    <Stack gap="md">
      {/* Header with title and clear button */}
      <Group justify="space-between" align="center">
        <Group gap="xs">
          <IconFilter size={16} />
          <Text size="sm" fw={600}>
            {t('common.filters', 'Filters')}
          </Text>
        </Group>
        {hasActiveFilters && onClearAll && (
          <Button variant="subtle" size="xs" leftSection={<IconX size={14} />} onClick={onClearAll}>
            {t('common.clearFilters', 'Clear all')}
          </Button>
        )}
      </Group>

      {/* Search Input */}
      {showSearch && onSearchChange && (
        <TextInput
          placeholder={searchPlaceholder}
          leftSection={<IconSearch size={16} />}
          value={searchValue}
          onChange={(e) => onSearchChange(e.currentTarget.value)}
          style={{ flex: fullWidth ? 1 : undefined }}
        />
      )}

      {/* Filter Dropdowns */}
      {filters.length > 0 && (
        <Group gap="md" style={{ flexWrap: 'wrap' }}>
          {filters.map((filter) => (
            <Select
              key={filter.key}
              label={filter.label}
              placeholder={filter.placeholder}
              data={filter.options}
              value={filter.value}
              onChange={filter.onChange}
              clearable={filter.clearable !== false}
              style={{ flex: 1, minWidth: 200 }}
            />
          ))}
        </Group>
      )}
    </Stack>
  );
}
