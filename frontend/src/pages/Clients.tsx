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

export function ClientsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [opened, { open, close }] = useDisclosure(false);
  const [editingClient, setEditingClient] = useState<ClientRead | null>(null);
  const [search, setSearch] = useState('');

  const { data: clients, isLoading: loadingClients } = useListClientsApiStaffClientsGet();

  const createClientMutation = useCreateClientApiStaffClientsPost();
  const updateClientMutation = useUpdateClientApiStaffClientsClientIdPatch();
  const deleteClientMutation = useDeleteClientApiStaffClientsClientIdDelete();

  const form = useForm({
    initialValues: {
      is_vip: false,
      is_blacklisted: false,
    },
    validate: {},
  });

  const handleOpenModal = (client?: ClientRead) => {
    if (client) {
      setEditingClient(client);
      form.setValues({
        is_vip: client.is_vip || false,
        is_blacklisted: client.is_blacklisted || false,
      });
    } else {
      setEditingClient(null);
      form.reset();
    }
    open();
  };

  const handleSubmit = async (values: typeof form.values) => {
    try {
      if (editingClient) {
        await updateClientMutation.mutateAsync({
          clientId: editingClient.id,
          data: {
            is_vip: values.is_vip,
            is_blacklisted: values.is_blacklisted,
          },
        });
        notifications.show({
          title: t('common.success'),
          message: t('clients.updatedSuccessfully'),
          color: 'green',
        });
      } else {
        // For new clients, we need to show a different modal or redirect to reservation wizard
        notifications.show({
          title: t('common.error'),
          message: t('clients.createFromReservations'),
          color: 'orange',
        });
        close();
        return;
      }

      // Invalidate and refetch clients
      queryClient.invalidateQueries({ queryKey: ['/api/staff/clients/'] });
      close();
      form.reset();
    } catch (error) {
      console.error('Error saving client:', error);
      notifications.show({
        title: t('common.error'),
        message: editingClient ? t('clients.updateError') : t('clients.createError'),
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
      // Invalidate and refetch clients
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

  const filteredClients =
    clients?.filter(
      (c) =>
        c.full_name.toLowerCase().includes(search.toLowerCase()) ||
        (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
    ) || [];

  if (loadingClients) {
    return (
      <Stack gap="lg" align="center">
        <Loader size="lg" />
        <Text>{t('common.loading')}</Text>
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>{t('clients.title')}</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => handleOpenModal()}>
          {t('clients.addClient')}
        </Button>
      </Group>

      <Card withBorder>
        <TextInput
          placeholder={t('clients.searchPlaceholder', 'Search by name or email...')}
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          mb="md"
        />

        {/* Desktop Table View */}
        <Box visibleFrom="md">
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('clients.name')}</Table.Th>
                <Table.Th>{t('clients.email')}</Table.Th>
                <Table.Th>{t('clients.phone')}</Table.Th>
                <Table.Th>{t('common.status')}</Table.Th>
                <Table.Th>{t('common.actions')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredClients.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Text ta="center" c="dimmed">
                      {t('clients.noClients', 'Aucun client trouvé')}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                filteredClients.map((client) => (
                  <Table.Tr key={client.id}>
                    <Table.Td>{client.full_name}</Table.Td>
                    <Table.Td>{client.email || '-'}</Table.Td>
                    <Table.Td>{client.phone_number}</Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        {client.is_vip && <Badge color="yellow">{t('clients.vip')}</Badge>}
                        {client.is_blacklisted && (
                          <Badge color="red">{t('clients.blacklisted')}</Badge>
                        )}
                        {!client.is_vip && !client.is_blacklisted && (
                          <Badge color="gray">{t('clients.regular')}</Badge>
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
            {filteredClients.length === 0 ? (
              <Card withBorder>
                <Text ta="center" c="dimmed">
                  {t('clients.noClients', 'Aucun client trouvé')}
                </Text>
              </Card>
            ) : (
              filteredClients.map((client) => (
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
                    <Text size="sm" c="dimmed">
                      <Text span fw={500}>
                        {t('clients.email')}:{' '}
                      </Text>
                      {client.email || '-'}
                    </Text>
                    <Text size="sm" c="dimmed">
                      <Text span fw={500}>
                        {t('clients.phone')}:{' '}
                      </Text>
                      {client.phone_number}
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
      </Card>

      <Modal
        opened={opened}
        onClose={close}
        title={editingClient ? t('clients.editClient') : t('clients.addClient')}
        size="lg"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            {editingClient ? (
              <>
                <Text size="sm" c="dimmed">
                  {t('clients.editInfo')}
                </Text>
                <Card withBorder p="md">
                  <Text fw={500} size="lg" mb="xs">
                    {editingClient.full_name}
                  </Text>
                  <Text size="sm" c="dimmed" mb="xs">
                    {t('clients.email')}: {editingClient.email || t('common.none')}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {t('clients.phone')}: {editingClient.phone_number}
                  </Text>
                </Card>

                <Switch
                  label={t('clients.vipClient')}
                  {...form.getInputProps('is_vip', { type: 'checkbox' })}
                />

                <Switch
                  label={t('clients.blacklisted')}
                  {...form.getInputProps('is_blacklisted', { type: 'checkbox' })}
                />
              </>
            ) : (
              <Card withBorder p="md">
                <Text ta="center" mb="md">
                  {t('clients.createFromReservations')}
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  {t('clients.createFromReservationsDesc')}
                </Text>
              </Card>
            )}

            <Group justify="flex-end" mt="md">
              <Button variant="light" onClick={close}>
                {t('common.cancel')}
              </Button>
              {editingClient && <Button type="submit">{t('common.update')}</Button>}
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
