import {
  useCreateClientApiStaffClientsPost,
  useListClientsApiStaffClientsGet,
} from '@/api/generated/staff-clients/staff-clients';
import {
  useCreateReservationApiStaffReservationsPost,
  useListReservationsApiStaffReservationsGet,
} from '@/api/generated/staff-reservations/staff-reservations';
import { ReservationCalendar } from '@/components/ReservationCalendar';
import { ReservationWizard } from '@/components/ReservationWizard';
import { TableAvailabilityGrid } from '@/components/TableAvailabilityGrid';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Combobox,
  Grid,
  Group,
  Loader,
  LoadingOverlay,
  Modal,
  NumberInput,
  Pagination,
  SegmentedControl,
  Select,
  Skeleton,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  Title,
  Tooltip,
  useCombobox,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useDebouncedValue, useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconEye, IconFilter, IconPlus, IconSearch } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDateTimeParts } from '@/utils/dateUtils';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '@/components/StatusBadge';
import { SortableTableHeader } from '@/components/SortableTableHeader';

export function ReservationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [wizardOpened, { open: openWizard, close: closeWizard }] = useDisclosure(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword] = useDebouncedValue(keyword, 300);

  // Pagination state
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Sorting state
  const [sortBy, setSortBy] = useState<
    'datetime' | 'client_name' | 'guests' | 'status' | 'created_at'
  >('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Client search state
  const [clientSearch, setClientSearch] = useState('');
  const [debouncedClientSearch] = useDebouncedValue(clientSearch, 300);
  const [showNewClientForm, setShowNewClientForm] = useState(false);

  // API hooks with filters
  const {
    data: reservationsResponse,
    isLoading,
    isFetching,
    refetch,
  } = useListReservationsApiStaffReservationsGet(
    {
      status_filter: statusFilter || undefined,
      date_from: dateFrom?.toISOString().split('T')[0] || undefined,
      date_to: dateTo?.toISOString().split('T')[0] || undefined,
      keyword: debouncedKeyword || undefined,
      page: page,
      page_size: itemsPerPage,
      sort_by: sortBy,
      sort_order: sortOrder,
    },
    {
      query: {
        placeholderData: (previousData) => previousData,
      },
    }
  );
  // Access paginated data properly - with type guard
  const paginatedData =
    reservationsResponse?.data && 'items' in reservationsResponse.data
      ? reservationsResponse.data
      : null;
  const reservations = paginatedData?.items || [];
  const totalReservations = paginatedData?.total || 0;
  const currentPage = paginatedData?.page || 1;
  const pageSize = paginatedData?.page_size || 20;
  const totalPages = paginatedData?.total_pages || 0;

  const { data: clientsResponse } = useListClientsApiStaffClientsGet({
    page_size: 100,
    search: debouncedClientSearch || undefined,
  });
  const clientsPaginatedData =
    clientsResponse?.data && 'items' in clientsResponse.data ? clientsResponse.data : null;
  const clients = clientsPaginatedData?.items || [];

  const createClientMutation = useCreateClientApiStaffClientsPost();
  const createReservationMutation = useCreateReservationApiStaffReservationsPost();

  const form = useForm({
    initialValues: {
      client_id: '',
      reservation_date: null as Date | null,
      reservation_time: '',
      number_of_guests: 2,
      special_request: '',
      // New client fields
      full_name: '',
      phone_number: '',
      email: '',
    },
    validate: {
      client_id: (value) =>
        !showNewClientForm && !value
          ? t('reservations.selectClientRequired', 'Veuillez sélectionner un client')
          : null,
      reservation_date: (value) => (!value ? t('reservations.dateRequired', 'Date requise') : null),
      number_of_guests: (value) =>
        value < 1 ? t('reservations.guestsMin', 'Au moins 1 invité') : null,
      full_name: (value) =>
        showNewClientForm && !value ? t('clients.nameRequired', 'Nom requis') : null,
      phone_number: (value) =>
        showNewClientForm && !value ? t('clients.phoneRequired', 'Téléphone requis') : null,
    },
  });

  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const handleSort = (newSortBy: typeof sortBy) => {
    if (sortBy === newSortBy) {
      // Toggle sort order if clicking same column
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort column with appropriate default order
      setSortBy(newSortBy);
      setSortOrder(newSortBy === 'datetime' ? 'desc' : 'asc');
    }
  };

  const filteredClients = clients || [];

  const handleClientSelect = (clientId: string) => {
    if (clientId === 'new') {
      setShowNewClientForm(true);
      combobox.closeDropdown();
    } else {
      form.setFieldValue('client_id', clientId);
      setClientSearch('');
      combobox.closeDropdown();
    }
  };

  const handleCreateClient = async () => {
    if (!form.validateField('full_name').hasError && !form.validateField('phone_number').hasError) {
      try {
        const newClientResponse = await createClientMutation.mutateAsync({
          data: {
            full_name: form.values.full_name,
            phone_number: form.values.phone_number,
            email: form.values.email || undefined,
            is_vip: false,
            is_blacklisted: false,
          },
        });
        if ('id' in newClientResponse.data) {
          form.setFieldValue('client_id', newClientResponse.data.id);
        }
        setShowNewClientForm(false);
        notifications.show({
          title: t('common.success'),
          message: t('clients.createdSuccessfully', 'Client créé'),
          color: 'green',
        });
        // Invalidate client queries to refresh the list
        queryClient.invalidateQueries({ queryKey: ['/api/staff/clients/'] });
      } catch (error) {
        notifications.show({
          title: t('common.error'),
          message: t('clients.createError', 'Erreur lors de la création du client'),
          color: 'red',
        });
      }
    }
  };

  const handleSubmit = async (values: typeof form.values) => {
    try {
      let clientId = values.client_id;

      if (showNewClientForm) {
        const newClientResponse = await createClientMutation.mutateAsync({
          data: {
            full_name: values.full_name,
            phone_number: values.phone_number,
            email: values.email || undefined,
            is_vip: false,
            is_blacklisted: false,
          },
        });
        if ('id' in newClientResponse.data) {
          clientId = newClientResponse.data.id;
        }
        // Invalidate client queries to refresh the list
        queryClient.invalidateQueries({ queryKey: ['/api/staff/clients/'] });
      }

      const createdReservationResponse = await createReservationMutation.mutateAsync({
        data: {
          client_id: clientId,
          reservation_date: values.reservation_date!.toISOString().split('T')[0],
          reservation_time: values.reservation_time ? `${values.reservation_time}:00` : undefined,
          number_of_guests: values.number_of_guests,
          special_request: values.special_request ? values.special_request : undefined,
        },
      });

      notifications.show({
        title: t('common.success'),
        message: t('reservations.createdSuccessfully', 'Réservation créée'),
        color: 'green',
      });
      close();
      form.reset();
      setShowNewClientForm(false);
      refetch();

      if ('id' in createdReservationResponse.data) {
        // Navigate to reservation details
        navigate(`/reservations/${createdReservationResponse.data.id}`);
      }
    } catch (error) {
      notifications.show({
        title: t('common.error'),
        message: t('reservations.createError', 'Erreur lors de la création de la réservation'),
        color: 'red',
      });
    }
  };

  // Import status helpers at the top of the file
  // Use the utility function for consistent status colors

  if (isLoading) {
    return (
      <Box p="xl">
        <Title order={1} mb="xl">
          {t('reservations.title')}
        </Title>
        <Center h={200}>
          <Loader size="lg" />
        </Center>
      </Box>
    );
  }

  return (
    <Box p={{ base: 'md', sm: 'xl' }}>
      <Stack gap="xl">
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <div>
            <Title order={1} mb="xs">
              {t('reservations.title')}
            </Title>
            <Text c="dimmed" size="sm" mb="md"></Text>
            <SegmentedControl
              value={viewMode}
              onChange={(value: any) => setViewMode(value)}
              data={[
                { label: t('common.list'), value: 'list' },
                { label: 'Calendrier', value: 'calendar' },
                { label: 'Tables', value: 'tables' },
              ]}
              aria-label="Mode d'affichage des réservations"
            />
          </div>
          <Group gap="xs" wrap="wrap">
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={openWizard}
              aria-label={t('reservations.newReservation')}
            >
              {t('reservations.newReservation')}
            </Button>
          </Group>
        </Group>

        {/* Filters - Only show for list view */}
        {viewMode === 'list' && (
          <Card withBorder>
            <Group justify="space-between" align="center" mb="md">
              <Text fw={600} size="sm" tt="uppercase" style={{ letterSpacing: '0.1em' }}>
                {t('common.filters', 'Filters')}
              </Text>
              {(statusFilter || dateFrom || dateTo || keyword) && (
                <Button
                  variant="subtle"
                  size="xs"
                  leftSection={<IconFilter size={14} />}
                  onClick={() => {
                    setStatusFilter(null);
                    setDateFrom(null);
                    setDateTo(null);
                    setKeyword('');
                  }}
                >
                  {t('common.clearFilters', 'Clear filters')}
                </Button>
              )}
            </Group>
            <Grid>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Select
                  label={t('reservations.status', 'Status')}
                  placeholder={t('common.all', 'All')}
                  value={statusFilter}
                  onChange={setStatusFilter}
                  clearable
                  data={[
                    { value: 'pending', label: t('reservations.pending', 'Pending') },
                    { value: 'accepted', label: t('reservations.accepted', 'Accepted') },
                    { value: 'refused', label: t('reservations.refused', 'Refused') },
                    { value: 'canceled', label: t('reservations.canceled', 'Canceled') },
                  ]}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <DatePickerInput
                  label={t('common.from', 'From')}
                  placeholder={t('common.selectDate', 'Select date')}
                  value={dateFrom}
                  onChange={(value) => setDateFrom(value as Date | null)}
                  clearable
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <DatePickerInput
                  label={t('common.to', 'To')}
                  placeholder={t('common.selectDate', 'Select date')}
                  value={dateTo}
                  onChange={(value) => setDateTo(value as Date | null)}
                  clearable
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <TextInput
                  label={t('common.search', 'Search')}
                  placeholder={t('reservations.searchPlaceholder', 'Name, email, phone...')}
                  leftSection={<IconSearch size={16} />}
                  value={keyword}
                  onChange={(e) => setKeyword(e.currentTarget.value)}
                />
              </Grid.Col>
            </Grid>
          </Card>
        )}

        {/* Calendar View */}
        {viewMode === 'calendar' && (
          <ReservationCalendar
            onReservationClick={(reservation) => navigate(`/reservations/${reservation.id}`)}
          />
        )}

        {/* Table Availability View */}

        {/* Reservations Table */}
        {viewMode === 'list' && (
          <Card withBorder>
            <Box pos="relative">
              <LoadingOverlay
                visible={isFetching}
                zIndex={1000}
                overlayProps={{ radius: 'sm', blur: 2 }}
              />
              {reservations && reservations.length > 0 ? (
                <>
                  {/* Desktop Table */}
                  <Box visibleFrom="md">
                    <Table striped highlightOnHover>
                      <Table.Thead>
                        <Table.Tr>
                          <SortableTableHeader
                            label={t('reservations.client', 'Client')}
                            sortKey="client_name"
                            currentSortBy={sortBy}
                            currentSortOrder={sortOrder}
                            onSort={handleSort}
                          />
                          <SortableTableHeader
                            label={t('reservations.datetime', 'Date & Time')}
                            sortKey="datetime"
                            currentSortBy={sortBy}
                            currentSortOrder={sortOrder}
                            onSort={handleSort}
                          />
                          <SortableTableHeader
                            label={t('reservations.createdAt', 'Created At')}
                            sortKey="created_at"
                            currentSortBy={sortBy}
                            currentSortOrder={sortOrder}
                            onSort={handleSort}
                          />
                          <SortableTableHeader
                            label={t('reservations.guests', 'Guests')}
                            sortKey="guests"
                            currentSortBy={sortBy}
                            currentSortOrder={sortOrder}
                            onSort={handleSort}
                          />
                          <SortableTableHeader
                            label={t('reservations.status', 'Status')}
                            sortKey="status"
                            currentSortBy={sortBy}
                            currentSortOrder={sortOrder}
                            onSort={handleSort}
                          />
                          <Table.Th>{t('common.actions', 'Actions')}</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {isLoading || isFetching
                          ? // Skeleton rows while loading
                            Array.from({ length: 5 }).map((_, index) => (
                              <Table.Tr key={index}>
                                <Table.Td>
                                  <Skeleton height={20} />
                                </Table.Td>
                                <Table.Td>
                                  <Skeleton height={40} />
                                </Table.Td>
                                <Table.Td>
                                  <Skeleton height={20} width={60} />
                                </Table.Td>
                                <Table.Td>
                                  <Skeleton height={24} width={80} />
                                </Table.Td>
                                <Table.Td>
                                  <Skeleton height={30} width={60} />
                                </Table.Td>
                              </Table.Tr>
                            ))
                          : reservations.map((reservation: any) => (
                              <Table.Tr
                                key={reservation.id}
                                style={{ cursor: 'pointer' }}
                                onClick={() => navigate(`/reservations/${reservation.id}`)}
                              >
                                <Table.Td>
                                  <Group gap="xs" wrap="nowrap">
                                    <Text>{reservation.client?.full_name || 'Unknown'}</Text>
                                    {reservation.client?.is_vip && (
                                      <Badge
                                        style={{
                                          background: '#FFD700',
                                          color: 'white',
                                        }}
                                        size="sm"
                                      >
                                        {t('clients.vip', 'VIP')}
                                      </Badge>
                                    )}
                                    {reservation.client?.is_blacklisted && (
                                      <Badge
                                        style={{
                                          background: 'red',
                                          color: 'white',
                                        }}
                                        size="sm"
                                      >
                                        {t('clients.blacklisted', 'Blacklisté')}
                                      </Badge>
                                    )}
                                  </Group>
                                </Table.Td>
                                <Table.Td>
                                  <div>
                                    <Text size="sm" fw={500}>
                                      {new Date(reservation.reservation_date).toLocaleDateString(
                                        'fr-FR'
                                      )}
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                      {reservation.reservation_time
                                        ? reservation.reservation_time.slice(0, 5)
                                        : '-'}
                                    </Text>
                                  </div>
                                </Table.Td>
                                <Table.Td>
                                  <div>
                                    <Text size="sm">
                                      {formatDateTimeParts(reservation.created_at).date}
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                      {formatDateTimeParts(reservation.created_at).time}
                                    </Text>
                                  </div>
                                </Table.Td>
                                <Table.Td>
                                  <Badge variant="light">{reservation.number_of_guests}</Badge>
                                </Table.Td>
                                <Table.Td>
                                  <StatusBadge status={reservation.status}>
                                    {String(
                                      t(`reservations.${reservation.status}`, reservation.status)
                                    )}
                                  </StatusBadge>
                                </Table.Td>
                                <Table.Td onClick={(e) => e.stopPropagation()}>
                                  <Tooltip label={t('common.details', 'Details')}>
                                    <ActionIcon
                                      variant="light"
                                      onClick={() => navigate(`/reservations/${reservation.id}`)}
                                    >
                                      <IconEye size={18} />
                                    </ActionIcon>
                                  </Tooltip>
                                </Table.Td>
                              </Table.Tr>
                            ))}
                      </Table.Tbody>
                    </Table>
                  </Box>

                  {/* Mobile Card Layout */}
                  <Stack gap="sm" hiddenFrom="md">
                    {isLoading || isFetching
                      ? // Skeleton cards while loading
                        Array.from({ length: 3 }).map((_, index) => (
                          <Card key={index} withBorder padding="sm">
                            <Skeleton height={20} width="70%" mb="xs" />
                            <Skeleton height={16} mb="xs" />
                            <Skeleton height={16} mb="xs" />
                            <Skeleton height={16} width="50%" />
                          </Card>
                        ))
                      : reservations.map((reservation: any) => (
                          <Card
                            key={reservation.id}
                            withBorder
                            padding="sm"
                            style={{ cursor: 'pointer' }}
                            onClick={() => navigate(`/reservations/${reservation.id}`)}
                          >
                            <Group justify="space-between" mb="xs">
                              <Text fw={600}>{reservation.client?.full_name || 'Unknown'}</Text>
                              <StatusBadge status={reservation.status} size="sm">
                                {String(
                                  t(`reservations.${reservation.status}`, reservation.status)
                                )}
                              </StatusBadge>
                            </Group>

                            <Stack gap="xs">
                              <Group gap="xs" wrap="wrap">
                                <Text size="sm" c="dimmed">
                                  {t('reservations.client', 'Client')}:
                                </Text>
                                <Group gap="xs" wrap="nowrap">
                                  <Text size="sm" fw={500}>
                                    {reservation.client?.full_name || 'Unknown'}
                                  </Text>
                                  {reservation.client?.is_vip && (
                                    <Badge color="yellow" size="xs">
                                      {t('clients.vip', 'VIP')}
                                    </Badge>
                                  )}
                                  {reservation.client?.is_blacklisted && (
                                    <Badge color="red" size="xs">
                                      {t('clients.blacklisted', 'Blacklisté')}
                                    </Badge>
                                  )}
                                </Group>
                              </Group>

                              <Group gap="xs" wrap="wrap">
                                <Text size="sm" c="dimmed">
                                  {t('reservations.date', 'Date')}:
                                </Text>
                                <Text size="sm">
                                  {new Date(reservation.reservation_date).toLocaleDateString(
                                    'fr-FR'
                                  )}
                                </Text>
                                <Text size="sm" c="dimmed">
                                  {t('reservations.time', 'Time')}:
                                </Text>
                                <Text size="sm">{reservation.reservation_time || '-'}</Text>
                              </Group>

                              <Group gap="xs" wrap="wrap">
                                <Text size="sm" c="dimmed">
                                  {t('reservations.createdAt', 'Created At')}:
                                </Text>
                                <Text size="sm">
                                  {formatDateTimeParts(reservation.created_at).date}{' '}
                                  {formatDateTimeParts(reservation.created_at).time}
                                </Text>
                              </Group>

                              <Group justify="space-between" align="center">
                                <Group gap="xs">
                                  <Text size="sm" c="dimmed">
                                    {t('reservations.guests', 'Guests')}:
                                  </Text>
                                  <Badge variant="light" size="sm">
                                    {reservation.number_of_guests}
                                  </Badge>
                                </Group>
                                <Tooltip label={t('common.details', 'Details')}>
                                  <ActionIcon
                                    variant="light"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/reservations/${reservation.id}`);
                                    }}
                                  >
                                    <IconEye size={16} />
                                  </ActionIcon>
                                </Tooltip>
                              </Group>
                            </Stack>
                          </Card>
                        ))}
                  </Stack>
                </>
              ) : (
                <Text c="dimmed" ta="center" py="xl">
                  {t('reservations.noReservations', 'No reservations found')}
                </Text>
              )}
            </Box>

            {/* Pagination */}
            {totalPages > 1 && (
              <Group justify="space-between" mt="md" wrap="wrap">
                <Text size="sm" c="dimmed">
                  {t('common.showing', 'Showing')} {(currentPage - 1) * pageSize + 1} -{' '}
                  {Math.min(currentPage * pageSize, totalReservations)} {t('common.of', 'of')}{' '}
                  {totalReservations} {t('reservations.title', 'Reservations')}
                </Text>
                <Pagination total={totalPages} value={page} onChange={setPage} size="sm" />
              </Group>
            )}
          </Card>
        )}
      </Stack>

      {/* Reservation Wizard */}
      <ReservationWizard opened={wizardOpened} onClose={closeWizard} onSuccess={refetch} />
    </Box>
  );
}
