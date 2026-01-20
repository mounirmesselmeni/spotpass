import { useState } from 'react';
import {
  Modal,
  Stepper,
  Button,
  Group,
  NumberInput,
  Textarea,
  Select,
  Stack,
  Text,
  Paper,
  Badge,
  Grid,
  Card,
  Title,
  LoadingOverlay,
  Alert,
} from '@mantine/core';
import { DatePickerInput, TimeInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import { IconCheck, IconClock, IconUsers, IconCalendar, IconInfoCircle } from '@tabler/icons-react';
import { useListClientsApiStaffClientsGet } from '@/api/generated/staff-clients/staff-clients';
import {
  useCreateReservationApiStaffReservationsPost,
  useGetAvailableTablesApiStaffReservationsAvailableTablesPost,
} from '@/api/generated/staff-reservations/staff-reservations';

interface ReservationWizardProps {
  opened: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ReservationWizard({ opened, onClose, onSuccess }: ReservationWizardProps) {
  const { t } = useTranslation();
  const [active, setActive] = useState(0);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  const form = useForm({
    initialValues: {
      client_id: '',
      reservation_date: new Date(),
      reservation_time: '',
      number_of_guests: 2,
      special_request: '',
      table_id: null as number | null,
    },
    validate: {
      client_id: (value) => (!value ? t('reservations.selectClientRequired') : null),
      reservation_date: (value) => (!value ? t('reservations.dateRequired') : null),
      reservation_time: (value) => (!value ? t('reservations.dateRequired') : null),
      number_of_guests: (value) => (value < 1 ? t('reservations.guestsMin') : null),
    },
  });

  const { data: clients, isLoading: loadingClients } = useListClientsApiStaffClientsGet();

  const reservationDateTime =
    form.values.reservation_date && form.values.reservation_time
      ? `${form.values.reservation_date.toISOString().split('T')[0]}T${form.values.reservation_time}:00`
      : undefined;

  const availableTablesMutation = useGetAvailableTablesApiStaffReservationsAvailableTablesPost();

  // Trigger mutation when needed
  const loadingTables = availableTablesMutation.isPending;
  const availableTables = availableTablesMutation.data;

  // Effect to load tables when step 2 is complete
  if (
    active === 2 &&
    reservationDateTime &&
    form.values.reservation_date &&
    !availableTablesMutation.isPending &&
    !availableTablesMutation.data
  ) {
    availableTablesMutation.mutate({
      data: {
        reservation_date: form.values.reservation_date.toISOString().split('T')[0],
        reservation_time: reservationDateTime,
        number_of_guests: form.values.number_of_guests,
      },
    });
  }

  const createReservationMutation = useCreateReservationApiStaffReservationsPost();

  const handleNext = () => {
    if (active === 0) {
      const errors = form.validateField('client_id');
      if (!errors.hasError) {
        setActive(1);
      }
    } else if (active === 1) {
      const dateErrors = form.validateField('reservation_date');
      const timeErrors = form.validateField('reservation_time');
      const guestsErrors = form.validateField('number_of_guests');
      if (!dateErrors.hasError && !timeErrors.hasError && !guestsErrors.hasError) {
        setActive(2);
      }
    } else if (active === 2 && selectedTable) {
      handleSubmit();
    }
  };

  const handleBack = () => {
    setActive((current) => (current > 0 ? current - 1 : current));
  };

  const handleSubmit = async () => {
    try {
      // Ensure reservation_time is in HH:MM:SS format
      let timeValue = form.values.reservation_time;
      // If time doesn't have seconds, add them
      if (timeValue && !timeValue.includes(':00:')) {
        timeValue = timeValue.length === 5 ? `${timeValue}:00` : timeValue;
      }

      await createReservationMutation.mutateAsync({
        data: {
          client_id: form.values.client_id,
          reservation_date: form.values.reservation_date.toISOString().split('T')[0],
          reservation_time: timeValue, // Format: HH:MM:SS
          number_of_guests: form.values.number_of_guests,
          special_request: form.values.special_request || undefined,
          table_id: selectedTable!,
        },
      });

      notifications.show({
        title: t('common.success'),
        message: t('reservations.createdSuccessfully'),
        color: 'green',
        icon: <IconCheck size={16} />,
      });

      form.reset();
      setActive(0);
      setSelectedTable(null);
      onClose();
      onSuccess?.();
    } catch (error) {
      notifications.show({
        title: t('common.error'),
        message: t('reservations.createError'),
        color: 'red',
      });
    }
  };

  const handleClose = () => {
    form.reset();
    setActive(0);
    setSelectedTable(null);
    onClose();
  };

  const clientOptions =
    clients?.map((client: any) => ({
      value: client.uuid || String(client.id),
      label: `${client.full_name} - ${client.phone_number}`,
    })) || [];

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap="xs">
          <IconCalendar size={20} aria-hidden="true" />
          <Text fw={600}>{t('reservations.newReservation')}</Text>
        </Group>
      }
      size="xl"
      padding="lg"
      aria-label={t('reservations.newReservation')}
    >
      <LoadingOverlay visible={createReservationMutation.isPending} />

      <Stepper
        active={active}
        onStepClick={setActive}
        aria-label="Étapes de création de réservation"
      >
        {/* Step 1: Select Client */}
        <Stepper.Step
          label={t('clients.client')}
          description={t('clients.selectClient')}
          icon={<IconUsers size={18} aria-hidden="true" />}
          aria-label="Étape 1: Sélectionner un client"
        >
          <Stack gap="md" mt="xl">
            <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
              {t('reservations.selectClientRequired')}
            </Alert>

            <Select
              label={t('clients.client')}
              placeholder={t('reservations.searchClient')}
              data={clientOptions}
              searchable
              nothingFoundMessage={t('clients.noClients')}
              {...form.getInputProps('client_id')}
              disabled={loadingClients}
              size="md"
              required
            />

            {form.values.client_id && (
              <Card withBorder bg="blue.0">
                <Group>
                  <IconCheck size={20} color="green" />
                  <Text size="sm" c="dimmed">
                    {clientOptions.find((c: any) => c.value === form.values.client_id)?.label}
                  </Text>
                </Group>
              </Card>
            )}
          </Stack>
        </Stepper.Step>

        {/* Step 2: Date, Time & Guests */}
        <Stepper.Step
          label={t('reservations.date')}
          description={t('reservations.selectDate')}
          icon={<IconClock size={18} aria-hidden="true" />}
          aria-label="Étape 2: Sélectionner la date et l'heure"
        >
          <Stack gap="md" mt="xl">
            <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
              Sélectionnez la date, l'heure et le nombre de convives
            </Alert>

            <Grid>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <DatePickerInput
                  label={t('reservations.date')}
                  placeholder={t('common.selectDate')}
                  minDate={new Date()}
                  {...form.getInputProps('reservation_date')}
                  size="md"
                  required
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TimeInput
                  label={t('reservations.time')}
                  {...form.getInputProps('reservation_time')}
                  size="md"
                  required
                />
              </Grid.Col>
            </Grid>

            <NumberInput
              label={t('reservations.guests')}
              placeholder="2"
              min={1}
              max={20}
              {...form.getInputProps('number_of_guests')}
              size="md"
              required
              leftSection={<IconUsers size={18} />}
            />

            <Textarea
              label={t('reservations.specialRequest')}
              placeholder={t('reservations.specialRequestPlaceholder')}
              {...form.getInputProps('special_request')}
              rows={3}
              size="md"
            />

            {form.values.reservation_date && form.values.reservation_time && (
              <Card withBorder bg="green.0">
                <Stack gap="xs">
                  <Group gap="xs">
                    <IconCheck size={20} color="green" />
                    <Text size="sm" fw={500}>
                      Détails de la réservation
                    </Text>
                  </Group>
                  <Text size="sm" c="dimmed">
                    {form.values.reservation_date.toLocaleDateString('fr-FR')} à{' '}
                    {form.values.reservation_time}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {form.values.number_of_guests}{' '}
                    {form.values.number_of_guests > 1 ? 'convives' : 'convive'}
                  </Text>
                </Stack>
              </Card>
            )}
          </Stack>
        </Stepper.Step>

        {/* Step 3: Select Table */}
        <Stepper.Step
          label={t('reservations.table')}
          description={t('reservations.selectTable')}
          icon={<IconCalendar size={18} aria-hidden="true" />}
          aria-label="Étape 3: Sélectionner une table"
        >
          <Stack gap="md" mt="xl">
            <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
              Sélectionnez une table disponible pour cette réservation
            </Alert>

            {loadingTables ? (
              <Text ta="center" c="dimmed">
                {t('common.loading')}
              </Text>
            ) : availableTables && availableTables.length > 0 ? (
              <Grid>
                {availableTables.map((table: any) => (
                  <Grid.Col key={table.id} span={{ base: 12, sm: 6, md: 4 }}>
                    <Card
                      withBorder
                      padding="md"
                      style={{
                        cursor: 'pointer',
                        border:
                          selectedTable === table.id?.toString()
                            ? '2px solid var(--mantine-color-blue-6)'
                            : undefined,
                        backgroundColor:
                          selectedTable === table.id?.toString()
                            ? 'var(--mantine-color-blue-0)'
                            : undefined,
                      }}
                      onClick={() => setSelectedTable(table.id?.toString() || null)}
                    >
                      <Stack gap="xs">
                        <Group justify="space-between">
                          <Text fw={600} size="lg">
                            {table.name}
                          </Text>
                          {selectedTable === table.id?.toString() && (
                            <Badge color="blue" variant="filled">
                              {t('common.selected')}
                            </Badge>
                          )}
                        </Group>
                        <Text size="sm" c="dimmed">
                          {table.zone?.name || t('tables.noZone')}
                        </Text>
                        <Group gap="xs">
                          <Badge variant="light">
                            {table.min_capacity}-{table.max_capacity} {t('reservations.guests')}
                          </Badge>
                          <Badge color="green" variant="light">
                            {t('tables.available')}
                          </Badge>
                        </Group>
                      </Stack>
                    </Card>
                  </Grid.Col>
                ))}
              </Grid>
            ) : (
              <Paper p="xl" withBorder>
                <Text ta="center" c="dimmed">
                  {t('tables.noAvailable')}
                </Text>
              </Paper>
            )}
          </Stack>
        </Stepper.Step>

        <Stepper.Completed>
          <Stack gap="md" mt="xl" align="center">
            <IconCheck size={64} color="green" />
            <Title order={3}>{t('reservations.createdSuccessfully')}</Title>
          </Stack>
        </Stepper.Completed>
      </Stepper>

      <Group justify="space-between" mt="xl">
        {active > 0 && active < 3 && (
          <Button variant="default" onClick={handleBack}>
            {t('common.back')}
          </Button>
        )}
        {active < 2 && (
          <Button onClick={handleNext} ml="auto">
            Suivant
          </Button>
        )}
        {active === 2 && (
          <Button
            onClick={handleNext}
            ml="auto"
            disabled={!selectedTable}
            loading={createReservationMutation.isPending}
          >
            {t('reservations.createReservation')}
          </Button>
        )}
      </Group>
    </Modal>
  );
}
