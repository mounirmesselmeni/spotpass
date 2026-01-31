import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { useThemeStore } from './stores/theme.store';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useLanguageStore } from './stores/language.store';
import { theme } from './theme';
import './i18n/config';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dates/styles.css';
import '/fonts.css';
import './styles/design-system.css';

// Import French locale for dates
import 'dayjs/locale/fr';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

export function Root() {
  const { colorScheme } = useThemeStore();

  return (
    <React.StrictMode>
      <MantineProvider defaultColorScheme={colorScheme} theme={theme}>
        <DatesProvider settings={{ locale: 'fr', firstDayOfWeek: 1 }}>
          <ModalsProvider>
            <Notifications position="top-right" />
            <QueryClientProvider client={queryClient}>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </QueryClientProvider>
          </ModalsProvider>
        </DatesProvider>
      </MantineProvider>
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Root />);
