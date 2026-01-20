import { useState } from 'react';
import {
  Stack,
  Title,
  Button,
  Group,
  TextInput,
  Table,
  ActionIcon,
  Modal,
  Card,
  Text,
  Box,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus, IconPencil, IconTrash, IconSearch } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';

interface Zone {
  uuid: string;
  name: string;
  table_count: number;
}

const mockZones: Zone[] = [
  { uuid: '1', name: 'Main Hall', table_count: 10 },
  { uuid: '2', name: 'Terrace', table_count: 6 },
  { uuid: '3', name: 'VIP Room', table_count: 4 },
];

export function ZonesPage() {
  const { t } = useTranslation();
  const [zones, setZones] = useState<Zone[]>(mockZones);
  const [opened, { open, close }] = useDisclosure(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [search, setSearch] = useState('');

  const form = useForm({
    initialValues: {
      name: '',
    },
    validate: {
      name: (value) => (value.length > 0 ? null : 'Name is required'),
    },
  });

  const handleOpenModal = (zone?: Zone) => {
    if (zone) {
      setEditingZone(zone);
      form.setValues({ name: zone.name });
    } else {
      setEditingZone(null);
      form.reset();
    }
    open();
  };

  const handleSubmit = (values: typeof form.values) => {
    if (editingZone) {
      setZones(zones.map((z) => (z.uuid === editingZone.uuid ? { ...editingZone, ...values } : z)));
      notifications.show({
        title: 'Success',
        message: 'Zone updated successfully',
        color: 'green',
      });
    } else {
      const newZone = { ...values, uuid: Date.now().toString(), table_count: 0 };
      setZones([...zones, newZone]);
      notifications.show({
        title: 'Success',
        message: 'Zone created successfully',
        color: 'green',
      });
    }
    close();
    form.reset();
  };

  const handleDelete = (uuid: string) => {
    setZones(zones.filter((z) => z.uuid !== uuid));
    notifications.show({
      title: 'Success',
      message: 'Zone deleted successfully',
      color: 'green',
    });
  };

  const filteredZones = zones.filter((z) => z.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>{t('zones.title')}</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => handleOpenModal()}>
          {t('zones.addZone')}
        </Button>
      </Group>

      <Card withBorder>
        <TextInput
          placeholder={t('zones.searchPlaceholder')}
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
                <Table.Th>Name</Table.Th>
                <Table.Th>Number of Tables</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredZones.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={3}>
                    <Text ta="center" c="dimmed">
                      No zones found
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                filteredZones.map((zone) => (
                  <Table.Tr key={zone.uuid}>
                    <Table.Td>{zone.name}</Table.Td>
                    <Table.Td>{zone.table_count}</Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <ActionIcon
                          variant="light"
                          color="blue"
                          onClick={() => handleOpenModal(zone)}
                        >
                          <IconPencil size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="light"
                          color="red"
                          onClick={() => handleDelete(zone.uuid)}
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
            {filteredZones.length === 0 ? (
              <Card withBorder>
                <Text ta="center" c="dimmed">
                  No zones found
                </Text>
              </Card>
            ) : (
              filteredZones.map((zone) => (
                <Card key={zone.uuid} withBorder padding="md">
                  <Group justify="space-between" mb="xs">
                    <Text fw={500} size="lg">
                      {zone.name}
                    </Text>
                    <Group gap="xs">
                      <ActionIcon
                        variant="light"
                        color="blue"
                        onClick={() => handleOpenModal(zone)}
                      >
                        <IconPencil size={16} />
                      </ActionIcon>
                      <ActionIcon
                        variant="light"
                        color="red"
                        onClick={() => handleDelete(zone.uuid)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Group>

                  <Text size="sm" c="dimmed">
                    <Text span fw={500}>
                      Tables:{' '}
                    </Text>
                    {zone.table_count}
                  </Text>
                </Card>
              ))
            )}
          </Stack>
        </Box>
      </Card>

      <Modal
        opened={opened}
        onClose={close}
        title={editingZone ? t('zones.editZone') : t('zones.newZone')}
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput
              label={t('zones.zoneName')}
              placeholder={t('zones.zoneNamePlaceholder')}
              required
              {...form.getInputProps('name')}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="light" onClick={close}>
                Cancel
              </Button>
              <Button type="submit">{editingZone ? 'Update' : 'Create'}</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
