import { useState } from 'react';
import {
  Paper,
  Title,
  Group,
  Button,
  Badge,
  Text,
  Stack,
  Card,
  Grid,
  Select,
  NumberInput,
  ActionIcon,
  Box,
  Tooltip,
} from '@mantine/core';
import { Calendar } from '@mantine/dates';
import { useTranslation } from 'react-i18next';
import { IconFilter, IconX } from '@tabler/icons-react';
import { useListReservationsApiStaffReservationsGet } from '@/api/generated/staff-reservations/staff-reservations';
import type { ReservationRead } from '@/api/generated/models';

interface ReservationCalendarProps {
  onReservationClick?: (reservation: ReservationRead) => void;
}

export function ReservationCalendar({ onReservationClick }: ReservationCalendarProps) {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState<string | null>(
    new Date().toISOString().split('T')[0]
  );
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [guestsFilter, setGuestsFilter] = useState<number | string>('');

  const { data: reservations, isLoading } = useListReservationsApiStaffReservationsGet({
    status: statusFilter === 'all' ? undefined : (statusFilter as any),
  });

  // Group reservations by date
  // API returns reservation_date as a separate field (YYYY-MM-DD)
  const reservationsByDate = new Map<string, ReservationRead[]>();
  reservations?.forEach((reservation: ReservationRead) => {
    if (!reservation.reservation_date) return;

    const dateStr = reservation.reservation_date;
    if (!reservationsByDate.has(dateStr)) {
      reservationsByDate.set(dateStr, []);
    }
    reservationsByDate.get(dateStr)!.push(reservation);
  });

  // Get reservations for selected date
  const selectedDateKey = selectedDate;
  const dayReservations = selectedDateKey ? reservationsByDate.get(selectedDateKey) || [] : [];

  // Filter by guests if needed
  const filteredReservations = guestsFilter
    ? dayReservations.filter((r) => r.number_of_guests === Number(guestsFilter))
    : dayReservations;

  // Sort by time (reservation_time is just the time part like "20:00:00")
  const sortedReservations = [...filteredReservations].sort((a, b) => {
    // Compare time strings directly (HH:MM:SS format sorts correctly)
    const timeA = a.reservation_time || '00:00:00';
    const timeB = b.reservation_time || '00:00:00';
    return timeA.localeCompare(timeB);
  });

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'pending':
        return 'orange';
      case 'accepted':
        return 'green';
      case 'refused':
        return 'red';
      case 'canceled':
        return 'gray';
      default:
        return 'blue';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'pending':
        return t('reservations.pending');
      case 'accepted':
        return t('reservations.accepted');
      case 'refused':
        return t('reservations.refused');
      case 'canceled':
        return t('reservations.canceled');
      default:
        return status;
    }
  };

  const renderDay = (date: string) => {
    const dateKey = date;
    const dayReservations = reservationsByDate.get(dateKey) || [];
    const hasReservations = dayReservations.length > 0;
    const dateObj = new Date(date);

    return (
      <Tooltip
        label={hasReservations ? `${dayReservations.length} réservation(s)` : 'Aucune réservation'}
        disabled={!hasReservations}
        withinPortal
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Day number */}
          <span>{dateObj.getDate()}</span>
          {/* Indicator dot for reservations */}
          {hasReservations && (
            <Box
              style={{
                position: 'absolute',
                bottom: 2,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: 'var(--mantine-color-blue-6)',
                zIndex: 1,
              }}
            />
          )}
        </div>
      </Tooltip>
    );
  };

  const clearFilters = () => {
    setStatusFilter(null);
    setGuestsFilter('');
  };

  return (
    <Grid>
      {/* Calendar View */}
      <Grid.Col span={{ base: 12, md: 5 }}>
        <Paper p="md" withBorder>
          <Stack gap="md">
            <Title order={4}>Calendrier</Title>
            <Calendar
              defaultDate={selectedDate ? new Date(selectedDate) : undefined}
              getDayProps={(date: string) => ({
                onClick: () => setSelectedDate(date),
                selected: selectedDate === date,
              })}
              renderDay={renderDay}
              size="md"
              style={{ width: '100%' }}
            />
          </Stack>
        </Paper>
      </Grid.Col>

      {/* Reservations List for Selected Day */}
      <Grid.Col span={{ base: 12, md: 7 }}>
        <Paper p="md" withBorder>
          <Stack gap="md">
            <Group justify="space-between" align="flex-start">
              <div>
                <Title order={4}>
                  Réservations du{' '}
                  {selectedDate
                    ? new Date(selectedDate).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : ''}
                </Title>
                <Text size="sm" c="dimmed" mt={4}>
                  {sortedReservations.length} réservation(s)
                </Text>
              </div>
              <Button variant="light" leftSection={<IconFilter size={16} />} size="xs">
                {t('common.filters')}
              </Button>
            </Group>

            {/* Filters */}
            <Card withBorder bg="gray.0" p="sm">
              <Group gap="sm">
                <Select
                  placeholder="Statut"
                  data={[
                    { value: 'all', label: t('common.all') },
                    { value: 'pending', label: t('reservations.pending') },
                    { value: 'accepted', label: t('reservations.accepted') },
                    { value: 'refused', label: t('reservations.refused') },
                    { value: 'canceled', label: t('reservations.canceled') },
                  ]}
                  value={statusFilter}
                  onChange={setStatusFilter}
                  clearable
                  size="xs"
                  style={{ flex: 1 }}
                />
                <NumberInput
                  placeholder="Nb. convives"
                  min={1}
                  value={guestsFilter}
                  onChange={setGuestsFilter}
                  size="xs"
                  style={{ flex: 1 }}
                />
                {(statusFilter || guestsFilter) && (
                  <ActionIcon variant="subtle" color="gray" onClick={clearFilters}>
                    <IconX size={16} />
                  </ActionIcon>
                )}
              </Group>
            </Card>

            {/* Reservations List */}
            {isLoading ? (
              <Text ta="center" c="dimmed">
                {t('common.loading')}
              </Text>
            ) : sortedReservations.length === 0 ? (
              <Paper p="xl" withBorder>
                <Text ta="center" c="dimmed">
                  {t('reservations.noReservations')}
                </Text>
              </Paper>
            ) : (
              <Stack gap="sm" style={{ maxHeight: 500, overflowY: 'auto' }}>
                {sortedReservations.map((reservation) => (
                  <Card
                    key={reservation.id}
                    withBorder
                    padding="md"
                    style={{ cursor: 'pointer' }}
                    onClick={() => onReservationClick?.(reservation)}
                  >
                    <Group justify="space-between" mb="xs">
                      <Group gap="xs">
                        <Text fw={600}>
                          {reservation.reservation_time
                            ? reservation.reservation_time.substring(0, 5)
                            : '--:--'}
                        </Text>
                        <Badge color={getStatusColor(reservation.status)} variant="light" size="sm">
                          {getStatusLabel(reservation.status)}
                        </Badge>
                      </Group>
                      <Badge variant="outline" size="sm">
                        {reservation.number_of_guests} {t('reservations.guests')}
                      </Badge>
                    </Group>
                    <Stack gap={4}>
                      <Text size="sm" fw={500}>
                        {(reservation as any).client?.full_name}
                      </Text>
                      {(reservation as any).table && (
                        <Text size="xs" c="dimmed">
                          {t('reservations.table')}: {(reservation as any).table.name}
                        </Text>
                      )}
                      {reservation.special_request && (
                        <Text size="xs" c="dimmed" lineClamp={1}>
                          {reservation.special_request}
                        </Text>
                      )}
                    </Stack>
                  </Card>
                ))}
              </Stack>
            )}
          </Stack>
        </Paper>
      </Grid.Col>
    </Grid>
  );
}
