import type { ClientRead } from '@/api/generated/models';
import {
  useCreateClientApiStaffClientsPost,
  useDeleteClientApiStaffClientsClientIdDelete,
  useListClientsApiStaffClientsGet,
  useUpdateClientApiStaffClientsClientIdPatch,
} from '@/api/generated/staff-clients/staff-clients';
import { SortableTableHeader } from '@/components/SortableTableHeader';
import { formatDateTimeParts } from '@/utils/dateUtils';
import {
  ActionIcon,
  Box,
  Button,
  Card,
  Group,
  Modal,
  MultiSelect,
  Pagination,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDebouncedValue, useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconPencil, IconPlus, IconSearch, IconTrash } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export function ClientsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [editingClient, setEditingClient] = useState<ClientRead | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 300);

  const [page, setPage] = useState(1);
  const [labelFilter, setLabelFilter] = useState<string[]>([]);

  // Sorting state
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'phone' | 'created_at'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const { data: clientsResponse, isLoading: loadingClients } = useListClientsApiStaffClientsGet({
    page: page,
    page_size: 20,
    sort_by: sortBy,
    sort_order: sortOrder,
    label_filter: labelFilter.length > 0 ? labelFilter : undefined,
    search: debouncedSearch || undefined,
  });

  const clientsPaginatedData =
    clientsResponse?.data && 'items' in clientsResponse.data ? clientsResponse.data : null;
  const clients = clientsPaginatedData?.items || [];
  const totalClients = clientsPaginatedData?.total || 0;
  const totalPages = clientsPaginatedData?.total_pages || 0;

  const createClientMutation = useCreateClientApiStaffClientsPost();
  const updateClientMutation = useUpdateClientApiStaffClientsClientIdPatch();
  const deleteClientMutation = useDeleteClientApiStaffClientsClientIdDelete();

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, labelFilter]);

  const form = useForm({
    initialValues: {
      full_name: '',
      phone_number: '',
      email: '',
      status: [] as string[],
    },
    validate: {
      full_name: (value) => (value.trim().length > 0 ? null : t('clients.nameRequired')),
      phone_number: (value) => (value.trim().length > 0 ? null : t('clients.phoneRequired')),
      status: (value) =>
        value.length === 1 ? null : t('clients.clientTypeRequired', 'Please select a client type'),
    },
  });

  const handleOpenModal = (client?: ClientRead) => {
    if (client) {
      setEditingClient(client);
      const status: string[] = [];
      if (client.is_vip) {
        status.push('vip');
      }
      if (client.is_blacklisted) {
        status.push('blacklisted');
      }
      if (!client.is_vip && !client.is_blacklisted) {
        status.push('regular');
      }
      form.setValues({
        full_name: client.full_name,
        phone_number: client.phone_number,
        email: client.email || '',
        status,
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

    // Convert status array to boolean fields
    const is_vip = values.status.includes('vip');
    const is_blacklisted = values.status.includes('blacklisted');

    try {
      let result;
      if (isEditing) {
        result = await updateClientMutation.mutateAsync({
          clientId: editingClient.id,
          data: {
            full_name: values.full_name,
            phone_number: values.phone_number,
            email: values.email || undefined,
            is_vip,
            is_blacklisted,
          },
        });
      } else {
        result = await createClientMutation.mutateAsync({
          data: {
            full_name: values.full_name,
            phone_number: values.phone_number,
            email: values.email || undefined,
            is_vip,
            is_blacklisted,
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

  const filteredClients = clients;

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

            <MultiSelect
              placeholder={t('clients.filterByLabel', 'Filter by label')}
              data={[
                { label: t('clients.vip', 'VIP'), value: 'vip' },
                { label: t('clients.regular', 'Loyal'), value: 'regular' },
                { label: t('clients.blacklisted', 'Blacklisted'), value: 'blacklisted' },
              ]}
              value={labelFilter}
              onChange={setLabelFilter}
              clearable
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
                    label={t('clients.createdAt')}
                    sortKey="created_at"
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
                        <Skeleton height={20} />
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
                  filteredClients.map((client: ClientRead) => {
                    const badges = [];
                    if (client.is_vip) {
                      badges.push(
                        `<span style="display: inline-block; background-color: #FFF4E5; color: #FF8C00; padding: 2px 6px; border-radius: 4px; font-size: 12px; margin-right: 4px;">${t('clients.vip')}</span>`
                      );
                    }
                    if (client.is_blacklisted) {
                      badges.push(
                        `<span style="display: inline-block; background-color: #FFE5E5; color: #FF0000; padding: 2px 6px; border-radius: 4px; font-size: 12px; margin-right: 4px;">${t('clients.blacklisted')}</span>`
                      );
                    }
                    if (!client.is_vip && !client.is_blacklisted) {
                      badges.push(
                        `<span style="display: inline-block; background-color: #F0F0F0; color: #6B7280; padding: 2px 6px; border-radius: 4px; font-size: 12px; margin-right: 4px;">${t('clients.regular')}</span>`
                      );
                    }
                    const badgeHtml = badges.join('');

                    return (
                      <Table.Tr key={client.id}>
                        <Table.Td>
                          <div
                            dangerouslySetInnerHTML={{
                              __html: `${client.full_name}${badgeHtml ? '<br>' + badgeHtml : ''}`,
                            }}
                          />
                        </Table.Td>
                        <Table.Td>{client.email || '-'}</Table.Td>
                        <Table.Td>{client.phone_number}</Table.Td>
                        <Table.Td>
                          <div>
                            <Text size="sm">{formatDateTimeParts(client.created_at).date}</Text>
                            <Text size="xs" c="dimmed">
                              {formatDateTimeParts(client.created_at).time}
                            </Text>
                          </div>
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
                    );
                  })
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
                filteredClients.map((client: ClientRead) => {
                  const badges = [];
                  if (client.is_vip) {
                    badges.push(
                      `<span style="display: inline-block; background-color: #FFF4E5; color: #FF8C00; padding: 2px 6px; border-radius: 4px; font-size: 12px; margin-right: 4px;">${t('clients.vip')}</span>`
                    );
                  }
                  if (client.is_blacklisted) {
                    badges.push(
                      `<span style="display: inline-block; background-color: #FFE5E5; color: #FF0000; padding: 2px 6px; border-radius: 4px; font-size: 12px; margin-right: 4px;">${t('clients.blacklisted')}</span>`
                    );
                  }
                  if (!client.is_vip && !client.is_blacklisted) {
                    badges.push(
                      `<span style="display: inline-block; background-color: #F0F0F0; color: #6B7280; padding: 2px 6px; border-radius: 4px; font-size: 12px; margin-right: 4px;">${t('clients.regular')}</span>`
                    );
                  }
                  const badgeHtml = badges.join('');

                  return (
                    <Card key={client.id} withBorder padding="md">
                      <Group justify="space-between" mb="xs">
                        <Text fw={500} size="lg">
                          <div
                            dangerouslySetInnerHTML={{
                              __html: `${client.full_name}${badgeHtml ? '<br>' + badgeHtml : ''}`,
                            }}
                          />
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
                        <Text size="sm">
                          {t('clients.createdAt')}: {formatDateTimeParts(client.created_at).date}{' '}
                          {formatDateTimeParts(client.created_at).time}
                        </Text>
                      </Stack>
                    </Card>
                  );
                })
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
              <MultiSelect
                label={t('clients.clientType', 'Client Type')}
                placeholder={t('clients.selectClientType', 'Select client type')}
                data={[
                  { label: t('clients.vip', 'VIP'), value: 'vip' },
                  { label: t('clients.regular', 'Loyal'), value: 'regular' },
                  { label: t('clients.blacklisted', 'Blacklisted'), value: 'blacklisted' },
                ]}
                {...form.getInputProps('status')}
                maxValues={1}
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
