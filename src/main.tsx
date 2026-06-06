import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { ThemeProvider } from './components/ThemeProvider';
import { DecorativeBackgroundProvider } from './contexts/DecorativeBackgroundContext';
import { SidebarProvider } from './contexts/SidebarContext';
import { AuthProvider } from './contexts/AuthContext';
import { OnboardingProvider } from './contexts/OnboardingContext';
import { AdminImpersonationProvider } from './contexts/AdminImpersonationContext';
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
      // Données considérées fraîches 5 min → pas de refetch entre navigations
      staleTime: 5 * 60 * 1000,
      // Garder en cache 15 min après que le composant est démonté
      gcTime: 15 * 60 * 1000,
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
                <AdminImpersonationProvider>
                  <OnboardingProvider>
                    <App />
                  </OnboardingProvider>
                </AdminImpersonationProvider>
              </AuthProvider>
            </BrowserRouter>
          </SidebarProvider>
        </DecorativeBackgroundProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);
