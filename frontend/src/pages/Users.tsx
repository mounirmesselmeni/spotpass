import { Stack, Title, Card, Text } from '@mantine/core';

export function UsersPage() {
  return (
    <Stack gap="lg">
      <Title order={2}>Users</Title>
      <Card withBorder>
        <Text c="dimmed">User management coming soon...</Text>
      </Card>
    </Stack>
  );
}
