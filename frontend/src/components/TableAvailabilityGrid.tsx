import { useState, useEffect } from 'react';
import {
  Paper,
  Title,
  Group,
  Badge,
  Text,
  Stack,
  Card,
  Grid,
  Select,
  ActionIcon,
  Box,
  Tooltip,
  SimpleGrid,
  Button,
  LoadingOverlay,
} from '@mantine/core';
import { DatePickerInput, TimeInput } from '@mantine/dates';
import { useTranslation } from 'react-i18next';
import { IconTable, IconUsers, IconRefresh, IconMapPin } from '@tabler/icons-react';
import { useGetAvailableTablesApiStaffReservationsAvailableTablesPost } from '@/api/generated/staff-reservations/staff-reservations';
import { useListTablesApiStaffTablesGet } from '@/api/generated/staff-tables/staff-tables';
import type { TableRead } from '@/api/generated/models';

interface TableAvailabilityGridProps {
  onTableSelect?: (table: TableRead) => void;
}

export function TableAvailabilityGrid({ onTableSelect }: TableAvailabilityGridProps) {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState<string>('12:00');
  const [guestsCount, setGuestsCount] = useState<string | number>(2);
  const [viewMode, setViewMode] = useState<'all' | 'available'>('available');

  const reservationDateTime = `${selectedDate}T${selectedTime}:00`;

  const availableTablesMutation = useGetAvailableTablesApiStaffReservationsAvailableTablesPost();
  const { data: allTables, isLoading: loadingAll } = useListTablesApiStaffTablesGet();

  const loadingAvailable = availableTablesMutation.isPending;
  const availableTables = availableTablesMutation.data;

  // Auto-load on mount and when filters change
  const refetchAvailable = () => {
    availableTablesMutation.mutate({
      data: {
        reservation_date: selectedDate,
        reservation_time: reservationDateTime,
        number_of_guests: Number(guestsCount),
      },
    });
  };

  // Auto-fetch on mount or when filters change
  useEffect(() => {
    if (viewMode === 'available') {
      refetchAvailable();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedTime, guestsCount, viewMode]);

  const isLoading = viewMode === 'available' ? loadingAvailable : loadingAll;
  const tables = viewMode === 'available' ? availableTables : allTables;

  // Group tables by zone
  const tablesByZone = new Map<string, TableRead[]>();
  if (Array.isArray(tables)) {
    (tables as any[]).forEach((table: any) => {
      // API returns zone_name as a string or zone as an object
      const zoneName = table.zone_name || table.zone?.name || t('tables.noZone');
      if (!tablesByZone.has(zoneName)) {
        tablesByZone.set(zoneName, []);
      }
      tablesByZone.get(zoneName)!.push(table);
    });
  }

  const getTableStatusColor = (table: any) => {
    // Check is_available first, then is_currently_available from API
    if (table.is_available === false || table.is_currently_available === false) return 'gray';

    // If viewing available tables, they're all green
    if (viewMode === 'available') return 'green';

    // For "all" view, check is_currently_available from API
    return table.is_currently_available ? 'green' : 'red';
  };

  const getTableStatusLabel = (table: any) => {
    if (table.is_available === false || table.is_currently_available === false) {
      return t('tables.unavailable');
    }

    if (viewMode === 'available') return t('tables.available');

    return table.is_currently_available ? t('tables.available') : t('tables.occupied');
  };

  const handleRefresh = () => {
    refetchAvailable();
  };

  return (
    <Stack gap="md">
      {/* Filters Section */}
      <Paper p="md" withBorder>
        <Stack gap="md">
          <Group justify="space-between">
            <Title order={4}>Disponibilité des tables</Title>
            <Group gap="xs">
              <Button
                variant={viewMode === 'available' ? 'filled' : 'light'}
                size="xs"
                onClick={() => setViewMode('available')}
              >
                Disponibles
              </Button>
              <Button
                variant={viewMode === 'all' ? 'filled' : 'light'}
                size="xs"
                onClick={() => setViewMode('all')}
              >
                Toutes
              </Button>
              <ActionIcon
                variant="light"
                onClick={handleRefresh}
                loading={loadingAvailable}
                aria-label="Actualiser la disponibilité des tables"
              >
                <IconRefresh size={16} />
              </ActionIcon>
            </Group>
          </Group>

          <Grid>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <DatePickerInput
                label={t('reservations.date')}
                placeholder={t('common.selectDate')}
                value={selectedDate}
                onChange={(date) => date && setSelectedDate(date)}
                minDate={new Date()}
                size="sm"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <TimeInput
                label={t('reservations.time')}
                value={selectedTime}
                onChange={(event) => setSelectedTime(event.currentTarget.value)}
                size="sm"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <Select
                label={t('reservations.guests')}
                placeholder="Nombre de convives"
                data={Array.from({ length: 20 }, (_, i) => ({
                  value: String(i + 1),
                  label: `${i + 1} ${i + 1 === 1 ? 'convive' : 'convives'}`,
                }))}
                value={String(guestsCount)}
                onChange={(value) => value && setGuestsCount(value)}
                size="sm"
              />
            </Grid.Col>
          </Grid>

          <Group gap="lg">
            <Group gap="xs">
              <Box
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: 'var(--mantine-color-green-6)',
                }}
              />
              <Text size="xs">{t('tables.available')}</Text>
            </Group>
            <Group gap="xs">
              <Box
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: 'var(--mantine-color-red-6)',
                }}
              />
              <Text size="xs">{t('tables.occupied')}</Text>
            </Group>
            <Group gap="xs">
              <Box
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: 'var(--mantine-color-gray-6)',
                }}
              />
              <Text size="xs">{t('tables.unavailable')}</Text>
            </Group>
          </Group>
        </Stack>
      </Paper>

      {/* Tables Grid by Zone */}
      <Box pos="relative">
        <LoadingOverlay visible={isLoading} />

        {tables && tables.length === 0 ? (
          <Paper p="xl" withBorder>
            <Text ta="center" c="dimmed">
              {viewMode === 'available' ? t('tables.noAvailable') : t('tables.noTables')}
            </Text>
          </Paper>
        ) : (
          <Stack gap="xl">
            {Array.from(tablesByZone.entries()).map(([zoneName, zoneTables]) => (
              <Paper key={zoneName} p="md" withBorder>
                <Stack gap="md">
                  <Group gap="xs">
                    <IconMapPin size={20} />
                    <Title order={5}>{zoneName}</Title>
                    <Badge variant="light" size="sm">
                      {zoneTables.length} {zoneTables.length === 1 ? 'table' : 'tables'}
                    </Badge>
                  </Group>

                  <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 6 }} spacing="md">
                    {zoneTables.map((table) => {
                      const statusColor = getTableStatusColor(table);
                      const isAvailable = statusColor === 'green';

                      return (
                        <Tooltip
                          key={table.id}
                          label={
                            <Stack gap={4}>
                              <Text size="xs" fw={500}>
                                {table.name}
                              </Text>
                              <Text size="xs">
                                Capacité: {table.min_capacity}-{table.max_capacity}
                              </Text>
                              <Text size="xs">{getTableStatusLabel(table)}</Text>
                            </Stack>
                          }
                          position="top"
                          withArrow
                        >
                          <Card
                            padding="md"
                            withBorder
                            style={{
                              cursor: isAvailable && onTableSelect ? 'pointer' : 'default',
                              borderColor:
                                statusColor === 'green'
                                  ? 'var(--mantine-color-green-6)'
                                  : statusColor === 'red'
                                    ? 'var(--mantine-color-red-6)'
                                    : 'var(--mantine-color-gray-4)',
                              borderWidth: 2,
                              opacity: statusColor === 'gray' ? 0.5 : 1,
                              transition: 'all 0.2s',
                            }}
                            onClick={() => isAvailable && onTableSelect?.(table)}
                            onMouseEnter={(e) => {
                              if (isAvailable) {
                                e.currentTarget.style.transform = 'scale(1.05)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                          >
                            <Stack gap="xs" align="center">
                              <IconTable
                                size={32}
                                color={
                                  statusColor === 'green'
                                    ? 'var(--mantine-color-green-6)'
                                    : statusColor === 'red'
                                      ? 'var(--mantine-color-red-6)'
                                      : 'var(--mantine-color-gray-6)'
                                }
                              />
                              <Text size="sm" fw={600} ta="center">
                                {table.name}
                              </Text>
                              <Group gap={4} justify="center">
                                <IconUsers size={14} />
                                <Text size="xs" c="dimmed">
                                  {table.min_capacity}-{table.max_capacity}
                                </Text>
                              </Group>
                              <Badge color={statusColor} variant="light" size="xs" fullWidth>
                                {getTableStatusLabel(table)}
                              </Badge>
                            </Stack>
                          </Card>
                        </Tooltip>
                      );
                    })}
                  </SimpleGrid>
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </Box>
    </Stack>
  );
}
