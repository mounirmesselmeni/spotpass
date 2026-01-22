import { Table, UnstyledButton, Group, Text, Center } from '@mantine/core';
import { IconChevronUp, IconChevronDown, IconSelector } from '@tabler/icons-react';

interface SortableTableHeaderProps<T extends string = string> {
  label: string;
  sortKey: T;
  currentSortBy: string;
  currentSortOrder: 'asc' | 'desc';
  onSort: (sortKey: T) => void;
}

export function SortableTableHeader<T extends string = string>({
  label,
  sortKey,
  currentSortBy,
  currentSortOrder,
  onSort,
}: SortableTableHeaderProps<T>) {
  const isActive = currentSortBy === sortKey;

  const Icon = isActive
    ? currentSortOrder === 'asc'
      ? IconChevronUp
      : IconChevronDown
    : IconSelector;

  return (
    <Table.Th>
      <UnstyledButton onClick={() => onSort(sortKey)}>
        <Group gap={4} wrap="nowrap">
          <Text fw={600} size="sm">
            {label}
          </Text>
          <Center>
            <Icon size={14} stroke={1.5} />
          </Center>
        </Group>
      </UnstyledButton>
    </Table.Th>
  );
}
