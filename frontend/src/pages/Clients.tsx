import { useState } from 'react';
import {
  Stack,
  Title,
  Button,
  Group,
  TextInput,
  Table,
  Badge,
  ActionIcon,
  Modal,
  Card,
  Text,
  Switch,
  Box,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus, IconPencil, IconTrash, IconSearch } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';

interface Client {
  uuid: string;
  full_name: string;
  email: string;
  phone_number: string;
  is_vip: boolean;
  is_blacklisted: boolean;
}

const mockClients: Client[] = [
  {
    uuid: '1',
    full_name: 'John Doe',
    email: 'john@example.com',
    phone_number: '+1234567890',
    is_vip: true,
    is_blacklisted: false,
  },
  {
    uuid: '2',
    full_name: 'Jane Smith',
    email: 'jane@example.com',
    phone_number: '+0987654321',
    is_vip: false,
    is_blacklisted: false,
  },
];

export function ClientsPage() {
  const { t } = useTranslation();
  const [clients, setClients] = useState<Client[]>(mockClients);
  const [opened, { open, close }] = useDisclosure(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [search, setSearch] = useState('');

  const form = useForm({
    initialValues: {
      full_name: '',
      email: '',
      phone_number: '',
      is_vip: false,
      is_blacklisted: false,
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
      full_name: (value) => (value.length > 0 ? null : 'Name is required'),
      phone_number: (value) => (value.length > 0 ? null : 'Phone is required'),
    },
  });

  const handleOpenModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      form.setValues(client);
    } else {
      setEditingClient(null);
      form.reset();
    }
    open();
  };

  const handleSubmit = (values: typeof form.values) => {
    if (editingClient) {
      setClients(
        clients.map((c) => (c.uuid === editingClient.uuid ? { ...editingClient, ...values } : c))
      );
      notifications.show({
        title: 'Success',
        message: 'Client updated successfully',
        color: 'green',
      });
    } else {
      const newClient = { ...values, uuid: Date.now().toString() };
      setClients([...clients, newClient]);
      notifications.show({
        title: 'Success',
        message: 'Client created successfully',
        color: 'green',
      });
    }
    close();
    form.reset();
  };

  const handleDelete = (uuid: string) => {
    setClients(clients.filter((c) => c.uuid !== uuid));
    notifications.show({
      title: 'Success',
      message: 'Client deleted successfully',
      color: 'green',
    });
  };

  const filteredClients = clients.filter(
    (c) =>
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

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
                  <Table.Tr key={client.uuid}>
                    <Table.Td>{client.full_name}</Table.Td>
                    <Table.Td>{client.email}</Table.Td>
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
                          onClick={() => handleDelete(client.uuid)}
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
                <Card key={client.uuid} withBorder padding="md">
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
                        onClick={() => handleDelete(client.uuid)}
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
                      {client.email}
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
            <TextInput
              label={t('clients.fullName')}
              placeholder={t('clients.enterFullName')}
              required
              {...form.getInputProps('full_name')}
            />

            <TextInput
              label={t('clients.email')}
              placeholder={t('clients.emailPlaceholder')}
              required
              {...form.getInputProps('email')}
            />

            <TextInput
              label={t('clients.phoneNumber')}
              placeholder={t('clients.phonePlaceholder')}
              required
              {...form.getInputProps('phone_number')}
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
              <Button variant="light" onClick={close}>
                {t('common.cancel')}
              </Button>
              <Button type="submit">
                {editingClient ? t('common.update') : t('common.create')}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
