import { Title, Text, TextInput, PasswordInput, Container, Box, Stack, Paper } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { useStaffLoginApiStaffAuthLoginPost } from '@/api/generated/authentication/authentication';
import { useTranslation } from 'react-i18next';
import { ModernButton, GradientText } from '@/components';
import { IconArrowRight } from '@tabler/icons-react';
import { motion } from 'framer-motion';

interface LoginForm {
  email: string;
  password: string;
}

export function LoginPage() {
  const { t } = useTranslation();
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const form = useForm<LoginForm>({
    initialValues: { email: '', password: '' },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Email invalide'),
      password: (value) =>
        value.length >= 6 ? null : 'Le mot de passe doit contenir au moins 6 caractères',
    },
  });

  const loginMutation = useStaffLoginApiStaffAuthLoginPost({
    mutation: {
      onSuccess: (data) => {
        setAuth(data.access_token, data.refresh_token, data.user, data.expires_at);
        notifications.show({
          title: t('common.success'),
          message: t('auth.loginSuccess'),
          color: 'blue',
        });
        navigate('/');
      },
      onError: (error: any) => {
        const errorMessage = error?.response?.data?.detail || t('auth.loginError');
        notifications.show({ title: t('common.error'), message: errorMessage, color: 'red' });
      },
    },
  });

  const handleSubmit = async (values: LoginForm) => {
    loginMutation.mutate({ data: values });
  };

  return (
    <Box
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#FAFAFA',
        padding: '48px 24px',
      }}
    >
      <Container size={480}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <Stack gap={48}>
            <Box style={{ textAlign: 'center' }}>
              <Title
                order={1}
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(2.5rem, 6vw, 3.5rem)',
                  lineHeight: 1.05,
                  letterSpacing: '-0.02em',
                  marginBottom: 16,
                }}
              >
                Bienvenue sur <GradientText>SpotPass</GradientText>
              </Title>
              <Text size="lg" c="dimmed">
                Connectez-vous pour gérer vos réservations de restaurant
              </Text>
            </Box>

            <Paper shadow="xl" p={40} radius="xl" style={{ border: '1px solid #E2E8F0' }}>
              <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack gap="lg">
                  <TextInput
                    label="Adresse e-mail"
                    placeholder="vous@restaurant.fr"
                    required
                    {...form.getInputProps('email')}
                  />
                  <PasswordInput
                    label="Mot de passe"
                    placeholder="Entrez votre mot de passe"
                    required
                    {...form.getInputProps('password')}
                  />
                  <ModernButton
                    fullWidth
                    type="submit"
                    gradient
                    loading={loginMutation.isPending}
                    rightSection={<IconArrowRight size={18} />}
                    mt="md"
                  >
                    Se connecter
                  </ModernButton>
                </Stack>
              </form>
            </Paper>

            <Text
              size="xs"
              c="dimmed"
              ta="center"
              style={{
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              © 2026 SpotPass
            </Text>
          </Stack>
        </motion.div>
      </Container>
    </Box>
  );
}
