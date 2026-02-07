import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { ThemeProvider } from './components/ThemeProvider';
import { DecorativeBackgroundProvider } from './contexts/DecorativeBackgroundContext';
import { SidebarProvider } from './contexts/SidebarContext';
import { AuthProvider } from './contexts/AuthContext';
import { OnboardingProvider } from './contexts/OnboardingContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initEnv } from './lib/env';
import './index.css';

// Valider les variables d'environnement au démarrage
initEnv();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

createRoot(rootEl).render(
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="btp-smart-pro-theme">
        <DecorativeBackgroundProvider>
          <SidebarProvider>
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <AuthProvider>
                <OnboardingProvider>
                  <App />
                </OnboardingProvider>
              </AuthProvider>
            </BrowserRouter>
          </SidebarProvider>
        </DecorativeBackgroundProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);


