import { useAuthStore } from '@/stores/auth.store';
import { AppShell, Avatar, Box, Burger, Group, Image, Menu, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconCalendar,
  IconChevronDown,
  IconDashboard,
  IconLayoutGrid,
  IconLogout,
  IconTable,
  IconUsers,
} from '@tabler/icons-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';

const navigation = [
  { label: 'Dashboard', icon: IconDashboard, path: '/' },
  { label: 'Reservations', icon: IconCalendar, path: '/reservations' },
  { label: 'Clients', icon: IconUsers, path: '/clients' },
  { label: 'Tables', icon: IconTable, path: '/tables' },
  { label: 'Zones', icon: IconLayoutGrid, path: '/zones' },
];

export function DashboardLayout() {
  const [opened, { toggle, close }] = useDisclosure();
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
      header={{ height: 64 }}
      navbar={{
        width: 260,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="xl"
      style={{ background: '#FAFAFA' }}
    >
      <AppShell.Header
        style={{
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #E2E8F0',
        }}
      >
        <Group h="100%" px="xl" justify="space-between" wrap="nowrap">
          <Group gap="md" style={{ flexShrink: 0 }}>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" color="#0052FF" />
            <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
              <Image src="/spotpass.png" alt="SpotPass" h={155} />
            </Link>
          </Group>

          <Group gap="sm" style={{ flexShrink: 0 }}>
            <Menu shadow="xl" width={240} position="bottom-end">
              <Menu.Target>
                <Box
                  className="avatarContainer"
                  style={{
                    cursor: 'pointer',
                    borderRadius: '12px',
                    padding: '8px',
                    transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                >
                  <Group gap="xs" align="center">
                    <Avatar size="md" radius="xl" className="avatar">
                      {user?.full_name?.charAt(0) || 'U'}
                    </Avatar>
                    <IconChevronDown size={16} strokeWidth={2} className="avatarChevron" />
                  </Group>
                </Box>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>
                  <Text size="sm" fw={600}>
                    {user?.full_name || 'User'}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {user?.email || ''}
                  </Text>
                </Menu.Label>
                <Menu.Divider />
                <Menu.Item
                  leftSection={<IconLogout size={16} />}
                  onClick={handleLogout}
                  color="red"
                >
                  Logout
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md" style={{ background: '#FFFFFF', borderRight: '1px solid #E2E8F0' }}>
        <Box style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navigation.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Box
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                style={{
                  padding: '12px 16px',
                  borderRadius: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(0,82,255,0.1), rgba(77,124,255,0.05))'
                    : 'transparent',
                  border: isActive ? '1px solid rgba(0,82,255,0.2)' : '1px solid transparent',
                  color: isActive ? '#0052FF' : '#64748B',
                  fontWeight: isActive ? 600 : 500,
                  transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <item.icon size={20} strokeWidth={1.5} />
                <Text size="sm">{item.label}</Text>
              </Box>
            );
          })}
        </Box>
      </AppShell.Navbar>

      <AppShell.Main style={{ background: '#FAFAFA' }}>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
