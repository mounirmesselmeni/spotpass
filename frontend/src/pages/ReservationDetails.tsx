import { useUpdateReservationApiStaffReservationsReservationIdPatch } from '@/api/generated/staff-reservations/staff-reservations';
import { axios } from '@/api/mutator/custom-instance';
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Divider,
  Grid,
  Group,
  Loader,
  Paper,
  Select,
  Stack,
  Text,
  Textarea,
  Title,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import {
  IconAlertCircle,
  IconArrowLeft,
  IconCalendar,
  IconCheck,
  IconClock,
  IconUsers,
  IconX,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

interface ReservationDetails {
  reservation: any;
  client: any;
  table: any;
}

interface AvailableTable {
  id: string;
  name: string;
  min_capacity: number;
  max_capacity: number;
  zone_name: string | null;
  is_currently_available: boolean;
}

export function ReservationDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [details, setDetails] = useState<ReservationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [availableTables, setAvailableTables] = useState<AvailableTable[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);

  // Form state for acceptance
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [duration, setDuration] = useState<number>(120); // Default 2 hours
  const [note, setNote] = useState('');

  const updateMutation = useUpdateReservationApiStaffReservationsReservationIdPatch();

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/staff/reservations/${id}/details`);
      setDetails(response.data);

      // If reservation is pending, auto-fetch available tables
      if (response.data.reservation.status === 'pending') {
        fetchAvailableTables(response.data);
      }
    } catch (error) {
      notifications.show({
        title: t('common.error'),
        message: t('reservations.loadDetailsError'),
        color: 'red',
      });
      navigate('/reservations');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableTables = async (reservationDetails: ReservationDetails) => {
    setLoadingTables(true);
    try {
      // Ensure reservation_time is in proper HH:MM format
      let reservationTime = '12:00'; // default
      if (reservationDetails.reservation.reservation_time) {
        const timeStr = reservationDetails.reservation.reservation_time.toString();
        // Handle various time formats
        if (timeStr.includes('T')) {
          // Extract time from datetime string like '2026-01-20T12'
          const timePart = timeStr.split('T')[1];
          if (timePart && timePart.length >= 2) {
            reservationTime = timePart.length === 2 ? `${timePart}:00` : timePart;
          }
        } else if (timeStr.includes(':')) {
          // Already in HH:MM or HH:MM:SS format
          reservationTime = timeStr.split(':').slice(0, 2).join(':');
        } else if (timeStr.length === 2) {
          // Just hours like '12'
          reservationTime = `${timeStr}:00`;
        }
      }

      const response = await axios.post('/api/staff/reservations/available-tables', {
        establishment_id: reservationDetails.reservation.establishment_id,
        reservation_date: reservationDetails.reservation.reservation_date,
        reservation_time: reservationTime,
        number_of_guests: reservationDetails.reservation.number_of_guests,
      });
      setAvailableTables(response.data);
    } catch (error) {
      notifications.show({
        title: t('common.error'),
        message: t('tables.loadAvailableError'),
        color: 'red',
      });
    } finally {
      setLoadingTables(false);
    }
  };

  const handleAccept = () => {
    if (!selectedTableId) {
      notifications.show({
        title: t('common.error'),
        message: t('reservations.selectTableRequired'),
        color: 'red',
      });
      return;
    }

    modals.openConfirmModal({
      title: t('reservations.accept', 'Accept Reservation'),
      children: <Text size="sm">{t('reservations.acceptConfirm', { duration })}</Text>,
      labels: {
        confirm: t('common.confirm'),
        cancel: t('common.cancel'),
      },
      confirmProps: { color: 'green' },
      onConfirm: () => {
        updateMutation.mutate(
          {
            reservationId: id!,
            data: {
              status: 'accepted',
              table_id: selectedTableId,
              note: note || undefined,
              duration_minutes: duration,
            },
          },
          {
            onSuccess: () => {
              notifications.show({
                title: t('common.success'),
                message: t('reservations.acceptedSuccessfully', 'Reservation accepted'),
                color: 'green',
              });
              queryClient.invalidateQueries({ queryKey: ['reservations'] });
              fetchDetails(); // Refresh
            },
            onError: () => {
              notifications.show({
                title: t('common.error'),
                message: t('reservations.acceptError'),
                color: 'red',
              });
            },
          }
        );
      },
    });
  };

  const handleReject = () => {
    let rejectNote = '';
    modals.open({
      title: t('reservations.reject', 'Reject Reservation'),
      children: (
        <Stack>
          <Text size="sm">
            {t('reservations.rejectConfirm', 'Are you sure you want to reject this reservation?')}
          </Text>
          <Textarea
            label={t('reservations.note', 'Note (optional)')}
            placeholder={t('reservations.rejectReason', 'Reason for rejection...')}
            onChange={(e) => (rejectNote = e.currentTarget.value)}
            rows={4}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => modals.closeAll()}>
              {t('common.cancel')}
            </Button>
            <Button
              color="red"
              onClick={() => {
                updateMutation.mutate(
                  {
                    reservationId: id!,
                    data: { status: 'refused', note: rejectNote },
                  },
                  {
                    onSuccess: () => {
                      notifications.show({
                        title: t('common.success'),
                        message: t('reservations.rejectedSuccessfully', 'Reservation rejected'),
                        color: 'orange',
                      });
                      queryClient.invalidateQueries({ queryKey: ['reservations'] });
                      modals.closeAll();
                      fetchDetails();
                    },
                    onError: () => {
                      notifications.show({
                        title: t('common.error'),
                        message: t('reservations.rejectError'),
                        color: 'red',
                      });
                    },
                  }
                );
              }}
              loading={updateMutation.isPending}
            >
              {t('reservations.reject', 'Reject')}
            </Button>
          </Group>
        </Stack>
      ),
    });
  };

  const handleCancel = () => {
    let cancelNote = '';
    modals.open({
      title: t('reservations.cancel', 'Cancel Reservation'),
      children: (
        <Stack>
          <Text size="sm">
            {t('reservations.cancelConfirm', 'Are you sure you want to cancel this reservation?')}
          </Text>
          <Textarea
            label={t('reservations.note', 'Note (optional)')}
            placeholder={t('reservations.cancelReason', 'Reason for cancellation...')}
            onChange={(e) => (cancelNote = e.currentTarget.value)}
            rows={4}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => modals.closeAll()}>
              {t('common.cancel')}
            </Button>
            <Button
              color="gray"
              onClick={() => {
                updateMutation.mutate(
                  {
                    reservationId: id!,
                    data: { status: 'canceled', note: cancelNote },
                  },
                  {
                    onSuccess: () => {
                      notifications.show({
                        title: t('common.success'),
                        message: t('reservations.canceledSuccessfully', 'Reservation canceled'),
                        color: 'gray',
                      });
                      queryClient.invalidateQueries({ queryKey: ['reservations'] });
                      modals.closeAll();
                      fetchDetails();
                    },
                    onError: () => {
                      notifications.show({
                        title: t('common.error'),
                        message: t('reservations.cancelError'),
                        color: 'red',
                      });
                    },
                  }
                );
              }}
              loading={updateMutation.isPending}
            >
              {t('reservations.cancel', 'Cancel')}
            </Button>
          </Group>
        </Stack>
      ),
    });
  };

  const getStatusColor = (status: string) => {
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
  };

  const getDurationOptions = () => {
    const options = [];
    // 30min to 6 hours in 30min increments
    for (let minutes = 30; minutes <= 360; minutes += 30) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      let label = '';
      if (hours > 0) label += `${hours}h`;
      if (mins > 0) label += ` ${mins}min`;
      options.push({ value: minutes.toString(), label: label.trim() });
    }
    return options;
  };

  // Group tables by zone
  const tablesByZone = availableTables.reduce(
    (acc, table) => {
      const zone = table.zone_name || t('tables.noZone', 'No Zone');
      if (!acc[zone]) {
        acc[zone] = [];
      }
      acc[zone].push(table);
      return acc;
    },
    {} as Record<string, AvailableTable[]>
  );

  if (loading) {
    return (
      <Box p="xl">
        <Center h={400}>
          <Loader size="lg" />
        </Center>
      </Box>
    );
  }

  if (!details) {
    return null;
  }

  const { reservation, client, table } = details;
  const isPending = reservation.status === 'pending';
  const canCancel = ['pending', 'accepted'].includes(reservation.status);

  return (
    <Box p={{ base: 'md', sm: 'xl' }}>
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between">
          <Group>
            <Button
              variant="subtle"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate('/reservations')}
            >
              {t('common.back', 'Back')}
            </Button>
            <Title order={2}>
              {t('reservations.details', 'Reservation Details')} - {reservation.reference}
            </Title>
          </Group>
          <Badge size="lg" color={getStatusColor(reservation.status)}>
            {String(t(`reservations.${reservation.status}`, reservation.status))}
          </Badge>
        </Group>

        <Grid>
          {/* Left Column - Reservation & Client Info */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Stack gap="md">
              {/* Reservation Information */}
              <Card withBorder>
                <Stack gap="md">
                  <Text size="lg" fw={700}>
                    {t('reservations.reservationInfo', 'Reservation Information')}
                  </Text>
                  <Divider />

                  <Group>
                    <IconCalendar size={20} />
                    <div>
                      <Text size="sm" c="dimmed">
                        {t('reservations.date', 'Date')}
                      </Text>
                      <Text fw={600}>
                        {new Date(reservation.reservation_date).toLocaleDateString('fr-FR', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </Text>
                    </div>
                  </Group>

                  <Group>
                    <IconClock size={20} />
                    <div>
                      <Text size="sm" c="dimmed">
                        {t('reservations.time', 'Time')}
                      </Text>
                      <Text fw={600}>{reservation.reservation_time || '-'}</Text>
                    </div>
                  </Group>

                  <Group>
                    <IconUsers size={20} />
                    <div>
                      <Text size="sm" c="dimmed">
                        {t('reservations.guests', 'Guests')}
                      </Text>
                      <Badge size="lg">{reservation.number_of_guests}</Badge>
                    </div>
                  </Group>

                  {reservation.duration_minutes && (
                    <Group>
                      <IconClock size={20} />
                      <div>
                        <Text size="sm" c="dimmed">
                          {t('reservations.duration', 'Duration')}
                        </Text>
                        <Text fw={600}>
                          {Math.floor((reservation.duration_minutes || 120) / 60)}h{' '}
                          {(reservation.duration_minutes || 120) % 60 > 0
                            ? `${(reservation.duration_minutes || 120) % 60}min`
                            : ''}
                        </Text>
                      </div>
                    </Group>
                  )}

                  {table && (
                    <>
                      <Divider />
                      <div>
                        <Text size="sm" c="dimmed" mb={4}>
                          {t('reservations.table', 'Table')}
                        </Text>
                        <Badge size="lg" color="blue">
                          {table.name}
                        </Badge>
                      </div>
                    </>
                  )}

                  {reservation.special_request && (
                    <>
                      <Divider />
                      <div>
                        <Text size="sm" c="dimmed" mb={4}>
                          {t('reservations.specialRequest', 'Special Request')}
                        </Text>
                        <Paper p="sm" withBorder>
                          <Text size="sm">{reservation.special_request}</Text>
                        </Paper>
                      </div>
                    </>
                  )}

                  {reservation.note && (
                    <>
                      <Divider />
                      <div>
                        <Text size="sm" c="dimmed" mb={4}>
                          {t('reservations.note', 'Note')}
                        </Text>
                        <Paper p="sm" withBorder>
                          <Text size="sm">{reservation.note}</Text>
                        </Paper>
                      </div>
                    </>
                  )}

                  {reservation.accepted_at && (
                    <>
                      <Divider />
                      <Text size="xs" c="dimmed">
                        {t('reservations.acceptedAt', 'Accepted at')}:{' '}
                        {new Date(reservation.accepted_at).toLocaleString('fr-FR')}
                      </Text>
                    </>
                  )}
                </Stack>
              </Card>

              {/* Client Information */}
              <Card withBorder>
                <Stack gap="md">
                  <Text size="lg" fw={700}>
                    {t('clients.clientInfo', 'Client Information')}
                  </Text>
                  <Divider />

                  <div>
                    <Text size="sm" c="dimmed">
                      {String(t('clients.name', 'Name'))}
                    </Text>
                    <Text fw={600} size="lg">
                      {client.full_name}
                    </Text>
                  </div>

                  <Group grow>
                    <div>
                      <Text size="sm" c="dimmed">
                        {t('clients.phone', 'Phone')}
                      </Text>
                      <Text>{client.phone_number}</Text>
                    </div>
                    {client.email && (
                      <div>
                        <Text size="sm" c="dimmed">
                          {t('clients.email', 'Email')}
                        </Text>
                        <Text>{client.email}</Text>
                      </div>
                    )}
                  </Group>

                  <Divider />

                  <Text size="sm" fw={600}>
                    {t('clients.history', 'Client History')}
                  </Text>

                  <Group grow>
                    <div>
                      <Text size="xs" c="dimmed">
                        {t('clients.totalAccepted', 'Accepted')}
                      </Text>
                      <Badge color="green" size="lg">
                        {client.total_accepted}
                      </Badge>
                    </div>
                    <div>
                      <Text size="xs" c="dimmed">
                        {t('clients.totalCanceled', 'Canceled')}
                      </Text>
                      <Badge color="gray" size="lg">
                        {client.total_canceled}
                      </Badge>
                    </div>
                    <div>
                      <Text size="xs" c="dimmed">
                        {t('clients.totalRefused', 'Refused')}
                      </Text>
                      <Badge color="red" size="lg">
                        {client.total_refused}
                      </Badge>
                    </div>
                  </Group>

                  {client.last_reservation_date && (
                    <div>
                      <Text size="xs" c="dimmed">
                        {t('clients.lastReservation', 'Last reservation')}
                      </Text>
                      <Text size="sm">
                        {new Date(client.last_reservation_date).toLocaleDateString('fr-FR')}
                      </Text>
                    </div>
                  )}
                </Stack>
              </Card>
            </Stack>
          </Grid.Col>

          {/* Right Column - Actions & Table Selection */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Stack gap="md">
              {/* Pending - Accept Section */}
              {isPending && (
                <Card withBorder>
                  <Stack gap="md">
                    <Alert icon={<IconAlertCircle size={16} />} color="yellow">
                      {t(
                        'reservations.pendingAction',
                        'This reservation is pending. Please accept or reject it.'
                      )}
                    </Alert>

                    <Text size="lg" fw={700}>
                      {t('reservations.acceptReservation', 'Accept Reservation')}
                    </Text>
                    <Divider />

                    {/* Duration Selection */}
                    <Select
                      label={t('reservations.expectedDuration', 'Expected Duration')}
                      description={t(
                        'reservations.durationDescription',
                        'How long will the table be occupied?'
                      )}
                      data={getDurationOptions()}
                      value={duration.toString()}
                      onChange={(value) => setDuration(parseInt(value || '120'))}
                      required
                    />

                    {/* Table Selection */}
                    <div>
                      <Text size="sm" fw={600} mb="xs">
                        {t('reservations.selectTable', 'Select Table')}
                      </Text>

                      {loadingTables ? (
                        <Center p="xl">
                          <Loader size="md" />
                        </Center>
                      ) : availableTables.length === 0 ? (
                        <Alert color="red" icon={<IconAlertCircle size={16} />}>
                          {t('tables.noAvailable', 'No available tables for this time slot')}
                        </Alert>
                      ) : (
                        <Stack gap="sm">
                          {Object.entries(tablesByZone).map(([zone, zoneTables]) => (
                            <div key={zone}>
                              <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb={4}>
                                {zone}
                              </Text>
                              <Stack gap="xs">
                                {zoneTables.map((tbl) => (
                                  <Card
                                    key={tbl.id}
                                    withBorder
                                    padding="sm"
                                    style={{
                                      cursor: tbl.is_currently_available
                                        ? 'pointer'
                                        : 'not-allowed',
                                      backgroundColor:
                                        selectedTableId === tbl.id
                                          ? 'var(--mantine-color-blue-light)'
                                          : undefined,
                                      opacity: tbl.is_currently_available ? 1 : 0.6,
                                    }}
                                    onClick={() => {
                                      if (tbl.is_currently_available) {
                                        setSelectedTableId(tbl.id);
                                      }
                                    }}
                                  >
                                    <Group justify="space-between">
                                      <div>
                                        <Text fw={600}>{tbl.name}</Text>
                                        <Text size="xs" c="dimmed">
                                          {tbl.min_capacity}-{tbl.max_capacity}{' '}
                                          {t('reservations.guests', 'guests')}
                                        </Text>
                                      </div>
                                      {!tbl.is_currently_available && (
                                        <Badge color="red" size="sm">
                                          {t('tables.occupied', 'Occupied')}
                                        </Badge>
                                      )}
                                      {selectedTableId === tbl.id && (
                                        <Badge color="blue" size="sm">
                                          {t('common.selected', 'Selected')}
                                        </Badge>
                                      )}
                                    </Group>
                                  </Card>
                                ))}
                              </Stack>
                            </div>
                          ))}
                        </Stack>
                      )}
                    </div>

                    {/* Note */}
                    <Textarea
                      label={t('reservations.note', 'Note (optional)')}
                      placeholder={t('reservations.addNote', 'Add a note...')}
                      value={note}
                      onChange={(e) => setNote(e.currentTarget.value)}
                      rows={3}
                    />

                    {/* Actions */}
                    <Group justify="flex-end" mt="md">
                      <Button
                        color="red"
                        variant="light"
                        leftSection={<IconX size={16} />}
                        onClick={handleReject}
                        loading={updateMutation.isPending}
                      >
                        {t('reservations.reject', 'Reject')}
                      </Button>
                      <Button
                        color="green"
                        leftSection={<IconCheck size={16} />}
                        onClick={handleAccept}
                        loading={updateMutation.isPending}
                        disabled={!selectedTableId}
                      >
                        {t('reservations.accept', 'Accept')}
                      </Button>
                    </Group>
                  </Stack>
                </Card>
              )}

              {/* Cancel Option */}
              {canCancel && !isPending && (
                <Card withBorder>
                  <Stack gap="md">
                    <Text size="lg" fw={700}>
                      {t('reservations.cancelReservation', 'Cancel Reservation')}
                    </Text>
                    <Divider />
                    <Text size="sm" c="dimmed">
                      {t(
                        'reservations.cancelDescription',
                        'Cancel this reservation if the client requested it or if there are issues.'
                      )}
                    </Text>
                    <Button
                      color="gray"
                      variant="light"
                      fullWidth
                      onClick={handleCancel}
                      loading={updateMutation.isPending}
                    >
                      {t('reservations.cancel', 'Cancel Reservation')}
                    </Button>
                  </Stack>
                </Card>
              )}
            </Stack>
          </Grid.Col>
        </Grid>
      </Stack>
    </Box>
  );
}
