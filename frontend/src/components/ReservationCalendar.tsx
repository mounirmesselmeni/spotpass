import { useState, useEffect, useMemo } from 'react';
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
import { IconChevronLeft, IconChevronRight, IconFilter, IconX } from '@tabler/icons-react';
import { useListReservationsApiStaffReservationsGet } from '@/api/generated/staff-reservations/staff-reservations';
import type { ReservationRead } from '@/api/generated/models';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuthStore } from '@/stores/auth.store';

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
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [allReservations, setAllReservations] = useState<ReservationRead[]>([]);
  const [isFetchingAll, setIsFetchingAll] = useState(false);

  // Calculate date range for current month view (±1 month for better UX)
  const firstDay = useMemo(
    () => new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1),
    [calendarMonth]
  );
  const lastDay = useMemo(
    () => new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 2, 0),
    [calendarMonth]
  );

  // Create stable date strings for useEffect dependencies
  const dateFrom = useMemo(() => firstDay.toISOString().split('T')[0], [firstDay]);
  const dateTo = useMemo(() => lastDay.toISOString().split('T')[0], [lastDay]);

  // Fetch first page to know total count
  const { data: reservationsResponse, isLoading } = useListReservationsApiStaffReservationsGet({
    status_filter: statusFilter === 'all' || statusFilter === null ? undefined : statusFilter,
    date_from: dateFrom,
    date_to: dateTo,
    page: 1,
    page_size: 100,
  });

  const paginatedData =
    reservationsResponse?.data && 'items' in reservationsResponse.data
      ? reservationsResponse.data
      : null;

  // Fetch all pages if there are more than 100 reservations
  useEffect(() => {
    const fetchAllReservations = async () => {
      if (!paginatedData) {
        setAllReservations([]);
        return;
      }

      const firstPageItems = paginatedData.items;
      let nextUrl = paginatedData.next;

      // If no next page, use what we have
      if (!nextUrl) {
        setAllReservations(firstPageItems);
        return;
      }

      // Need to fetch additional pages using next URLs
      setIsFetchingAll(true);
      const allItems = [...firstPageItems];

      try {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
        const token = useAuthStore.getState().accessToken;

        if (!token) {
          console.error('No access token available');
          setAllReservations(firstPageItems);
          return;
        }

        // Follow next links until no more pages
        while (nextUrl) {
          const response: Response = await fetch(`${baseUrl}${nextUrl}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!response.ok) break;

          const result: any = await response.json();
          if (result.items) {
            allItems.push(...result.items);
          }
          nextUrl = result.next; // Get next page URL
        }

        setAllReservations(allItems);
      } catch (error) {
        console.error('Error fetching all reservations:', error);
        setAllReservations(firstPageItems); // Fallback to first page
      } finally {
        setIsFetchingAll(false);
      }
    };

    fetchAllReservations();
  }, [paginatedData?.total_pages, paginatedData?.page, dateFrom, dateTo, statusFilter]);

  const reservations = allReservations;

  // Group reservations by date
  // API returns reservation_date as a separate field (YYYY-MM-DD)
  const reservationsByDate = new Map<string, ReservationRead[]>();
  if (Array.isArray(reservations)) {
    reservations.forEach((reservation: ReservationRead) => {
      if (!reservation.reservation_date) return;

      const dateStr = reservation.reservation_date;
      if (!reservationsByDate.has(dateStr)) {
        reservationsByDate.set(dateStr, []);
      }
      reservationsByDate.get(dateStr)!.push(reservation);
    });
  }

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

  const renderDay = (date: Date | string) => {
    const dateValue = typeof date === 'string' ? new Date(date) : date;
    const dateKey = typeof date === 'string' ? date : date.toISOString().split('T')[0];
    const dayReservations = reservationsByDate.get(dateKey) || [];
    const hasReservations = dayReservations.length > 0;

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
          <span>{dateValue.getDate()}</span>
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

  const handlePreviousMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));
  };

  const currentMonthYear = calendarMonth.toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <Grid>
      {/* Calendar View */}
      <Grid.Col span={{ base: 12, md: 5 }}>
        <Paper p="md" withBorder>
          <Stack gap="md">
            <Group justify="space-between">
              <Title order={4}>{t('reservations.calendar')}</Title>
              <Group gap={4}>
                <ActionIcon
                  variant="light"
                  onClick={handlePreviousMonth}
                  aria-label="Mois précédent"
                  size="sm"
                >
                  <IconChevronLeft size={16} />
                </ActionIcon>
                <Text fw={500} size="sm" style={{ minWidth: 140, textAlign: 'center' }}>
                  {currentMonthYear}
                </Text>
                <ActionIcon
                  variant="light"
                  onClick={handleNextMonth}
                  aria-label="Mois suivant"
                  size="sm"
                >
                  <IconChevronRight size={16} />
                </ActionIcon>
              </Group>
            </Group>
            <Calendar
              defaultDate={selectedDate ? new Date(selectedDate) : undefined}
              getDayProps={(date: Date | string) => {
                const dateKey = typeof date === 'string' ? date : date.toISOString().split('T')[0];
                return {
                  onClick: () => setSelectedDate(dateKey),
                  selected: selectedDate === dateKey,
                };
              }}
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
                  {t('reservations.reservationsOf')}{' '}
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
                  placeholder="Nb. invités"
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
            {isLoading || isFetchingAll ? (
              <Text ta="center" c="dimmed">
                {t('common.loading')}
                {isFetchingAll && ' (chargement de toutes les pages...)'}
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
                        <StatusBadge status={reservation.status} size="sm">
                          {getStatusLabel(reservation.status)}
                        </StatusBadge>
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
