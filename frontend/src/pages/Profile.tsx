import { useAuthStore } from '@/stores/auth.store';
import { axios } from '@/api/mutator/custom-instance';
import { NOTIFICATION_SUCCESS, NOTIFICATION_ERROR } from '@/utils/colorConstants';
import {
  Avatar,
  Box,
  Button,
  Card,
  Divider,
  Group,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconUser, IconLock } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export function ProfilePage() {
  const { t } = useTranslation();
  const { user, setAuth, accessToken, refreshToken, expiresAt } = useAuthStore();
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const profileForm = useForm({
    initialValues: {
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      email: user?.email || '',
    },
    validate: {
      first_name: (v) => (v.length < 2 ? t('validation.tooShort') : null),
      last_name: (v) => (v.length < 2 ? t('validation.tooShort') : null),
      email: (v) => (/^\S+@\S+\.\S+$/.test(v) ? null : t('validation.invalidEmail')),
    },
  });

  const passwordForm = useForm({
    initialValues: {
      current_password: '',
      new_password: '',
      confirm_password: '',
    },
    validate: {
      current_password: (v) => (v.length < 1 ? t('validation.passwordRequired') : null),
      new_password: (v) => {
        if (v.length < 8) return t('validation.passwordTooShort');
        if (!/[A-Z]/.test(v))
          return t('profile.passwordUppercase', 'Must contain an uppercase letter');
        if (!/[a-z]/.test(v))
          return t('profile.passwordLowercase', 'Must contain a lowercase letter');
        if (!/[0-9]/.test(v)) return t('profile.passwordDigit', 'Must contain a number');
        return null;
      },
      confirm_password: (v, values) =>
        v !== values.new_password ? t('profile.passwordMismatch', 'Passwords do not match') : null,
    },
  });

  const handleProfileUpdate = async (values: typeof profileForm.values) => {
    setProfileLoading(true);
    try {
      const userType = user?.user_type || 'staff';
      const endpoint = userType === 'bo' ? '/api/bo/auth/me' : '/api/staff/auth/me';

      const response = await axios.put(endpoint, values);
      const updatedUser = response.data;

      if (accessToken && refreshToken && expiresAt) {
        setAuth(
          accessToken,
          refreshToken,
          {
            ...user!,
            first_name: updatedUser.first_name,
            last_name: updatedUser.last_name,
            email: updatedUser.email,
            full_name: `${updatedUser.first_name} ${updatedUser.last_name}`,
          },
          expiresAt
        );
      }

      notifications.show({
        title: t('common.success'),
        message: t('profile.profileUpdated', 'Profile updated successfully'),
        color: NOTIFICATION_SUCCESS,
        icon: <IconCheck size={16} />,
      });
    } catch (error: any) {
      const message =
        error?.response?.data?.detail || t('profile.updateError', 'Failed to update profile');
      notifications.show({
        title: t('common.error'),
        message,
        color: NOTIFICATION_ERROR,
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (values: typeof passwordForm.values) => {
    setPasswordLoading(true);
    try {
      const userType = user?.user_type || 'staff';
      const endpoint =
        userType === 'bo' ? '/api/bo/auth/change-password' : '/api/staff/auth/change-password';

      await axios.post(endpoint, {
        current_password: values.current_password,
        new_password: values.new_password,
      });

      passwordForm.reset();

      notifications.show({
        title: t('common.success'),
        message: t('profile.passwordChanged', 'Password changed successfully'),
        color: NOTIFICATION_SUCCESS,
        icon: <IconCheck size={16} />,
      });
    } catch (error: any) {
      const message =
        error?.response?.data?.detail ||
        t('profile.passwordChangeError', 'Failed to change password');
      notifications.show({
        title: t('common.error'),
        message,
        color: NOTIFICATION_ERROR,
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <Box p="xl">
      <Group mb="xl" gap="md">
        <Avatar size="xl" radius="xl" color="blue">
          {user?.full_name?.charAt(0) || 'U'}
        </Avatar>
        <Box>
          <Title order={2}>{user?.full_name || 'User'}</Title>
          <Text c="dimmed" size="sm">
            {user?.email}
          </Text>
          {user?.role && (
            <Text c="dimmed" size="xs" tt="capitalize">
              {user.role}
            </Text>
          )}
        </Box>
      </Group>

      <Stack gap="xl" maw={600}>
        {/* Profile Information */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group gap="xs" mb="md">
            <IconUser size={20} />
            <Title order={4}>{t('profile.personalInfo', 'Personal Information')}</Title>
          </Group>
          <Divider mb="md" />

          <form onSubmit={profileForm.onSubmit(handleProfileUpdate)}>
            <Stack gap="sm">
              <TextInput
                label={t('profile.firstName', 'First Name')}
                placeholder={t('profile.firstNamePlaceholder', 'Enter your first name')}
                {...profileForm.getInputProps('first_name')}
              />
              <TextInput
                label={t('profile.lastName', 'Last Name')}
                placeholder={t('profile.lastNamePlaceholder', 'Enter your last name')}
                {...profileForm.getInputProps('last_name')}
              />
              <TextInput
                label={t('profile.email', 'Email')}
                placeholder={t('profile.emailPlaceholder', 'Enter your email')}
                {...profileForm.getInputProps('email')}
              />
              <Group justify="flex-end" mt="sm">
                <Button type="submit" loading={profileLoading}>
                  {t('common.update')}
                </Button>
              </Group>
            </Stack>
          </form>
        </Card>

        {/* Password Change */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group gap="xs" mb="md">
            <IconLock size={20} />
            <Title order={4}>{t('profile.changePassword', 'Change Password')}</Title>
          </Group>
          <Divider mb="md" />

          <form onSubmit={passwordForm.onSubmit(handlePasswordChange)}>
            <Stack gap="sm">
              <PasswordInput
                label={t('profile.currentPassword', 'Current Password')}
                placeholder={t('profile.currentPasswordPlaceholder', 'Enter current password')}
                {...passwordForm.getInputProps('current_password')}
              />
              <PasswordInput
                label={t('profile.newPassword', 'New Password')}
                placeholder={t('profile.newPasswordPlaceholder', 'Enter new password')}
                description={t(
                  'profile.passwordRequirements',
                  'Min 8 characters, with uppercase, lowercase and number'
                )}
                {...passwordForm.getInputProps('new_password')}
              />
              <PasswordInput
                label={t('profile.confirmPassword', 'Confirm New Password')}
                placeholder={t('profile.confirmPasswordPlaceholder', 'Confirm new password')}
                {...passwordForm.getInputProps('confirm_password')}
              />
              <Group justify="flex-end" mt="sm">
                <Button type="submit" loading={passwordLoading}>
                  {t('profile.changePassword', 'Change Password')}
                </Button>
              </Group>
            </Stack>
          </form>
        </Card>
      </Stack>
    </Box>
  );
}
