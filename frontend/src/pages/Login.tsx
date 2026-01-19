// import { useState } from 'react'; // Removed - not needed with mutation
import {
  Paper,
  Title,
  Text,
  TextInput,
  PasswordInput,
  Button,
  Container,
  Box,
  Stack,
  Group,
  Checkbox,
  Anchor,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { useStaffLoginApiStaffAuthLoginPost } from '@/api/generated/authentication/authentication';
import { IconLogin } from '@tabler/icons-react';

interface LoginForm {
  email: string;
  password: string;
}

export function LoginPage() {
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const form = useForm<LoginForm>({
    initialValues: {
      email: '',
      password: '',
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Email invalide'),
      password: (value) => (value.length > 0 ? null : 'Le mot de passe est requis'),
    },
  });

  const loginMutation = useStaffLoginApiStaffAuthLoginPost({
    mutation: {
      onSuccess: (data) => {
        // Store tokens and user info with new JWT structure
        setAuth(data.access_token, data.refresh_token, data.user, data.expires_at);

        // Store user type for refresh token logic
        localStorage.setItem('user_type', data.user.user_type);
        localStorage.setItem('token_expires_at', data.expires_at);

        notifications.show({
          title: 'Succès',
          message: `Bienvenue, ${data.user.full_name}!`,
          color: 'green',
        });

        navigate('/');
      },
      onError: (error: unknown) => {
        const errorMessage =
          (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
          'Identifiants invalides';
        notifications.show({
          title: 'Échec de la connexion',
          message: errorMessage,
          color: 'red',
        });
      },
    },
  });

  const handleSubmit = async (values: LoginForm) => {
    loginMutation.mutate({
      data: values,
    });
  };

  return (
    <Box
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--mantine-color-gray-0)',
      }}
    >
      <Container size={800} my={40}>
        <Title ta="center">Bienvenue !</Title>

        <Text c="dimmed" size="sm" ta="center">
          Connectez-vous à votre compte SpotPass
        </Text>

        <Paper withBorder shadow="sm" p={22} mt={30} radius="md">
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack>
              <TextInput
                label="Email"
                placeholder="votre@email.com"
                required
                radius="md"
                {...form.getInputProps('email')}
              />

              <PasswordInput
                label="Mot de passe"
                placeholder="Votre mot de passe"
                required
                radius="md"
                {...form.getInputProps('password')}
              />

              <Button
                type="submit"
                fullWidth
                mt="xl"
                radius="md"
                loading={loginMutation.isPending}
                color="brand"
              >
                Se connecter
              </Button>
            </Stack>
          </form>
        </Paper>
      </Container>
    </Box>
  );
}
