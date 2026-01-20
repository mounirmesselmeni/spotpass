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
  Modal,
  NumberInput,
  SegmentedControl,
  Select,
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
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconEye, IconFilter, IconPlus, IconSearch } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export function ReservationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [opened, { open, close }] = useDisclosure(false);
  const [wizardOpened, { open: openWizard, close: closeWizard }] = useDisclosure(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'tables'>('list');

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');

  // Client search state
  const [clientSearch, setClientSearch] = useState('');
  const [showNewClientForm, setShowNewClientForm] = useState(false);

  // API hooks with filters
  const {
    data: reservations,
    isLoading,
    refetch,
  } = useListReservationsApiStaffReservationsGet({
    status: statusFilter || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    keyword: keyword || undefined,
  });

  const { data: clients } = useListClientsApiStaffClientsGet();
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
        value < 1 ? t('reservations.guestsMin', 'Au moins 1 convive') : null,
      full_name: (value) =>
        showNewClientForm && !value ? t('clients.nameRequired', 'Nom requis') : null,
      phone_number: (value) =>
        showNewClientForm && !value ? t('clients.phoneRequired', 'Téléphone requis') : null,
    },
  });

  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const filteredClients =
    clients?.filter(
      (client) =>
        client.full_name.toLowerCase().includes(clientSearch.toLowerCase()) ||
        client.phone_number.includes(clientSearch) ||
        client.email?.toLowerCase().includes(clientSearch.toLowerCase())
    ) || [];

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
        const newClient = await createClientMutation.mutateAsync({
          data: {
            full_name: form.values.full_name,
            phone_number: form.values.phone_number,
            email: form.values.email || undefined,
            is_vip: false,
            is_blacklisted: false,
          },
        });
        form.setFieldValue('client_id', newClient.id);
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
        const newClient = await createClientMutation.mutateAsync({
          data: {
            full_name: values.full_name,
            phone_number: values.phone_number,
            email: values.email || undefined,
            is_vip: false,
            is_blacklisted: false,
          },
        });
        clientId = newClient.id;
        // Invalidate client queries to refresh the list
        queryClient.invalidateQueries({ queryKey: ['/api/staff/clients/'] });
      }

      const createdReservation = await createReservationMutation.mutateAsync({
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

      // Navigate to reservation details
      navigate(`/reservations/${createdReservation.id}`);
    } catch (error) {
      notifications.show({
        title: t('common.error'),
        message: t('reservations.createError', 'Erreur lors de la création de la réservation'),
        color: 'red',
      });
    }
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
            <Text c="dimmed" size="sm" mb="md">
              {t('reservations.subtitle', 'Manage and track all restaurant reservations')}
            </Text>
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
              variant="light"
              leftSection={<IconPlus size={16} />}
              onClick={open}
              aria-label={t('reservations.newReservation')}
            >
              {t('reservations.newReservation')}
            </Button>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={openWizard}
              aria-label="Nouvelle réservation avec assistant"
            >
              Nouvelle (Assistant)
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
                  onChange={setDateFrom}
                  clearable
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <DatePickerInput
                  label={t('common.to', 'To')}
                  placeholder={t('common.selectDate', 'Select date')}
                  value={dateTo}
                  onChange={setDateTo}
                  clearable
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <TextInput
                  label={t('common.search', 'Search')}
                  placeholder={t(
                    'reservations.searchPlaceholder',
                    'Name, email, phone, reference...'
                  )}
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
        {viewMode === 'tables' && <TableAvailabilityGrid />}

        {/* Reservations Table */}
        {viewMode === 'list' && (
          <Card withBorder>
            {reservations && reservations.length > 0 ? (
              <>
                {/* Desktop Table */}
                <Box visibleFrom="md">
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>{t('reservations.reference', 'Reference')}</Table.Th>
                        <Table.Th>{t('reservations.client', 'Client')}</Table.Th>
                        <Table.Th>{t('reservations.date', 'Date')}</Table.Th>
                        <Table.Th>{t('reservations.time', 'Time')}</Table.Th>
                        <Table.Th>{t('reservations.guests', 'Guests')}</Table.Th>
                        <Table.Th>{t('reservations.status', 'Status')}</Table.Th>
                        <Table.Th>{t('common.actions', 'Actions')}</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {reservations.map((reservation: any) => (
                        <Table.Tr
                          key={reservation.id}
                          style={{ cursor: 'pointer' }}
                          onClick={() => navigate(`/reservations/${reservation.id}`)}
                        >
                          <Table.Td>
                            <Text fw={600}>{reservation.reference}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Group gap="xs" wrap="nowrap">
                              <Text>{reservation.client?.full_name || 'Unknown'}</Text>
                              {reservation.client?.is_vip && (
                                <Badge color="yellow" size="sm">
                                  {t('clients.vip', 'VIP')}
                                </Badge>
                              )}
                              {reservation.client?.is_blacklisted && (
                                <Badge color="red" size="sm">
                                  {t('clients.blacklisted', 'Blacklisté')}
                                </Badge>
                              )}
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            {new Date(reservation.reservation_date).toLocaleDateString('fr-FR')}
                          </Table.Td>
                          <Table.Td>{reservation.reservation_time || '-'}</Table.Td>
                          <Table.Td>
                            <Badge variant="light">{reservation.number_of_guests}</Badge>
                          </Table.Td>
                          <Table.Td>
                            <Badge color={getStatusColor(reservation.status)}>
                              {String(t(`reservations.${reservation.status}`, reservation.status))}
                            </Badge>
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
                  {reservations.map((reservation: any) => (
                    <Card
                      key={reservation.id}
                      withBorder
                      padding="sm"
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/reservations/${reservation.id}`)}
                    >
                      <Group justify="space-between" mb="xs">
                        <Text fw={600}>{reservation.reference}</Text>
                        <Badge color={getStatusColor(reservation.status)} size="sm">
                          {String(t(`reservations.${reservation.status}`, reservation.status))}
                        </Badge>
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
                            {new Date(reservation.reservation_date).toLocaleDateString('fr-FR')}
                          </Text>
                          <Text size="sm" c="dimmed">
                            {t('reservations.time', 'Time')}:
                          </Text>
                          <Text size="sm">{reservation.reservation_time || '-'}</Text>
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
          </Card>
        )}
      </Stack>

      {/* Reservation Wizard */}
      <ReservationWizard opened={wizardOpened} onClose={closeWizard} onSuccess={refetch} />

      {/* New Reservation Modal */}
      <Modal
        opened={opened}
        onClose={close}
        title={t('reservations.newReservation', 'Nouvelle Réservation')}
        size="lg"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            {/* Client Selection */}
            <div>
              <Text size="sm" fw={600} mb="xs">
                {t('reservations.client', 'Client')}
              </Text>
              {!showNewClientForm ? (
                <Combobox store={combobox} onOptionSubmit={handleClientSelect}>
                  <Combobox.Target>
                    <TextInput
                      placeholder={t('reservations.searchClient', 'Rechercher un client...')}
                      value={clientSearch}
                      onChange={(event) => {
                        setClientSearch(event.currentTarget.value);
                        combobox.openDropdown();
                      }}
                      onClick={() => combobox.openDropdown()}
                      onFocus={() => combobox.openDropdown()}
                      onBlur={() => combobox.closeDropdown()}
                      rightSection={<IconSearch size={16} />}
                    />
                  </Combobox.Target>

                  <Combobox.Dropdown>
                    <Combobox.Options>
                      {filteredClients.map((client) => (
                        <Combobox.Option value={client.id} key={client.id}>
                          <div>
                            <Text fw={600}>{client.full_name}</Text>
                            <Text size="xs" c="dimmed">
                              {client.phone_number} {client.email && `• ${client.email}`}
                            </Text>
                          </div>
                        </Combobox.Option>
                      ))}
                      <Combobox.Option value="new">
                        <Group>
                          <IconPlus size={16} />
                          <Text>{t('clients.addNew', 'Ajouter un nouveau client')}</Text>
                        </Group>
                      </Combobox.Option>
                    </Combobox.Options>
                  </Combobox.Dropdown>
                </Combobox>
              ) : (
                <Stack gap="sm">
                  <TextInput
                    label={t('clients.name', 'Nom')}
                    placeholder={t('clients.namePlaceholder', 'Nom complet')}
                    {...form.getInputProps('full_name')}
                    required
                  />
                  <TextInput
                    label={t('clients.phone', 'Téléphone')}
                    placeholder={t('clients.phonePlaceholder', '+33 6 12 34 56 78')}
                    {...form.getInputProps('phone_number')}
                    required
                  />
                  <TextInput
                    label={t('clients.email', 'Email')}
                    placeholder={t('clients.emailPlaceholder', 'email@example.com')}
                    {...form.getInputProps('email')}
                  />
                  <Group justify="space-between">
                    <Button variant="light" onClick={() => setShowNewClientForm(false)}>
                      {t('common.cancel')}
                    </Button>
                    <Button onClick={handleCreateClient} loading={createClientMutation.isPending}>
                      {t('clients.create', 'Créer client')}
                    </Button>
                  </Group>
                </Stack>
              )}
            </div>

            {/* Date and Time */}
            <Grid>
              <Grid.Col span={6}>
                <DatePickerInput
                  label={t('reservations.date', 'Date')}
                  placeholder={t('reservations.selectDate', 'Sélectionner une date')}
                  {...form.getInputProps('reservation_date')}
                  required
                  minDate={new Date()}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <TextInput
                  label={t('reservations.time', 'Heure')}
                  placeholder={t('common.timeFormat')}
                  type="time"
                  {...form.getInputProps('reservation_time')}
                />
              </Grid.Col>
            </Grid>

            {/* Number of Guests */}
            <NumberInput
              label={t('reservations.guests', 'Nombre de convives')}
              placeholder="2"
              min={1}
              {...form.getInputProps('number_of_guests')}
              required
            />

            {/* Special Request */}
            <Textarea
              label={t('reservations.specialRequest', 'Demande spéciale')}
              placeholder={t(
                'reservations.specialRequestPlaceholder',
                'Allergies, préférences, etc.'
              )}
              {...form.getInputProps('special_request')}
              rows={3}
            />

            {/* Actions */}
            <Group justify="flex-end" mt="md">
              <Button variant="light" onClick={close}>
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                loading={createReservationMutation.isPending}
                disabled={showNewClientForm}
              >
                {t('reservations.createReservation', 'Créer la réservation')}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Box>
  );
}
