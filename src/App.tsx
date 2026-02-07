import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Toaster } from './components/ui/sonner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FloatingAIAssistant } from './components/ai/FloatingAIAssistant';
import { DemoModeGuard } from './components/DemoModeGuard';
import { CompanySelector } from './components/CompanySelector';
import { TomorrowAssignmentsNotification } from './components/TomorrowAssignmentsNotification';
import { useAuth } from './contexts/AuthContext';

// Pages publiques
import Index from './pages/Index';
import Auth from './pages/Auth';
import AuthCallback from './pages/AuthCallback';
import Demo from './pages/Demo';
import PublicSignature from './pages/PublicSignature';
import PublicCandidature from './pages/PublicCandidature';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentError from './pages/PaymentError';
import PaymentFinal from './pages/PaymentFinal';
import PaymentPage from './pages/PaymentPage';
import SignatureQuote from './pages/SignatureQuote';
import Signature from './pages/Signature';
import SignaturePage from './pages/SignaturePage';
import QuotePage from './pages/QuotePage';

// Pages protégées
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Quotes from './pages/Quotes';
import QuoteDetail from './pages/QuoteDetail';
import Invoices from './pages/Invoices';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Calendar from './pages/Calendar';
import MyPlanning from './pages/MyPlanning';
import EmployeesPlanning from './pages/EmployeesPlanning';
import Mailbox from './pages/Mailbox';
import MessagingNew from './pages/MessagingNew'; // Nouvelle page Messagerie (from scratch)
import AI from './pages/AI';
import Analytics from './pages/Analytics';
import TextLibrary from './pages/TextLibrary';
import PaymentReminders from './pages/PaymentReminders';
import AIInsights from './pages/AIInsights';
import Settings from './pages/Settings';
import { GoogleCalendarIntegration } from './pages/GoogleCalendarIntegration';
import CompleteProfile from './pages/CompleteProfile';
import ClientsAndQuotes from './pages/ClientsAndQuotes';
import EmployeesAndRH from './pages/EmployeesAndRH';
import EmployeesDashboard from './pages/EmployeesDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import Facturation from './pages/Facturation';
import Sales from './pages/Sales';
import RHDashboard from './pages/RHDashboard';
import RHEmployees from './pages/RHEmployees';
import RHCandidatures from './pages/RHCandidatures';
import RHTaches from './pages/RHTaches';
import AdminEmployees from './pages/AdminEmployees';
import AdminCompanies from './pages/AdminCompanies';
import AcceptInvitation from './pages/AcceptInvitation';
import InviteAccept from './pages/InviteAccept';
import StripeCallback from './pages/StripeCallback';
import ResetPassword from './pages/ResetPassword';
import ForgotPassword from './pages/ForgotPassword';
import NotFound from './pages/NotFound';
import Start from './pages/Start';
import StartSuccess from './pages/StartSuccess';
import StartCancel from './pages/StartCancel';

// Pages RBAC (Gestion des rôles et utilisateurs)
import { RolesManagementGuarded } from './pages/RolesManagement';
import { UsersManagementRBACGuarded } from './pages/UsersManagementRBAC';
import DelegationsManagement from './pages/DelegationsManagement';

function App() {
  const { user } = useAuth();
  const location = useLocation();
  
  // FALLBACK GLOBAL : Détecter type=recovery dans l'URL et rediriger vers /reset-password
  // Ceci garantit que même si l'utilisateur arrive sur une autre page avec le token,
  // il sera redirigé vers la page de réinitialisation
  useEffect(() => {
    // Vérifier uniquement si on n'est pas déjà sur /reset-password
    if (location.pathname !== '/reset-password' && !location.pathname.startsWith('/reset-password')) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const urlParams = new URLSearchParams(window.location.search);
      const type = hashParams.get('type') || urlParams.get('type');
      
      // Si on détecte type=recovery dans l'URL mais qu'on n'est pas sur /reset-password
      if (type === 'recovery' || window.location.href.includes('type=recovery')) {
        console.log('[App] Global fallback: type=recovery detected, redirecting to /reset-password');
        window.__IS_PASSWORD_RESET_PAGE__ = true;
        window.location.href = '/reset-password' + window.location.search + window.location.hash;
        return;
      }
    }
  }, [location.pathname, location.search, location.hash]);
  
  // Pages publiques où l'agent IA ne doit PAS être visible (accueil, auth, démo, signature, paiement...)
  const isPublicPage = 
    location.pathname === '/' ||
    location.pathname === '/auth' ||
    location.pathname === '/demo' ||
    location.pathname.startsWith('/sign/') ||
    location.pathname.startsWith('/signature/') ||
    location.pathname.startsWith('/payment/') ||
    location.pathname.startsWith('/candidature/') ||
    location.pathname.startsWith('/quote/') ||
    location.pathname.startsWith('/reset-password') ||
    location.pathname.startsWith('/forgot-password') ||
    location.pathname.startsWith('/invite/') ||
    location.pathname.startsWith('/accept-invitation');
  
  return (
    <ErrorBoundary>
      {/* Guard qui désactive automatiquement le mode démo si l'utilisateur se connecte */}
      <DemoModeGuard />
      {/* Sélecteur d'entreprise - affiché uniquement si l'utilisateur appartient à plusieurs entreprises */}
      {user && !isPublicPage && <CompanySelector />}
      {/* Notification des affectations du lendemain - pour les employés */}
      {user && !isPublicPage && <TomorrowAssignmentsNotification />}
      {/* Widget Agent IA flottant - masqué sur les pages publiques (signature, paiement) */}
      {user && !isPublicPage && <FloatingAIAssistant />}
      <Routes>
        {/* Routes publiques */}
        <Route path="/" element={<Index />} />
        {/* Route callback DOIT être AVANT /auth pour éviter les conflits de matching */}
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/accept-invitation" element={<AcceptInvitation />} />
        <Route path="/invite/accept" element={<InviteAccept />} />
        <Route path="/stripe-callback" element={<StripeCallback />} />
        <Route path="/demo" element={<Demo />} />
        <Route path="/sign/:quoteId" element={<SignaturePage />} />
        <Route path="/quote/:id" element={<QuotePage />} />
        {/* Routes signature avec chemins distincts pour éviter les conflits */}
        <Route path="/signature/public/:token" element={<PublicSignature />} />
        <Route path="/signature/document/:id" element={<Signature />} />
        <Route path="/signature-quote/:id" element={<SignatureQuote />} />
        <Route path="/candidature/:id" element={<PublicCandidature />} />
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/payment/error" element={<PaymentError />} />
        <Route path="/payment/final" element={<PaymentFinal />} />
        <Route path="/payment/quote/:id" element={<PaymentPage />} />
        <Route path="/payment/invoice/:id" element={<PaymentPage />} />

        {/* Paywall / souscription B2B (protégé auth, pas de gate abonnement) */}
        <Route path="/start" element={<ProtectedRoute><Start /></ProtectedRoute>} />
        <Route path="/start/success" element={<ProtectedRoute><StartSuccess /></ProtectedRoute>} />
        <Route path="/start/cancel" element={<ProtectedRoute><StartCancel /></ProtectedRoute>} />

        {/* Routes protégées */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employee-dashboard"
          element={
            <ProtectedRoute>
              <EmployeeDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clients"
          element={
            <ProtectedRoute>
              <Clients />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quotes"
          element={
            <ProtectedRoute>
              <Facturation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/invoices"
          element={
            <ProtectedRoute>
              <Facturation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/facturation"
          element={
            <ProtectedRoute>
              <Facturation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <Projects />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:id"
          element={
            <ProtectedRoute>
              <ProjectDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/calendar"
          element={
            <ProtectedRoute>
              <Calendar />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-planning"
          element={
            <ProtectedRoute>
              <MyPlanning />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees-planning"
          element={
            <ProtectedRoute>
              <EmployeesPlanning />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mailbox"
          element={
            <ProtectedRoute>
              <Mailbox />
            </ProtectedRoute>
          }
        />
        <Route
          path="/messaging"
          element={
            <ProtectedRoute>
              <MessagingNew />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ai"
          element={
            <ProtectedRoute>
              <AI />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <Analytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quotes/:id"
          element={
            <ProtectedRoute>
              <QuoteDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/text-library"
          element={
            <ProtectedRoute>
              <TextLibrary />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment-reminders"
          element={
            <ProtectedRoute>
              <PaymentReminders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ai-insights"
          element={
            <ProtectedRoute>
              <AIInsights />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/integrations/google"
          element={
            <ProtectedRoute>
              <GoogleCalendarIntegration />
            </ProtectedRoute>
          }
        />
        <Route
          path="/complete-profile"
          element={
            <ProtectedRoute>
              <CompleteProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clients-quotes"
          element={
            <ProtectedRoute>
              <ClientsAndQuotes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees-rh"
          element={
            <ProtectedRoute>
              <EmployeesAndRH />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees-dashboard"
          element={
            <ProtectedRoute>
              <EmployeesDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rh-dashboard"
          element={
            <ProtectedRoute>
              <RHDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sales"
          element={
            <ProtectedRoute>
              <Sales />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rh/dashboard"
          element={
            <ProtectedRoute>
              <RHDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rh/employees"
          element={
            <ProtectedRoute>
              <RHEmployees />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rh/candidatures"
          element={
            <ProtectedRoute>
              <RHCandidatures />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rh/taches"
          element={
            <ProtectedRoute>
              <RHTaches />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/employees"
          element={
            <ProtectedRoute requireAdmin>
              <AdminEmployees />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/companies"
          element={
            <ProtectedRoute requireAdmin>
              <AdminCompanies />
            </ProtectedRoute>
          }
        />

        {/* Routes RBAC - Gestion des rôles et utilisateurs */}
        <Route
          path="/roles"
          element={
            <ProtectedRoute>
              <RolesManagementGuarded />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <UsersManagementRBACGuarded />
            </ProtectedRoute>
          }
        />
        <Route
          path="/delegations"
          element={
            <ProtectedRoute>
              <DelegationsManagement />
            </ProtectedRoute>
          }
        />

        {/* Route 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </ErrorBoundary>
  );
}

export default App;

