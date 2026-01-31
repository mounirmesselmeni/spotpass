import {
  useCreateClientApiStaffClientsPost,
  useListClientsApiStaffClientsGet,
} from '@/api/generated/staff-clients/staff-clients';
import {
  useCreateReservationApiStaffReservationsPost,
  useListReservationsApiStaffReservationsGet,
} from '@/api/generated/staff-reservations/staff-reservations';
import { ClientBadges } from '@/components';
import { SortableTableHeader } from '@/components/SortableTableHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { NOTIFICATION_ERROR, NOTIFICATION_SUCCESS } from '@/utils/colorConstants';
import { formatDateTimeParts } from '@/utils/dateUtils';
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
import { DatePickerInput, TimeInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useDebouncedValue, useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconEye, IconFilter, IconPlus, IconSearch, IconX } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

export function ReservationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [wizardOpened, { open: openWizard, close: closeWizard }] = useDisclosure(false);

  // Initialize states from URL params
  const [statusFilter, setStatusFilter] = useState<string | null>(
    searchParams.get('status') || null
  );
  const [dateFrom, setDateFrom] = useState<Date | null>(
    searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : null
  );
  const [dateTo, setDateTo] = useState<Date | null>(
    searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : null
  );
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '');
  const [debouncedKeyword] = useDebouncedValue(keyword, 300);

  // Pagination state
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [itemsPerPage, setItemsPerPage] = useState(Number(searchParams.get('pageSize')) || 20);

  // Sorting state
  const [sortBy, setSortBy] = useState<
    'datetime' | 'client_name' | 'guests' | 'status' | 'created_at'
  >((searchParams.get('sortBy') as any) || 'datetime');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(
    (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
  );

  // Client search state for modal
  const [clientSearch, setClientSearch] = useState('');
  const [debouncedClientSearchModal] = useDebouncedValue(clientSearch, 300);
  const [showNewClientForm, setShowNewClientForm] = useState(false);

  // Separate state for selected client to avoid dependency on API results
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedClientName, setSelectedClientName] = useState<string>('');
  const [clientSelectionError, setClientSelectionError] = useState<string>('');

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (dateFrom) params.set('dateFrom', dateFrom.toISOString().split('T')[0]);
    if (dateTo) params.set('dateTo', dateTo.toISOString().split('T')[0]);
    if (keyword) params.set('keyword', keyword);
    if (page !== 1) params.set('page', page.toString());
    if (itemsPerPage !== 20) params.set('pageSize', itemsPerPage.toString());
    if (sortBy !== 'datetime') params.set('sortBy', sortBy);
    if (sortOrder !== 'desc') params.set('sortOrder', sortOrder);

    setSearchParams(params, { replace: true });
  }, [
    statusFilter,
    dateFrom,
    dateTo,
    keyword,
    page,
    itemsPerPage,
    sortBy,
    sortOrder,
    setSearchParams,
  ]);

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
    search: debouncedClientSearchModal || undefined,
  });
  const clientsPaginatedData =
    clientsResponse?.data && 'items' in clientsResponse.data ? clientsResponse.data : null;
  const clients = clientsPaginatedData?.items || [];

  const createClientMutation = useCreateClientApiStaffClientsPost();
  const createReservationMutation = useCreateReservationApiStaffReservationsPost();

  const form = useForm({
    initialValues: {
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

  // Display value is either the selected client name or the current search text
  const displayValue = selectedClientId ? selectedClientName : clientSearch;

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
          </div>
          <Group gap="xs" wrap="wrap">
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => {
                setSelectedClientId('');
                setSelectedClientName('');
                setClientSearch('');
                setClientSelectionError('');
                setShowNewClientForm(false);
                openWizard();
              }}
              aria-label={t('reservations.newReservation')}
            >
              {t('reservations.newReservation')}
            </Button>
          </Group>
        </Group>

        {/* Filters */}
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

        {/* Reservations Table */}
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
                                  {reservation.client && (
                                    <ClientBadges
                                      isVip={reservation.client.is_vip}
                                      isLoyal={reservation.client.is_loyal}
                                      isBlacklisted={reservation.client.is_blacklisted}
                                      size="xs"
                                    />
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
                              {String(t(`reservations.${reservation.status}`, reservation.status))}
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
                                {reservation.client && (
                                  <ClientBadges
                                    isVip={reservation.client.is_vip}
                                    isLoyal={reservation.client.is_loyal}
                                    isBlacklisted={reservation.client.is_blacklisted}
                                    size="xs"
                                  />
                                )}
                              </Group>
                            </Group>

                            <Group gap="xs" wrap="wrap">
                              <Text size="sm" c="dimmed">
                                {t('reservations.date', 'Date')}:
                              </Text>
                              <Text size="sm">
                                {new Date(reservation.reservation_date).toLocaleDateString('fr-FR')}
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
      </Stack>

      {/* New Reservation Modal */}
      <Modal
        opened={wizardOpened}
        onClose={() => {
          form.reset();
          setClientSearch('');
          setSelectedClientId('');
          setSelectedClientName('');
          setClientSelectionError('');
          setShowNewClientForm(false);
          closeWizard();
        }}
        title={t('reservations.newReservation')}
        size="lg"
      >
        <form
          onSubmit={form.onSubmit(async (values) => {
            try {
              // Clear any previous client selection error
              setClientSelectionError('');

              let clientId = selectedClientId;

              // Validate client selection FIRST (before creating new client)
              if (!showNewClientForm && !clientId) {
                const errorMsg = t(
                  'reservations.selectClientRequired',
                  'Veuillez sélectionner un client'
                );
                setClientSelectionError(errorMsg);
                notifications.show({
                  title: t('common.error'),
                  message: errorMsg,
                  color: NOTIFICATION_ERROR,
                });
                return;
              }

              // Create new client if needed
              if (showNewClientForm) {
                const newClientResponse = await createClientMutation.mutateAsync({
                  data: {
                    full_name: values.full_name,
                    phone_number: values.phone_number,
                    email: values.email || undefined,
                    is_vip: false,
                    is_loyal: false,
                    is_blacklisted: false,
                  },
                });
                if ('id' in newClientResponse.data) {
                  clientId = newClientResponse.data.id;
                }
              }

              // Create reservation
              const reservationDate = values.reservation_date
                ? values.reservation_date instanceof Date
                  ? values.reservation_date.toISOString().split('T')[0]
                  : String(values.reservation_date).split('T')[0]
                : '';

              const reservationData = {
                client_id: clientId,
                reservation_date: reservationDate,
                reservation_time: values.reservation_time
                  ? values.reservation_time.length === 5
                    ? `${values.reservation_time}:00`
                    : values.reservation_time
                  : undefined,
                number_of_guests: values.number_of_guests,
                special_request: values.special_request || undefined,
              };

              const createdReservation = await createReservationMutation.mutateAsync({
                data: reservationData,
              });

              notifications.show({
                title: t('common.success'),
                message: t('reservations.createdSuccessfully'),
                color: NOTIFICATION_SUCCESS,
              });

              form.reset();
              setClientSearch('');
              setSelectedClientId('');
              setSelectedClientName('');
              setClientSelectionError('');
              setShowNewClientForm(false);
              closeWizard();
              refetch();

              // Navigate to reservation details
              if (createdReservation?.data && 'id' in createdReservation.data) {
                navigate(`/reservations/${createdReservation.data.id}`);
              }
            } catch (error) {
              notifications.show({
                title: t('common.error'),
                message: t('reservations.createError'),
                color: NOTIFICATION_ERROR,
              });
            }
          })}
        >
          <Stack gap="md">
            {/* Client Selection */}
            <div>
              <Combobox
                store={combobox}
                onOptionSubmit={(val) => {
                  if (val === 'new') {
                    setShowNewClientForm(true);
                    setClientSelectionError(''); // Clear error when switching to new client form
                    combobox.closeDropdown();
                  } else {
                    const selectedClient = clients.find((c) => c.id === val);
                    if (selectedClient) {
                      setSelectedClientId(val);
                      setSelectedClientName(selectedClient.full_name);
                      setClientSearch('');
                      setClientSelectionError(''); // Clear error when client is selected
                    }
                    combobox.closeDropdown();
                  }
                }}
              >
                <Combobox.Target>
                  <TextInput
                    label={t('reservations.client')}
                    placeholder={t('reservations.searchClient')}
                    value={displayValue}
                    error={clientSelectionError}
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      setClientSearch(value);
                      // Clear selection if user modifies the text
                      if (selectedClientId) {
                        setSelectedClientId('');
                        setSelectedClientName('');
                      }
                      setClientSelectionError(''); // Clear error when user types
                      combobox.openDropdown();
                    }}
                    onClick={() => combobox.openDropdown()}
                    onFocus={() => combobox.openDropdown()}
                    onBlur={() => combobox.closeDropdown()}
                    rightSection={
                      displayValue ? (
                        <ActionIcon
                          size="sm"
                          variant="transparent"
                          onClick={() => {
                            setClientSearch('');
                            setSelectedClientId('');
                            setSelectedClientName('');
                          }}
                        >
                          <IconX size={16} />
                        </ActionIcon>
                      ) : (
                        <Combobox.Chevron />
                      )
                    }
                  />
                </Combobox.Target>

                <Combobox.Dropdown>
                  <Combobox.Options>
                    {filteredClients.map((client) => (
                      <Combobox.Option value={client.id} key={client.id}>
                        <Group gap="sm">
                          <Text size="sm">{client.full_name}</Text>
                          <Text size="xs" c="dimmed">
                            {client.phone_number}
                          </Text>
                        </Group>
                      </Combobox.Option>
                    ))}
                    <Combobox.Option value="new">
                      <Group gap="sm">
                        <IconPlus size={16} />
                        <Text size="sm">{t('clients.addNew')}</Text>
                      </Group>
                    </Combobox.Option>
                  </Combobox.Options>
                </Combobox.Dropdown>
              </Combobox>
              {selectedClientId && !showNewClientForm && (
                <Text size="xs" c="dimmed" mt={4}>
                  ✓ {t('reservations.clientSelected', 'Client sélectionné')}: {selectedClientName}
                </Text>
              )}
            </div>

            {/* New Client Form */}
            {showNewClientForm && (
              <Card withBorder>
                <Stack gap="sm">
                  <Text size="sm" fw={500}>
                    {t('clients.addNew')}
                  </Text>
                  <TextInput
                    label={t('clients.name')}
                    placeholder={t('clients.namePlaceholder')}
                    {...form.getInputProps('full_name')}
                  />
                  <TextInput
                    label={t('clients.phone')}
                    placeholder={t('clients.phonePlaceholder')}
                    {...form.getInputProps('phone_number')}
                  />
                  <TextInput
                    label={t('clients.email')}
                    placeholder={t('clients.emailPlaceholder')}
                    {...form.getInputProps('email')}
                  />
                </Stack>
              </Card>
            )}

            {/* Date and Time */}
            <Grid>
              <Grid.Col span={6}>
                <DatePickerInput
                  label={t('reservations.date')}
                  placeholder={t('common.selectDate')}
                  {...form.getInputProps('reservation_date')}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <TimeInput
                  label={t('reservations.time')}
                  {...form.getInputProps('reservation_time')}
                  withSeconds={false}
                />
              </Grid.Col>
            </Grid>

            {/* Guests */}
            <NumberInput
              label={t('reservations.guests')}
              min={1}
              {...form.getInputProps('number_of_guests')}
            />

            {/* Special Request */}
            <Textarea
              label={t('reservations.specialRequest')}
              placeholder={t('reservations.specialRequestPlaceholder')}
              {...form.getInputProps('special_request')}
            />

            <Group justify="flex-end" gap="sm">
              <Button
                variant="default"
                onClick={() => {
                  form.reset();
                  setClientSearch('');
                  setSelectedClientId('');
                  setSelectedClientName('');
                  setClientSelectionError('');
                  setShowNewClientForm(false);
                  closeWizard();
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" loading={createReservationMutation.isPending}>
                {t('reservations.createReservation')}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Box>
  );
}
