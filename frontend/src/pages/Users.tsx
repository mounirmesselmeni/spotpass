import { Box, Text, Title } from '@mantine/core';
import { useTranslation } from 'react-i18next';

export function UsersPage() {
  const { t } = useTranslation();

  return (
    <Box p="xl">
      <Title order={1} mb="md">
        {t('users.title', 'Users')}
      </Title>
      <Text c="dimmed">{t('users.comingSoon', 'User management coming soon...')}</Text>
    </Box>
  );
}
