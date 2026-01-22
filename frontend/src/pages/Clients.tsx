import type { ClientRead } from '@/api/generated/models';
import {
  useCreateClientApiStaffClientsPost,
  useDeleteClientApiStaffClientsClientIdDelete,
  useListClientsApiStaffClientsGet,
  useUpdateClientApiStaffClientsClientIdPatch,
} from '@/api/generated/staff-clients/staff-clients';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Loader,
  Modal,
  Pagination,
  SegmentedControl,
  Skeleton,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconPencil, IconPlus, IconSearch, IconTrash } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SortableTableHeader } from '@/components/SortableTableHeader';

export function ClientsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [editingClient, setEditingClient] = useState<ClientRead | null>(null);
  const [search, setSearch] = useState('');

  const [page, setPage] = useState(1);
  const [labelFilter, setLabelFilter] = useState<string | null>(null);

  // Sorting state
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'phone' | 'created_at' | 'status'>(
    'name'
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const { data: clientsResponse, isLoading: loadingClients } = useListClientsApiStaffClientsGet({
    page: page,
    page_size: 20,
    sort_by: sortBy,
    sort_order: sortOrder,
    label_filter: labelFilter || undefined,
  });

  const clientsPaginatedData =
    clientsResponse?.data && 'items' in clientsResponse.data ? clientsResponse.data : null;
  const clients = clientsPaginatedData?.items || [];
  const totalClients = clientsPaginatedData?.total || 0;
  const totalPages = clientsPaginatedData?.total_pages || 0;

  const createClientMutation = useCreateClientApiStaffClientsPost();
  const updateClientMutation = useUpdateClientApiStaffClientsClientIdPatch();
  const deleteClientMutation = useDeleteClientApiStaffClientsClientIdDelete();

  const form = useForm({
    initialValues: {
      full_name: '',
      phone_number: '',
      email: '',
      is_vip: false,
      is_blacklisted: false,
    },
    validate: {
      full_name: (value) => (value.trim().length > 0 ? null : t('clients.nameRequired')),
      phone_number: (value) => (value.trim().length > 0 ? null : t('clients.phoneRequired')),
    },
  });

  const handleOpenModal = (client?: ClientRead) => {
    if (client) {
      setEditingClient(client);
      form.setValues({
        full_name: client.full_name,
        phone_number: client.phone_number,
        email: client.email || '',
        is_vip: client.is_vip || false,
        is_blacklisted: client.is_blacklisted || false,
      });
    } else {
      setEditingClient(null);
      form.reset();
    }
    openModal();
  };

  const handleCloseModal = () => {
    setEditingClient(null);
    form.reset();
    closeModal();
  };

  const handleSubmit = async (values: typeof form.values) => {
    const isEditing = !!editingClient;
    try {
      let result;
      if (isEditing) {
        result = await updateClientMutation.mutateAsync({
          clientId: editingClient.id,
          data: {
            full_name: values.full_name,
            phone_number: values.phone_number,
            email: values.email || undefined,
            is_vip: values.is_vip,
            is_blacklisted: values.is_blacklisted,
          },
        });
      } else {
        result = await createClientMutation.mutateAsync({
          data: {
            full_name: values.full_name,
            phone_number: values.phone_number,
            email: values.email || undefined,
            is_vip: values.is_vip,
            is_blacklisted: values.is_blacklisted,
          },
        });
      }

      if (result.status >= 400 && 'detail' in result.data) {
        const detail = result.data.detail;
        throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
      }

      notifications.show({
        title: t('common.success'),
        message: isEditing ? t('clients.updatedSuccessfully') : t('clients.createdSuccessfully'),
        color: 'green',
      });

      queryClient.invalidateQueries({ queryKey: ['/api/staff/clients/'] });
      handleCloseModal();
    } catch (error: any) {
      console.error('Error saving client:', error);
      notifications.show({
        title: t('common.error'),
        message: error.message || (isEditing ? t('clients.updateError') : t('clients.createError')),
        color: 'red',
      });
    }
  };

  const handleDelete = async (clientId: string) => {
    try {
      await deleteClientMutation.mutateAsync({ clientId });
      notifications.show({
        title: t('common.success'),
        message: t('clients.deletedSuccessfully'),
        color: 'green',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/staff/clients/'] });
    } catch (error) {
      console.error('Error deleting client:', error);
      notifications.show({
        title: t('common.error'),
        message: t('clients.deleteError'),
        color: 'red',
      });
    }
  };

  const handleSort = (newSortBy: typeof sortBy) => {
    if (sortBy === newSortBy) {
      // Toggle sort order if clicking same column
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort column with default ascending order
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  const filteredClients = clients.filter(
    (c: ClientRead) =>
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Box p={{ base: 'md', sm: 'xl' }}>
      <Stack gap="lg">
        <Group justify="space-between">
          <Title order={1}>{t('clients.title')}</Title>
          <Button leftSection={<IconPlus size={16} />} onClick={() => handleOpenModal()}>
            {t('clients.addClient')}
          </Button>
        </Group>

        <Card withBorder>
          <Stack gap="md" mb="md">
            <TextInput
              placeholder={t('clients.searchPlaceholder')}
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
            />

            <SegmentedControl
              value={labelFilter || 'all'}
              onChange={(value) => setLabelFilter(value === 'all' ? null : value)}
              data={[
                { label: t('common.all', 'All'), value: 'all' },
                { label: t('clients.vip', 'VIP'), value: 'vip' },
                { label: t('clients.regular', 'Regular'), value: 'regular' },
                { label: t('clients.blacklisted', 'Blacklisted'), value: 'blacklisted' },
              ]}
            />
          </Stack>

          {/* Desktop Table View */}
          <Box visibleFrom="md">
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <SortableTableHeader
                    label={t('clients.name')}
                    sortKey="name"
                    currentSortBy={sortBy}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <SortableTableHeader
                    label={t('clients.email')}
                    sortKey="email"
                    currentSortBy={sortBy}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <SortableTableHeader
                    label={t('clients.phone')}
                    sortKey="phone"
                    currentSortBy={sortBy}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <SortableTableHeader
                    label={t('common.status')}
                    sortKey="status"
                    currentSortBy={sortBy}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <Table.Th>{t('common.actions')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {loadingClients ? (
                  // Skeleton rows while loading
                  Array.from({ length: 5 }).map((_, index) => (
                    <Table.Tr key={index}>
                      <Table.Td>
                        <Skeleton height={20} />
                      </Table.Td>
                      <Table.Td>
                        <Skeleton height={20} />
                      </Table.Td>
                      <Table.Td>
                        <Skeleton height={20} />
                      </Table.Td>
                      <Table.Td>
                        <Skeleton height={20} width={80} />
                      </Table.Td>
                      <Table.Td>
                        <Skeleton height={30} width={80} />
                      </Table.Td>
                    </Table.Tr>
                  ))
                ) : filteredClients.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={5}>
                      <Text ta="center" c="dimmed" py="xl">
                        {t('clients.noClients')}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  filteredClients.map((client: ClientRead) => (
                    <Table.Tr key={client.id}>
                      <Table.Td>{client.full_name}</Table.Td>
                      <Table.Td>{client.email || '-'}</Table.Td>
                      <Table.Td>{client.phone_number}</Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          {client.is_vip && (
                            <Badge size="sm" variant="filled" color="yellow">
                              {t('clients.vip')}
                            </Badge>
                          )}
                          {client.is_blacklisted && (
                            <Badge size="sm" variant="filled" color="red">
                              {t('clients.blacklisted')}
                            </Badge>
                          )}
                          {!client.is_vip && !client.is_blacklisted && (
                            <Badge size="sm" variant="filled" color="gray">
                              {t('clients.regular')}
                            </Badge>
                          )}
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <ActionIcon
                            variant="light"
                            color="blue"
                            onClick={() => handleOpenModal(client)}
                          >
                            <IconPencil size={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="light"
                            color="red"
                            onClick={() => handleDelete(client.id)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))
                )}
              </Table.Tbody>
            </Table>
          </Box>

          {/* Mobile Card View */}
          <Box hiddenFrom="md">
            <Stack gap="sm">
              {loadingClients ? (
                // Skeleton cards while loading
                Array.from({ length: 3 }).map((_, index) => (
                  <Card key={index} withBorder padding="md">
                    <Skeleton height={20} width="60%" mb="sm" />
                    <Skeleton height={16} mb="xs" />
                    <Skeleton height={16} mb="xs" />
                    <Skeleton height={16} width="40%" />
                  </Card>
                ))
              ) : filteredClients.length === 0 ? (
                <Card withBorder>
                  <Text ta="center" c="dimmed" py="xl">
                    {t('clients.noClients')}
                  </Text>
                </Card>
              ) : (
                filteredClients.map((client: ClientRead) => (
                  <Card key={client.id} withBorder padding="md">
                    <Group justify="space-between" mb="xs">
                      <Text fw={500} size="lg">
                        {client.full_name}
                      </Text>
                      <Group gap="xs">
                        <ActionIcon
                          variant="light"
                          color="blue"
                          onClick={() => handleOpenModal(client)}
                        >
                          <IconPencil size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="light"
                          color="red"
                          onClick={() => handleDelete(client.id)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Group>
                    <Stack gap="xs">
                      <Text size="sm">
                        {t('clients.email')}: {client.email || '-'}
                      </Text>
                      <Text size="sm">
                        {t('clients.phone')}: {client.phone_number}
                      </Text>
                      <Group gap="xs">
                        {client.is_vip && <Badge color="yellow">{t('clients.vip')}</Badge>}
                        {client.is_blacklisted && (
                          <Badge color="red">{t('clients.blacklisted')}</Badge>
                        )}
                        {!client.is_vip && !client.is_blacklisted && (
                          <Badge color="gray">{t('clients.regular')}</Badge>
                        )}
                      </Group>
                    </Stack>
                  </Card>
                ))
              )}
            </Stack>
          </Box>

          {/* Pagination */}
          {totalPages > 1 && (
            <Group justify="space-between" mt="md" wrap="wrap">
              <Text size="sm" c="dimmed">
                {t('common.showing', 'Showing')} {(page - 1) * 20 + 1} -{' '}
                {Math.min(page * 20, totalClients)} {t('common.of', 'of')} {totalClients}{' '}
                {t('clients.title', 'Clients')}
              </Text>
              <Pagination total={totalPages} value={page} onChange={setPage} size="sm" />
            </Group>
          )}
        </Card>

        <Modal
          opened={modalOpened}
          onClose={handleCloseModal}
          title={editingClient ? t('clients.editClient') : t('clients.addClient')}
          size="lg"
        >
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack>
              <TextInput
                label={t('clients.name')}
                placeholder={t('clients.namePlaceholder')}
                {...form.getInputProps('full_name')}
                required
              />
              <TextInput
                label={t('clients.phone')}
                placeholder={t('clients.phonePlaceholder')}
                {...form.getInputProps('phone_number')}
                required
              />
              <TextInput
                label={t('clients.email')}
                placeholder={t('clients.emailPlaceholder')}
                {...form.getInputProps('email')}
              />
              <Switch
                label={t('clients.vipClient')}
                {...form.getInputProps('is_vip', { type: 'checkbox' })}
              />
              <Switch
                label={t('clients.blacklisted')}
                {...form.getInputProps('is_blacklisted', { type: 'checkbox' })}
              />
              <Group justify="flex-end" mt="md">
                <Button variant="light" onClick={handleCloseModal}>
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  loading={createClientMutation.isPending || updateClientMutation.isPending}
                >
                  {editingClient ? t('common.update') : t('common.create')}
                </Button>
              </Group>
            </Stack>
          </form>
        </Modal>
      </Stack>
    </Box>
  );
}
