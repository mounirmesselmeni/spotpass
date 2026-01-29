import { TableAvailabilityGrid } from '@/components/TableAvailabilityGrid';
import { Box, Card, Group, NumberInput, Stack, Text, Title } from '@mantine/core';
import { DatePickerInput, TimeInput } from '@mantine/dates';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export function TableAvailabilityPage() {
  const { t } = useTranslation();

  // Availability filters
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('19:00');
  const [guestCount, setGuestCount] = useState<number>(2);

  return (
    <Box p="xl">
      <Stack gap="lg">
        <Title order={2}>{t('tables.occupation', 'Availability')}</Title>

        {/* Availability Filters */}
        <Card withBorder>
          <Stack gap="md">
            <Text size="sm" fw={600}>
              {t('tables.checkAvailability', 'Vérifier la disponibilité')}
            </Text>

            <Group grow>
              <DatePickerInput
                label={t('common.date', 'Date')}
                placeholder={t('common.selectDate', 'Sélectionner une date')}
                value={selectedDate}
                onChange={(value) => setSelectedDate(value as Date | null)}
                minDate={new Date()}
              />

              <TimeInput
                label={t('common.time', 'Heure')}
                placeholder="19:00"
                value={selectedTime}
                onChange={(event) => setSelectedTime(event.currentTarget.value)}
              />

              <NumberInput
                label={t('tables.capacity', 'Capacité')}
                placeholder={t('reservations.guestsMin', 'Au moins 1 invité')}
                value={guestCount}
                onChange={(value) => setGuestCount(Number(value) || 1)}
                min={1}
                max={20}
              />
            </Group>
          </Stack>
        </Card>

        {/* Availability Grid */}
        <TableAvailabilityGrid
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          guestCount={guestCount}
        />
      </Stack>
    </Box>
  );
}
