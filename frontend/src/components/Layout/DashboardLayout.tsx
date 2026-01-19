import {
  AppShell,
  Burger,
  Group,
  Title,
  ActionIcon,
  useMantineColorScheme,
  Avatar,
  Menu,
  Text,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconSun,
  IconMoon,
  IconLogout,
  IconCalendar,
  IconUsers,
  IconTable,
  IconLayoutGrid,
  IconUser,
  IconDashboard,
} from '@tabler/icons-react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { NavLink } from '@mantine/core';

const navigation = [
  { label: 'Dashboard', icon: IconDashboard, path: '/' },
  { label: 'Reservations', icon: IconCalendar, path: '/reservations' },
  { label: 'Clients', icon: IconUsers, path: '/clients' },
  { label: 'Tables', icon: IconTable, path: '/tables' },
  { label: 'Zones', icon: IconLayoutGrid, path: '/zones' },
  { label: 'Users', icon: IconUser, path: '/users' },
];

export function DashboardLayout() {
  const [opened, { toggle, close }] = useDisclosure();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    close();
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 280,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Title order={3}>ServeMe</Title>
          </Group>

          <Group>
            <ActionIcon
              variant="default"
              onClick={toggleColorScheme}
              size="lg"
              aria-label="Toggle color scheme"
            >
              {colorScheme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
            </ActionIcon>

            <Menu shadow="md" width={200}>
              <Menu.Target>
                <ActionIcon variant="default" size="lg" radius="xl">
                  <Avatar size="sm" radius="xl">
                    {user?.full_name?.charAt(0) || 'U'}
                  </Avatar>
                </ActionIcon>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>
                  <Text size="sm" fw={500}>
                    {user?.full_name || 'User'}
                  </Text>
                </Menu.Label>
                <Menu.Divider />
                <Menu.Item
                  color="red"
                  leftSection={<IconLogout size={16} />}
                  onClick={handleLogout}
                >
                  Logout
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        {navigation.map((item) => (
          <NavLink
            key={item.path}
            active={location.pathname === item.path}
            label={item.label}
            leftSection={<item.icon size={20} stroke={1.5} />}
            onClick={() => handleNavClick(item.path)}
            mb="xs"
          />
        ))}
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
