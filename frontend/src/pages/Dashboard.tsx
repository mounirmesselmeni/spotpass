import { SimpleGrid, Card, Text, Group, ThemeIcon, Box, Title, Stack, Badge } from '@mantine/core';
import {
  IconUsers,
  IconTable,
  IconCalendar,
  IconClock,
  IconCalendarTime,
  IconCalendarCheck,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useGetDashboardStatsApiStaffAuthDashboardStatsGet } from '@/api/generated/authentication/authentication';

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  return (
    <Card padding="lg" radius="md" withBorder>
      <Group justify="apart">
        <div>
          <Text size="xs" color="dimmed" fw={700} tt="uppercase">
            {title}
          </Text>
          <Text fw={700} size="xl" mt="xs">
            {value}
          </Text>
        </div>
        <ThemeIcon color={color} variant="light" size={48} radius="md">
          {icon}
        </ThemeIcon>
      </Group>
    </Card>
  );
}

export function DashboardPage() {
  const { t } = useTranslation();
  const { data: stats, isLoading } = useGetDashboardStatsApiStaffAuthDashboardStatsGet();

  if (isLoading) {
    return (
      <Box p="xl">
        <Title order={1} mb="xl">
          {t('dashboard.title')}
        </Title>
        <Text>{t('common.loading')}</Text>
      </Box>
    );
  }

  return (
    <Box p="xl">
      <Stack gap="xl">
        <Group justify="space-between" align="center">
          <div>
            <Title order={1} mb="xs">
              {t('dashboard.title')}
            </Title>
            <Text size="lg" c="dimmed">
              {t('dashboard.welcome')}
            </Text>
          </div>
          <Badge size="xl" variant="gradient" gradient={{ from: 'brand', to: 'cyan' }}>
            {t('app.name')}
          </Badge>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          <StatCard
            title={t('dashboard.stats.totalClients')}
            value={stats?.total_clients || 0}
            icon={<IconUsers size={24} />}
            color="blue"
          />
          <StatCard
            title={t('dashboard.stats.totalTables')}
            value={stats?.total_tables || 0}
            icon={<IconTable size={24} />}
            color="grape"
          />
          <StatCard
            title={t('dashboard.stats.totalReservations')}
            value={stats?.total_reservations || 0}
            icon={<IconCalendar size={24} />}
            color="teal"
          />
          <StatCard
            title={t('dashboard.stats.pendingReservations')}
            value={stats?.pending_reservations || 0}
            icon={<IconClock size={24} />}
            color="orange"
          />
          <StatCard
            title={t('dashboard.stats.todaysReservations')}
            value={stats?.todays_reservations || 0}
            icon={<IconCalendarTime size={24} />}
            color="green"
          />
          <StatCard
            title={t('dashboard.stats.upcomingReservations')}
            value={stats?.upcoming_reservations || 0}
            icon={<IconCalendarCheck size={24} />}
            color="cyan"
          />
        </SimpleGrid>
      </Stack>
    </Box>
  );
}
