import type { ZoneRead } from '@/api/generated/models';
import {
  useCreateZoneApiStaffZonesPost,
  useDeleteZoneApiStaffZonesZoneIdDelete,
  useListZonesApiStaffZonesGet,
  useUpdateZoneApiStaffZonesZoneIdPatch,
} from '@/api/generated/staff-zones/staff-zones';
import {
  ActionIcon,
  Box,
  Button,
  Card,
  Group,
  Loader,
  Modal,
  Stack,
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
import { formatDateTimeParts } from '@/utils/dateUtils';

export function ZonesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [editingZone, setEditingZone] = useState<ZoneRead | null>(null);
  const [search, setSearch] = useState('');

  const { data: zonesResponse, isLoading } = useListZonesApiStaffZonesGet({
    sort_by: 'created_at',
    sort_order: 'desc',
  });
  const zones = zonesResponse?.data;
  const createZoneMutation = useCreateZoneApiStaffZonesPost();
  const updateZoneMutation = useUpdateZoneApiStaffZonesZoneIdPatch();
  const deleteZoneMutation = useDeleteZoneApiStaffZonesZoneIdDelete();

  const form = useForm({
    initialValues: {
      name: '',
    },
    validate: {
      name: (value) => (value.trim().length > 0 ? null : t('zones.nameRequired')),
    },
  });

  const handleOpenModal = (zone?: ZoneRead) => {
    if (zone) {
      setEditingZone(zone);
      form.setValues({ name: zone.name });
    } else {
      setEditingZone(null);
      form.reset();
    }
    openModal();
  };

  const handleCloseModal = () => {
    setEditingZone(null);
    form.reset();
    closeModal();
  };

  const handleSubmit = async (values: typeof form.values) => {
    const isEditing = !!editingZone;
    try {
      if (isEditing) {
        await updateZoneMutation.mutateAsync({
          zoneId: editingZone.id,
          data: { name: values.name },
        });
      } else {
        await createZoneMutation.mutateAsync({
          data: { name: values.name },
        });
      }

      notifications.show({
        title: t('common.success'),
        message: isEditing ? t('zones.updatedSuccessfully') : t('zones.createdSuccessfully'),
        color: 'green',
      });

      queryClient.invalidateQueries({ queryKey: ['/api/staff/zones/'] });
      handleCloseModal();
    } catch (error) {
      console.error('Error saving zone:', error);
      notifications.show({
        title: t('common.error'),
        message: isEditing ? t('zones.updateError') : t('zones.createError'),
        color: 'red',
      });
    }
  };

  const handleDelete = async (zoneId: string) => {
    try {
      await deleteZoneMutation.mutateAsync({ zoneId });
      notifications.show({
        title: t('common.success'),
        message: t('zones.deletedSuccessfully'),
        color: 'green',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/staff/zones/'] });
    } catch (error) {
      console.error('Error deleting zone:', error);
      notifications.show({
        title: t('common.error'),
        message: t('zones.deleteError'),
        color: 'red',
      });
    }
  };

  const filteredZones = Array.isArray(zonesResponse?.data)
    ? zonesResponse.data.filter((z) => z.name.toLowerCase().includes(search.toLowerCase()))
    : [];

  if (isLoading) {
    return (
      <Stack p="xl" align="center">
        <Loader size="lg" />
        <Text>{t('common.loading')}</Text>
      </Stack>
    );
  }

  return (
    <Box p={{ base: 'md', sm: 'xl' }}>
      <Stack gap="lg">
        <Group justify="space-between">
          <Title order={1}>{t('zones.title')}</Title>
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

          <Box visibleFrom="md">
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('zones.name')}</Table.Th>
                  <Table.Th>{t('zones.actions')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredZones && filteredZones.length > 0 ? (
                  filteredZones.map((zone) => (
                    <Table.Tr key={zone.id}>
                      <Table.Td>{zone.name}</Table.Td>
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
                            onClick={() => handleDelete(zone.id)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))
                ) : (
                  <Table.Tr>
                    <Table.Td colSpan={3}>
                      <Text ta="center" c="dimmed" py="xl">
                        {t('zones.noZones')}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Box>

          <Box hiddenFrom="md">
            <Stack gap="sm">
              {filteredZones && filteredZones.length > 0 ? (
                filteredZones.map((zone) => (
                  <Card key={zone.id} withBorder padding="md">
                    <Group justify="space-between">
                      <Text fw={500}>{zone.name}</Text>
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
                          onClick={() => handleDelete(zone.id)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Group>
                    <Text size="sm" c="dimmed" mt="xs">
                      {t('zones.createdAt')}: {formatDateTimeParts(zone.created_at).date}{' '}
                      {formatDateTimeParts(zone.created_at).time}
                    </Text>
                  </Card>
                ))
              ) : (
                <Text ta="center" c="dimmed" py="xl">
                  {t('zones.noZones')}
                </Text>
              )}
            </Stack>
          </Box>
        </Card>

        <Modal
          opened={modalOpened}
          onClose={handleCloseModal}
          title={editingZone ? t('zones.editZone') : t('zones.newZone')}
        >
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack>
              <TextInput
                label={t('zones.zoneName')}
                placeholder={t('zones.zoneNamePlaceholder')}
                {...form.getInputProps('name')}
                required
              />
              <Group justify="flex-end" mt="md">
                <Button variant="light" onClick={handleCloseModal}>
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  loading={createZoneMutation.isPending || updateZoneMutation.isPending}
                >
                  {editingZone ? t('common.update') : t('common.create')}
                </Button>
              </Group>
            </Stack>
          </form>
        </Modal>
      </Stack>
    </Box>
  );
}
