import {
  useCreateTableApiStaffTablesPost,
  useDeleteTableApiStaffTablesTableIdDelete,
  useListTablesApiStaffTablesGet,
  useUpdateTableApiStaffTablesTableIdPatch,
} from '@/api/generated/staff-tables/staff-tables';
import { useListZonesApiStaffZonesGet } from '@/api/generated/staff-zones/staff-zones';
import { axios } from '@/api/mutator/custom-instance';
import { getTableTypeIcon } from '@/utils/tableUtils';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Grid,
  Group,
  Loader,
  Modal,
  NumberInput,
  Paper,
  ScrollArea,
  Select,
  Stack,
  Switch,
  Table,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  Timeline,
  Title,
  Tooltip,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useDebouncedValue, useDisclosure } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import {
  IconCheck,
  IconClock,
  IconFilter,
  IconPencil,
  IconPlus,
  IconSearch,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface TableFormValues {
  name: string;
  description?: string;
  type: 'table' | 'parasol' | 'hut';
  is_on_service: boolean;
  min_capacity: number;
  max_capacity: number;
  zone_id?: string;
}

interface TimeSlot {
  time: string;
  status: 'available' | 'occupied';
  reservation?: {
    reference: string;
    guests: number;
    client_name: string;
  };
}

export function TablesPage() {
  const { t } = useTranslation();

  // Filter states
  const [zoneFilter, setZoneFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [capacityFilter, setCapacityFilter] = useState<number | undefined>(undefined);
  const [nameSearch, setNameSearch] = useState('');
  const [debouncedNameSearch] = useDebouncedValue(nameSearch, 300);

  // Modal states
  const [opened, { open, close }] = useDisclosure(false);
  const [editingTable, setEditingTable] = useState<any | null>(null);
  const [timeSlotsModalOpen, setTimeSlotsModalOpen] = useState(false);
  const [selectedTableForSlots, setSelectedTableForSlots] = useState<any | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // API hooks
  const {
    data: tablesResponse,
    isLoading,
    refetch,
  } = useListTablesApiStaffTablesGet({
    zone_id: zoneFilter || undefined,
    is_on_service:
      statusFilter === 'onService' ? true : statusFilter === 'offService' ? false : undefined,
    name: debouncedNameSearch || undefined,
  });
  const tables = Array.isArray(tablesResponse?.data) ? tablesResponse?.data : [];

  // Apply client-side capacity filter
  const filteredTables = tables.filter((table: any) => {
    if (capacityFilter !== undefined) {
      return table.min_capacity <= capacityFilter && table.max_capacity >= capacityFilter;
    }
    return true;
  });

  const { data: zonesResponse } = useListZonesApiStaffZonesGet({
    sort_by: 'created_at',
    sort_order: 'asc',
  });
  const zones = Array.isArray(zonesResponse?.data) ? zonesResponse?.data : [];

  const createMutation = useCreateTableApiStaffTablesPost();
  const updateMutation = useUpdateTableApiStaffTablesTableIdPatch();
  const deleteMutation = useDeleteTableApiStaffTablesTableIdDelete();

  const form = useForm<TableFormValues>({
    initialValues: {
      name: '',
      description: '',
      type: 'table',
      is_on_service: true,
      min_capacity: 2,
      max_capacity: 4,
      zone_id: '',
    },
    validate: {
      name: (value) => (!value ? t('common.required', 'Required') : null),
      min_capacity: (value) =>
        value < 1 ? t('tables.minCapacityError', 'Must be at least 1') : null,
      max_capacity: (value, values) =>
        value < values.min_capacity
          ? t('tables.maxCapacityError', 'Must be greater than min capacity')
          : null,
    },
  });

  const handleOpenModal = (table?: any) => {
    if (table) {
      setEditingTable(table);
      form.setValues({
        name: table.name,
        description: table.description || '',
        type: table.type,
        is_on_service: table.is_on_service,
        min_capacity: table.min_capacity,
        max_capacity: table.max_capacity,
        zone_id: table.zone?.id || '',
      });
    } else {
      setEditingTable(null);
      form.reset();
    }
    open();
  };

  const handleSubmit = (values: TableFormValues) => {
    if (editingTable) {
      updateMutation.mutate(
        {
          tableId: editingTable.id,
          data: {
            name: values.name,
            description: values.description,
            type: values.type,
            min_capacity: values.min_capacity,
            max_capacity: values.max_capacity,
            is_on_service: values.is_on_service,
            zone_id: values.zone_id,
          },
        },
        {
          onSuccess: () => {
            notifications.show({
              title: t('common.success'),
              message: t('tables.updatedSuccessfully', 'Table updated successfully'),
              color: 'green',
            });
            close();
            form.reset();
            refetch();
          },
          onError: () => {
            notifications.show({
              title: t('common.error'),
              message: t('tables.updateError', 'Failed to update table'),
              color: 'red',
            });
          },
        }
      );
    } else {
      createMutation.mutate(
        { data: values },
        {
          onSuccess: () => {
            notifications.show({
              title: t('common.success'),
              message: t('tables.createdSuccessfully', 'Table created successfully'),
              color: 'green',
            });
            close();
            form.reset();
            refetch();
          },
          onError: () => {
            notifications.show({
              title: t('common.error'),
              message: t('tables.createError', 'Failed to create table'),
              color: 'red',
            });
          },
        }
      );
    }
  };

  const handleDelete = (tableId: string, tableName: string) => {
    modals.openConfirmModal({
      title: t('tables.deleteTable', 'Delete Table'),
      children: (
        <Text size="sm">
          {t('tables.deleteConfirm', 'Are you sure you want to delete table')} "{tableName}"?
        </Text>
      ),
      labels: {
        confirm: t('common.delete', 'Delete'),
        cancel: t('common.cancel', 'Cancel'),
      },
      confirmProps: { color: 'red' },
      onConfirm: () => {
        deleteMutation.mutate(
          { tableId },
          {
            onSuccess: () => {
              notifications.show({
                title: t('common.success'),
                message: t('tables.deletedSuccessfully', 'Table deleted successfully'),
                color: 'green',
              });
              refetch();
            },
            onError: () => {
              notifications.show({
                title: t('common.error'),
                message: t('tables.deleteError', 'Failed to delete table'),
                color: 'red',
              });
            },
          }
        );
      },
    });
  };

  const fetchTimeSlots = async (tableId: string, date: Date | null) => {
    if (!date) return;
    setLoadingSlots(true);
    try {
      const response = await axios.get(`/api/staff/tables/${tableId}/time-slots`, {
        params: {
          date: date.toISOString().split('T')[0],
        },
      });
      setTimeSlots(response.data.data);
    } catch (error) {
      notifications.show({
        title: t('common.error'),
        message: 'Failed to load time slots',
        color: 'red',
      });
      setTimeSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleViewTimeSlots = (table: any) => {
    setSelectedTableForSlots(table);
    setTimeSlotsModalOpen(true);
    fetchTimeSlots(table.id, selectedDate);
  };

  const clearFilters = () => {
    setZoneFilter(null);
    setStatusFilter(null);
    setCapacityFilter(undefined);
    setNameSearch('');
  };

  const hasActiveFilters = zoneFilter || statusFilter || capacityFilter !== undefined || nameSearch;

  if (isLoading) {
    return (
      <Box p="xl">
        <Title order={2} mb="xl">
          {t('tables.title', 'Tables')}
        </Title>
        <Center h={200}>
          <Loader size="lg" />
        </Center>
      </Box>
    );
  }

  return (
    <Box p="xl">
      <Stack gap="lg">
        <Group justify="space-between">
          <Title order={2}>{t('tables.title', 'Tables')}</Title>
          <Group>
            <Button leftSection={<IconPlus size={16} />} onClick={() => handleOpenModal()}>
              {t('tables.newTable', 'New Table')}
            </Button>
          </Group>
        </Group>

        {/* Advanced Filters */}
        <Card withBorder>
          <Stack gap="md">
            <Group justify="space-between">
              <Text size="sm" fw={600}>
                <IconFilter size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                {t('common.filters', 'Filters')}
              </Text>
              {hasActiveFilters && (
                <Button variant="subtle" size="xs" onClick={clearFilters}>
                  {t('common.clearFilters', 'Clear all')}
                </Button>
              )}
            </Group>

            {/* Search Box - Own Row */}
            <TextInput
              placeholder={t('tables.searchByName', 'Search by table name...')}
              leftSection={<IconSearch size={16} />}
              value={nameSearch}
              onChange={(e) => setNameSearch(e.currentTarget.value)}
            />

            <Grid>
              <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                <Select
                  label={t('tables.zone', 'Zone')}
                  placeholder={t('common.all', 'All zones')}
                  value={zoneFilter}
                  onChange={setZoneFilter}
                  clearable
                  data={
                    zones?.map((z: any) => ({
                      value: z.id,
                      label: z.name,
                    })) || []
                  }
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                <Select
                  label={t('tables.status', 'Status')}
                  placeholder={t('common.all', 'All')}
                  value={statusFilter}
                  onChange={setStatusFilter}
                  clearable
                  data={[
                    { value: 'onService', label: t('tables.onService', 'On service') },
                    { value: 'offService', label: t('tables.offService', 'Off service') },
                  ]}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                <NumberInput
                  label={t('tables.capacity', 'Capacity')}
                  placeholder={t('common.all', 'All')}
                  value={capacityFilter}
                  onChange={(value) =>
                    setCapacityFilter(typeof value === 'number' ? value : undefined)
                  }
                  min={1}
                />
              </Grid.Col>
            </Grid>
          </Stack>
        </Card>

        {/* Tables Display */}
        {!filteredTables || filteredTables.length === 0 ? (
          <Card withBorder>
            <Text ta="center" c="dimmed" py="xl">
              {t('tables.noTables', 'No tables found')}
            </Text>
          </Card>
        ) : (
          <Card withBorder>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('tables.name', 'Name')}</Table.Th>
                  <Table.Th>{t('tables.type', 'Type')}</Table.Th>
                  <Table.Th>{t('tables.capacity', 'Capacity')}</Table.Th>
                  <Table.Th>{t('tables.zone', 'Zone')}</Table.Th>
                  <Table.Th>{t('tables.status', 'Statut')}</Table.Th>
                  <Table.Th>{t('common.actions', 'Actions')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredTables.map((table: any) => (
                  <Table.Tr key={table.id}>
                    <Table.Td>
                      <Text fw={600}>{table.name}</Text>
                      {table.description && (
                        <Text size="xs" c="dimmed">
                          {table.description}
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        {getTableTypeIcon(table.type || 'table')}
                        <Text size="sm" tt="capitalize">
                          {table.type === 'parasol'
                            ? t('tables.typeParasol', 'Parasol')
                            : table.type === 'hut'
                              ? t('tables.typeHut', 'Cabane')
                              : t('tables.typeTable', 'Table')}
                        </Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light">
                        {table.min_capacity}-{table.max_capacity}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{table.zone?.name || '-'}</Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <ThemeIcon
                          size="sm"
                          color={table.is_on_service ? 'green' : 'red'}
                          variant="light"
                        >
                          {table.is_on_service ? <IconCheck size={16} /> : <IconX size={16} />}
                        </ThemeIcon>
                        <Text size="sm" c={table.is_on_service ? 'green' : 'red'}>
                          {table.is_on_service
                            ? t('tables.onService', 'On service')
                            : t('tables.offService', 'Off service')}
                        </Text>
                      </Group>
                    </Table.Td>
                    <Table.Td onClick={(e) => e.stopPropagation()}>
                      <Group gap="xs">
                        <Tooltip label={t('common.edit', 'Edit')}>
                          <ActionIcon
                            variant="light"
                            color="blue"
                            onClick={() => handleOpenModal(table)}
                          >
                            <IconPencil size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label={t('common.delete', 'Delete')}>
                          <ActionIcon
                            variant="light"
                            color="red"
                            onClick={() => handleDelete(table.id, table.name)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Card>
        )}
      </Stack>

      {/* Create/Edit Modal */}
      <Modal
        opened={opened}
        onClose={close}
        title={
          editingTable ? t('tables.editTable', 'Edit Table') : t('tables.newTable', 'New Table')
        }
        size="lg"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput
              label={t('tables.name', 'Table Name')}
              placeholder={t('tables.namePlaceholder', 'e.g., Table 1, Parasol A')}
              required
              {...form.getInputProps('name')}
            />

            <Textarea
              label={t('tables.description', 'Description')}
              placeholder={t('tables.descriptionPlaceholder', 'Optional description...')}
              rows={3}
              {...form.getInputProps('description')}
            />

            <Select
              label={t('tables.type', 'Type')}
              data={[
                { value: 'table', label: t('tables.typeTable', 'Table') },
                { value: 'parasol', label: t('tables.typeParasol', 'Parasol') },
                { value: 'hut', label: t('tables.typeHut', 'Hut') },
              ]}
              renderOption={({ option, checked }) => (
                <Group flex="1" gap="xs">
                  {getTableTypeIcon(option.value)}
                  {option.label}
                  {checked && <IconCheck style={{ marginInlineStart: 'auto' }} size={16} />}
                </Group>
              )}
              {...form.getInputProps('type')}
            />

            <Grid>
              <Grid.Col span={6}>
                <NumberInput
                  label={t('tables.minCapacity', 'Minimum Capacity')}
                  placeholder="2"
                  min={1}
                  required
                  {...form.getInputProps('min_capacity')}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <NumberInput
                  label={t('tables.maxCapacity', 'Maximum Capacity')}
                  placeholder="4"
                  min={1}
                  required
                  {...form.getInputProps('max_capacity')}
                />
              </Grid.Col>
            </Grid>

            <Select
              label={t('tables.zone', 'Zone')}
              placeholder={t('tables.selectZone', 'Select a zone')}
              data={
                zones?.map((z: any) => ({
                  value: z.id,
                  label: z.name,
                })) || []
              }
              clearable
              {...form.getInputProps('zone_id')}
            />

            <Switch
              label={t('tables.onService', 'On service')}
              checked={form.values.is_on_service}
              onChange={(event) => form.setFieldValue('is_on_service', event.currentTarget.checked)}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="light" onClick={close}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
                {editingTable ? t('common.update', 'Update') : t('common.create', 'Create')}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Time Slots Modal */}
      <Modal
        opened={timeSlotsModalOpen}
        onClose={() => setTimeSlotsModalOpen(false)}
        title={
          <Group>
            <IconClock size={20} />
            <Text>
              {t('tables.timeSlots', 'Time Slots')} - {selectedTableForSlots?.name}
            </Text>
          </Group>
        }
        size="lg"
      >
        <Stack>
          <DatePickerInput
            label={t('common.selectDate', 'Select Date')}
            value={selectedDate}
            onChange={(date) => {
              const dateValue = date as Date | null;
              if (dateValue) {
                setSelectedDate(dateValue);
                if (selectedTableForSlots) {
                  fetchTimeSlots(selectedTableForSlots.id, dateValue);
                }
              }
            }}
          />

          {loadingSlots ? (
            <Center h={200}>
              <Loader />
            </Center>
          ) : timeSlots.length === 0 ? (
            <Text c="dimmed" ta="center" py="xl">
              {t('tables.noTimeSlots', 'No time slots available for this date')}
            </Text>
          ) : (
            <ScrollArea h={400}>
              <Timeline active={-1} bulletSize={24} lineWidth={2}>
                {timeSlots.map((slot, index) => (
                  <Timeline.Item
                    key={index}
                    bullet={
                      slot.status === 'available' ? <IconCheck size={12} /> : <IconX size={12} />
                    }
                    title={
                      <Group justify="space-between">
                        <Text fw={500}>{slot.time}</Text>
                        <Badge color={slot.status === 'available' ? 'green' : 'red'}>
                          {slot.status === 'available'
                            ? t('tables.available', 'Available')
                            : t('tables.occupied', 'Occupied')}
                        </Badge>
                      </Group>
                    }
                  >
                    {slot.reservation && (
                      <Paper p="xs" withBorder mt="xs">
                        <Stack gap={4}>
                          <Text size="sm" fw={500}>
                            {slot.reservation?.reference || ''}
                          </Text>
                          <Text size="sm" c="dimmed">
                            {slot.reservation?.client_name || ''}
                          </Text>
                          <Text size="sm" c="dimmed">
                            {slot.reservation?.guests || 0} {t('reservations.guests', 'guests')}
                          </Text>
                        </Stack>
                      </Paper>
                    )}
                  </Timeline.Item>
                ))}
              </Timeline>
            </ScrollArea>
          )}
        </Stack>
      </Modal>
    </Box>
  );
}
