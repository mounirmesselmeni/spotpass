import { SimpleGrid, Text, Group, Box, Stack, Loader, Center, Title } from '@mantine/core';
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
import { ModernCard, GradientText, SectionBadge } from '@/components';
import { motion } from 'framer-motion';

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  delay?: number;
}

function StatCard({ title, value, icon, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
    >
      <ModernCard padding="xl">
        <Stack gap="lg">
          <Group justify="space-between" align="center">
            <Box
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #0052FF, #4D7CFF)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
              }}
            >
              {icon}
            </Box>
            <Text
              size="xs"
              c="dimmed"
              fw={600}
              tt="uppercase"
              style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}
            >
              {title}
            </Text>
          </Group>
          <Text
            size="xl"
            fw={700}
            style={{ fontSize: 42, fontFamily: 'var(--font-display)', lineHeight: 1 }}
          >
            {value.toLocaleString()}
          </Text>
        </Stack>
      </ModernCard>
    </motion.div>
  );
}

export function DashboardPage() {
  const { t } = useTranslation();
  const { data: statsResponse, isLoading } = useGetDashboardStatsApiStaffAuthDashboardStatsGet();
  const stats = statsResponse?.data;

  if (isLoading) {
    return (
      <Center h="50vh">
        <Stack align="center" gap="md">
          <Loader size="lg" color="#0052FF" />
          <Text c="dimmed">{t('common.loading')}</Text>
        </Stack>
      </Center>
    );
  }

  return (
    <Box style={{ padding: 48, maxWidth: 1400, margin: '0 auto' }}>
      <Stack gap={64}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <Stack gap="lg">
            <SectionBadge pulse>{t('dashboard.overview')}</SectionBadge>
            <Title
              order={1}
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2rem, 4vw, 3.25rem)',
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
              }}
            >
              {t('dashboard.title')}, <GradientText>{t('dashboard.welcomeBack')}</GradientText>
            </Title>
            <Text size="lg" c="dimmed" style={{ maxWidth: 600 }}>
              {t('dashboard.welcome')}
            </Text>
          </Stack>
        </motion.div>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          <StatCard
            title={t('dashboard.stats.totalClients')}
            value={stats?.total_clients || 0}
            icon={<IconUsers size={24} />}
            delay={0.1}
          />
          <StatCard
            title={t('dashboard.stats.totalTables')}
            value={stats?.total_tables || 0}
            icon={<IconTable size={24} />}
            delay={0.2}
          />
          <StatCard
            title={t('dashboard.stats.totalReservations')}
            value={stats?.total_reservations || 0}
            icon={<IconCalendar size={24} />}
            delay={0.3}
          />
          <StatCard
            title={t('dashboard.stats.pendingReservations')}
            value={stats?.pending_reservations || 0}
            icon={<IconClock size={24} />}
            delay={0.4}
          />
          <StatCard
            title={t('dashboard.stats.todaysReservations')}
            value={stats?.todays_reservations || 0}
            icon={<IconCalendarTime size={24} />}
            delay={0.5}
          />
          <StatCard
            title={t('dashboard.stats.upcomingReservations')}
            value={stats?.upcoming_reservations || 0}
            icon={<IconCalendarCheck size={24} />}
            delay={0.6}
          />
        </SimpleGrid>
      </Stack>
    </Box>
  );
}
