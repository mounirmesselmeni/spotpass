import { useUpdateReservationApiStaffReservationsReservationIdPatch } from '@/api/generated/staff-reservations/staff-reservations';
import { axios } from '@/api/mutator/custom-instance';
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Center,
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
import { formatDate } from '@/utils/dateUtils';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { StatusBadge } from '@/components/StatusBadge';

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
      const reservation = reservationDetails.reservation;
      const reservationTime = reservation.reservation_time || '19:00';
      const reservationDate = reservation.reservation_date;

      const response = await axios.post('/api/staff/reservations/available-tables', {
        reservation_date: reservationDate,
        reservation_time: reservationTime,
        number_of_guests: reservation.number_of_guests,
        duration_minutes: reservation.duration_minutes || 120,
      });

      setAvailableTables(response.data);

      if (response.data.length > 0) {
        setSelectedTableId(response.data[0].id);
      }
    } catch (error) {
      notifications.show({
        title: t('common.error'),
        message: t('reservations.errorLoadingTables'),
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
        message: t('reservations.selectTableError'),
        color: 'red',
      });
      return;
    }

    updateMutation.mutate(
      {
        reservationId: id!,
        data: {
          status: 'accepted',
          table_id: selectedTableId,
          duration_minutes: duration,
          note: note || undefined,
        },
      },
      {
        onSuccess: () => {
          notifications.show({
            title: t('common.success'),
            message: t('reservations.acceptedSuccessfully'),
            color: 'green',
          });
          queryClient.invalidateQueries({ queryKey: ['reservations'] });
          fetchDetails();
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
  };

  const handleReject = () => {
    let rejectNote = '';
    modals.open({
      title: t('reservations.reject', 'Reject'),
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

  const getDurationOptions = () => {
    const options = [];
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
            <Title order={2}>{t('reservations.reservation', 'Réservation')}</Title>
          </Group>
          <StatusBadge status={reservation.status} size="lg">
            {String(t(`reservations.${reservation.status}`, reservation.status))}
          </StatusBadge>
        </Group>

        {/* Main Content - Horizontal Layout */}
        <Group align="flex-start" gap="md">
          {/* Reservation Information */}
          <Card withBorder style={{ flex: 1 }}>
            <Stack gap="sm">
              <Text fw={700}>
                {t('reservations.reservationInfo', 'Informations de la réservation')}
              </Text>

              <Text size="sm">
                <Text component="span" fw={600}>
                  {t('reservations.date', 'Date')}:{' '}
                </Text>
                {new Date(reservation.reservation_date).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>

              <Text size="sm">
                <Text component="span" fw={600}>
                  {t('reservations.time', 'Heure')}:{' '}
                </Text>
                {reservation.reservation_time || '-'}
              </Text>

              <Text size="sm">
                <Text component="span" fw={600}>
                  {t('reservations.guests', 'Invités')}:{' '}
                </Text>
                {reservation.number_of_guests}
              </Text>

              {reservation.duration_minutes && (
                <Text size="sm">
                  <Text component="span" fw={600}>
                    {t('reservations.duration', 'Durée')}:{' '}
                  </Text>
                  {Math.floor((reservation.duration_minutes || 120) / 60)}h{' '}
                  {(reservation.duration_minutes || 120) % 60 > 0
                    ? `${(reservation.duration_minutes || 120) % 60}min`
                    : ''}
                </Text>
              )}

              {table && (
                <Text size="sm">
                  <Text component="span" fw={600}>
                    {t('reservations.table', 'Table')}:{' '}
                  </Text>
                  {table.name}
                </Text>
              )}

              {reservation.created_at && (
                <Text size="sm">
                  <Text component="span" fw={600}>
                    {t('reservations.createdAt', 'Effectuée le')}:{' '}
                  </Text>
                  {new Date(reservation.created_at).toLocaleString('fr-FR')}
                </Text>
              )}

              {reservation.special_request && (
                <>
                  <Text size="sm" fw={600} mt="xs">
                    {t('reservations.specialRequest', 'Demande spéciale')}:
                  </Text>
                  <Paper p="sm" withBorder bg="gray.0">
                    <Text size="sm">{reservation.special_request}</Text>
                  </Paper>
                </>
              )}

              {reservation.note && (
                <>
                  <Text size="sm" fw={600} mt="xs">
                    {t('reservations.note', 'Note')}:
                  </Text>
                  <Paper p="sm" withBorder bg="gray.0">
                    <Text size="sm">{reservation.note}</Text>
                  </Paper>
                </>
              )}
            </Stack>
          </Card>

          {/* Client Information */}
          <Card withBorder style={{ flex: 1 }}>
            <Stack gap="sm">
              <Text fw={700}>{t('clients.clientInfo', 'Informations du client')}</Text>

              <Text size="sm">
                <Text component="span" fw={600}>
                  {t('clients.name', 'Nom')}:{' '}
                </Text>
                {client.full_name}
              </Text>

              <Text size="sm">
                <Text component="span" fw={600}>
                  {t('clients.phone', 'Téléphone')}:{' '}
                </Text>
                {client.phone_number}
              </Text>

              {client.email && (
                <Text size="sm">
                  <Text component="span" fw={600}>
                    {t('clients.email', 'Email')}:{' '}
                  </Text>
                  {client.email}
                </Text>
              )}

              <Group gap="xs" mt="xs">
                <Badge color="green" size="sm">
                  {client.total_accepted} acceptées
                </Badge>
                <Badge color="gray" size="sm">
                  {client.total_canceled} annulées
                </Badge>
                <Badge color="red" size="sm">
                  {client.total_refused} refusées
                </Badge>
              </Group>

              {client.last_reservation_date && (
                <Text size="sm">
                  <Text component="span" fw={600}>
                    {t('clients.lastReservation', 'Dernière réservation')}:{' '}
                  </Text>
                  {formatDate(client.last_reservation_date)}
                </Text>
              )}
            </Stack>
          </Card>
        </Group>

        {/* Actions Section */}
        {isPending && (
          <Card withBorder>
            <Stack gap="md">
              <Alert icon={<IconAlertCircle size={16} />} color="yellow">
                {t(
                  'reservations.pendingAction',
                  "Cette réservation est en attente. Veuillez l'accepter ou la refuser."
                )}
              </Alert>

              <Text fw={700}>{t('reservations.acceptReservation', 'Accepter la réservation')}</Text>

              <Select
                label={t('reservations.expectedDuration', 'Durée prévue')}
                data={getDurationOptions()}
                value={duration.toString()}
                onChange={(value) => setDuration(Number(value))}
              />

              <Select
                label={t('reservations.selectTable', 'Sélectionner une table')}
                placeholder={loadingTables ? 'Chargement...' : 'Choisir une table'}
                data={Object.entries(tablesByZone).flatMap(([zone, tables], zoneIndex) => [
                  { value: `__zone_${zoneIndex}__`, label: zone, disabled: true },
                  ...tables.map((t) => ({
                    value: t.id,
                    label: `${t.name} (${t.min_capacity}-${t.max_capacity} pers.)`,
                  })),
                ])}
                value={selectedTableId}
                onChange={(value) => setSelectedTableId(value || '')}
                disabled={loadingTables}
              />

              <Textarea
                label={t('reservations.note', 'Note (facultative)')}
                placeholder={t('reservations.addNote', 'Ajouter une note...')}
                value={note}
                onChange={(e) => setNote(e.currentTarget.value)}
                rows={3}
              />

              <Group>
                <Button
                  leftSection={<IconCheck size={16} />}
                  color="green"
                  onClick={handleAccept}
                  loading={updateMutation.isPending}
                  disabled={!selectedTableId}
                >
                  {t('reservations.accept', 'Accepter')}
                </Button>
                <Button
                  leftSection={<IconX size={16} />}
                  color="red"
                  variant="light"
                  onClick={handleReject}
                  loading={updateMutation.isPending}
                >
                  {t('reservations.reject', 'Refuser')}
                </Button>
              </Group>
            </Stack>
          </Card>
        )}

        {canCancel && !isPending && (
          <Card withBorder>
            <Group justify="space-between">
              <Text fw={600}>{t('reservations.actions', 'Actions')}</Text>
              <Button color="gray" variant="light" onClick={handleCancel}>
                {t('reservations.cancel', 'Annuler la réservation')}
              </Button>
            </Group>
          </Card>
        )}
      </Stack>
    </Box>
  );
}
