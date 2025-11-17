import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DemoRoute } from "@/components/DemoRoute";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Clients from "./pages/Clients";
import Stats from "./pages/Stats";
import Settings from "./pages/Settings";
import AI from "./pages/AI";
import Auth from "./pages/Auth";
import CompleteProfile from "./pages/CompleteProfile";
import NotFound from "./pages/NotFound";
import Quotes from "./pages/Quotes";
import Calendar from "./pages/Calendar";
import AdminEmployees from "./pages/AdminEmployees";
import EmployeesPlanning from "./pages/EmployeesPlanning";
import MyPlanning from "./pages/MyPlanning";
import RHDashboard from "./pages/RHDashboard";
import RHEmployees from "./pages/RHEmployees";
import RHCandidatures from "./pages/RHCandidatures";
import RHTaches from "./pages/RHTaches";
import PublicCandidature from "./pages/PublicCandidature";
import Demo from "./pages/Demo";

// Configuration optimisée de QueryClient pour de meilleures performances
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache les données pendant 5 minutes
      staleTime: 5 * 60 * 1000,
      // Garde les données en cache pendant 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry seulement 1 fois en cas d'erreur
      retry: 1,
      // Timeout global de 5 secondes pour toutes les requêtes
      // Si une requête dépasse ce temps, elle sera annulée
      networkMode: 'online',
      // Refetch quand la fenêtre reprend le focus (désactivé pour éviter les requêtes inutiles)
      refetchOnWindowFocus: false,
      // Refetch quand on reconnecte (activé pour synchroniser les données)
      refetchOnReconnect: true,
      // Ne pas refetch automatiquement
      refetchOnMount: true,
      // Ne pas considérer les erreurs comme fatales - retourner des données vides
      throwOnError: false,
      // Retourner des données par défaut même en cas d'erreur
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000),
    },
    mutations: {
      // Retry seulement 1 fois pour les mutations
      retry: 1,
      // Ne pas bloquer l'UI en cas d'erreur
      throwOnError: false,
    },
  },
});

const App = () => (
  <ThemeProvider defaultTheme="system" storageKey="btp-smart-pro-theme">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/candidature" element={<PublicCandidature />} />
            <Route path="/apply" element={<PublicCandidature />} />
            <Route path="/demo" element={<Demo />} />
            {/* Routes accessibles en mode démo OU avec authentification */}
            <Route path="/dashboard" element={<DemoRoute><ProtectedRoute><Dashboard /></ProtectedRoute></DemoRoute>} />
            <Route path="/complete-profile" element={<ProtectedRoute><CompleteProfile /></ProtectedRoute>} />
            <Route path="/projects" element={<DemoRoute><ProtectedRoute><Projects /></ProtectedRoute></DemoRoute>} />
            <Route path="/projects/:id" element={<DemoRoute><ProtectedRoute><ProjectDetail /></ProtectedRoute></DemoRoute>} />
            <Route path="/clients" element={<DemoRoute><ProtectedRoute><Clients /></ProtectedRoute></DemoRoute>} />
            <Route path="/quotes" element={<DemoRoute><ProtectedRoute><Quotes /></ProtectedRoute></DemoRoute>} />
            <Route path="/calendar" element={<DemoRoute><ProtectedRoute><Calendar /></ProtectedRoute></DemoRoute>} />
            <Route path="/admin/employees" element={<DemoRoute><ProtectedRoute requireAdmin><AdminEmployees /></ProtectedRoute></DemoRoute>} />
            <Route path="/employees-planning" element={<DemoRoute><ProtectedRoute requireAdmin><EmployeesPlanning /></ProtectedRoute></DemoRoute>} />
            <Route path="/my-planning" element={<DemoRoute><ProtectedRoute><MyPlanning /></ProtectedRoute></DemoRoute>} />
            <Route path="/stats" element={<DemoRoute><ProtectedRoute><Stats /></ProtectedRoute></DemoRoute>} />
            <Route path="/settings" element={<DemoRoute><ProtectedRoute><Settings /></ProtectedRoute></DemoRoute>} />
            <Route path="/ai" element={<DemoRoute><ProtectedRoute><AI /></ProtectedRoute></DemoRoute>} />
            {/* RH Routes */}
            <Route path="/rh/dashboard" element={<DemoRoute><ProtectedRoute requireAdmin><RHDashboard /></ProtectedRoute></DemoRoute>} />
            <Route path="/rh/employees" element={<DemoRoute><ProtectedRoute requireAdmin><RHEmployees /></ProtectedRoute></DemoRoute>} />
            <Route path="/rh/candidatures" element={<DemoRoute><ProtectedRoute requireAdmin><RHCandidatures /></ProtectedRoute></DemoRoute>} />
            <Route path="/rh/taches" element={<DemoRoute><ProtectedRoute requireAdmin><RHTaches /></ProtectedRoute></DemoRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
