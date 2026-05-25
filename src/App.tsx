import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Toaster } from './components/ui/sonner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FloatingAIAssistant } from './components/ai/FloatingAIAssistant';
import { DemoModeGuard } from './components/DemoModeGuard';
import { CompanySelector } from './components/CompanySelector';
import { CloserProfileSetup } from './components/CloserProfileSetup';
import { TomorrowAssignmentsNotification } from './components/TomorrowAssignmentsNotification';
import { useAuth } from './contexts/AuthContext';

// Pages d'entrée — chargées immédiatement (pas de lazy)
import Index from './pages/Index';
import Auth from './pages/Auth';
import AuthCallback from './pages/AuthCallback';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import NotFound from './pages/NotFound';

// Pages publiques — lazy
const Demo = lazy(() => import('./pages/Demo'));
const PublicSignature = lazy(() => import('./pages/PublicSignature'));
const PublicCandidature = lazy(() => import('./pages/PublicCandidature'));
const SignatureQuote = lazy(() => import('./pages/SignatureQuote'));
const Signature = lazy(() => import('./pages/Signature'));
const SignaturePage = lazy(() => import('./pages/SignaturePage'));
const QuotePage = lazy(() => import('./pages/QuotePage'));
const AcceptInvitation = lazy(() => import('./pages/AcceptInvitation'));
const InviteAccept = lazy(() => import('./pages/InviteAccept'));
const StripeCallback = lazy(() => import('./pages/StripeCallback'));
const LegalPublicPage = lazy(() => import('./pages/LegalPublicPage'));
const CloserOffer = lazy(() => import('./pages/CloserOffer'));

// Pages protégées — lazy
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Clients = lazy(() => import('./pages/Clients'));
const Quotes = lazy(() => import('./pages/Quotes'));
const QuoteDetail = lazy(() => import('./pages/QuoteDetail'));
const Invoices = lazy(() => import('./pages/Invoices'));
const Projects = lazy(() => import('./pages/Projects'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const Calendar = lazy(() => import('./pages/Calendar'));
const MyPlanning = lazy(() => import('./pages/MyPlanning'));
const EmployeesPlanning = lazy(() => import('./pages/EmployeesPlanning'));
const Mailbox = lazy(() => import('./pages/Mailbox'));
const MessagingNew = lazy(() => import('./pages/MessagingNew'));
const AI = lazy(() => import('./pages/AI'));
const Analytics = lazy(() => import('./pages/Analytics'));
const TextLibrary = lazy(() => import('./pages/TextLibrary'));
const PaymentReminders = lazy(() => import('./pages/PaymentReminders'));
const AIInsights = lazy(() => import('./pages/AIInsights'));
const Settings = lazy(() => import('./pages/Settings'));
const GoogleCalendarIntegration = lazy(() =>
  import('./pages/GoogleCalendarIntegration').then(m => ({ default: m.GoogleCalendarIntegration }))
);
const ClientsAndQuotes = lazy(() => import('./pages/ClientsAndQuotes'));
const EmployeesAndRH = lazy(() => import('./pages/EmployeesAndRH'));
const EmployeesDashboard = lazy(() => import('./pages/EmployeesDashboard'));
const EmployeeDashboard = lazy(() => import('./pages/EmployeeDashboard'));
const Facturation = lazy(() => import('./pages/Facturation'));
const Sales = lazy(() => import('./pages/Sales'));
const RHDashboard = lazy(() => import('./pages/RHDashboard'));
const RHEmployees = lazy(() => import('./pages/RHEmployees'));
const RHCandidatures = lazy(() => import('./pages/RHCandidatures'));
const RHTaches = lazy(() => import('./pages/RHTaches'));
const AdminEmployees = lazy(() => import('./pages/AdminEmployees'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminActions = lazy(() => import('./pages/AdminActions'));
const AdminCompanies = lazy(() => import('./pages/AdminCompanies'));
const AdminLeads = lazy(() => import('./pages/AdminLeads'));
const CloserDashboard = lazy(() => import('./pages/CloserDashboard'));
const CloserActions = lazy(() => import('./pages/CloserActions'));
const RolesManagementGuarded = lazy(() =>
  import('./pages/RolesManagement').then(m => ({ default: m.RolesManagementGuarded }))
);
const UsersManagementRBACGuarded = lazy(() =>
  import('./pages/UsersManagementRBAC').then(m => ({ default: m.UsersManagementRBACGuarded }))
);
const DelegationsManagement = lazy(() => import('./pages/DelegationsManagement'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
    </div>
  );
}

function App() {
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname !== '/reset-password' && !location.pathname.startsWith('/reset-password')) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const urlParams = new URLSearchParams(window.location.search);
      const type = hashParams.get('type') || urlParams.get('type');
      if (type === 'recovery' || window.location.href.includes('type=recovery')) {
        console.log('[App] Global fallback: type=recovery detected, redirecting to /reset-password');
        window.__IS_PASSWORD_RESET_PAGE__ = true;
        window.location.href = '/reset-password' + window.location.search + window.location.hash;
        return;
      }
    }
  }, [location.pathname, location.search, location.hash]);

  const isPublicPage =
    location.pathname === '/' ||
    location.pathname === '/auth' ||
    location.pathname === '/demo' ||
    location.pathname.startsWith('/sign/') ||
    location.pathname.startsWith('/signature/') ||
    location.pathname.startsWith('/candidature/') ||
    location.pathname.startsWith('/quote/') ||
    location.pathname.startsWith('/reset-password') ||
    location.pathname.startsWith('/forgot-password') ||
    location.pathname.startsWith('/invite/') ||
    location.pathname.startsWith('/accept-invitation') ||
    location.pathname.startsWith('/legal/');

  return (
    <ErrorBoundary>
      <DemoModeGuard />
      <CloserProfileSetup />
      {user && !isPublicPage && <CompanySelector />}
      {user && !isPublicPage && <TomorrowAssignmentsNotification />}
      {user && !isPublicPage && <FloatingAIAssistant />}
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Routes publiques */}
          <Route path="/" element={<Index />} />
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
          <Route path="/signature/public/:token" element={<PublicSignature />} />
          <Route path="/signature/document/:id" element={<Signature />} />
          <Route path="/signature-quote/:id" element={<SignatureQuote />} />
          <Route path="/candidature/:id" element={<PublicCandidature />} />
          <Route path="/legal/:page" element={<LegalPublicPage />} />

          {/* Routes protégées */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/employee-dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
          <Route path="/quotes" element={<ProtectedRoute><Facturation /></ProtectedRoute>} />
          <Route path="/invoices" element={<ProtectedRoute><Facturation /></ProtectedRoute>} />
          <Route path="/facturation" element={<ProtectedRoute><Facturation /></ProtectedRoute>} />
          <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
          <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
          <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
          <Route path="/my-planning" element={<ProtectedRoute><MyPlanning /></ProtectedRoute>} />
          <Route path="/employees-planning" element={<ProtectedRoute><EmployeesPlanning /></ProtectedRoute>} />
          <Route path="/mailbox" element={<ProtectedRoute><Mailbox /></ProtectedRoute>} />
          <Route path="/messaging" element={<ProtectedRoute><MessagingNew /></ProtectedRoute>} />
          <Route path="/ai" element={<ProtectedRoute><AI /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          <Route path="/quotes/:id" element={<ProtectedRoute><QuoteDetail /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/text-library" element={<ProtectedRoute><TextLibrary /></ProtectedRoute>} />
          <Route path="/payment-reminders" element={<ProtectedRoute><PaymentReminders /></ProtectedRoute>} />
          <Route path="/ai-insights" element={<ProtectedRoute><AIInsights /></ProtectedRoute>} />
          <Route path="/settings/integrations/google" element={<ProtectedRoute><GoogleCalendarIntegration /></ProtectedRoute>} />
          <Route path="/clients-quotes" element={<ProtectedRoute><ClientsAndQuotes /></ProtectedRoute>} />
          <Route path="/employees-rh" element={<ProtectedRoute><EmployeesAndRH /></ProtectedRoute>} />
          <Route path="/employees-dashboard" element={<ProtectedRoute><EmployeesDashboard /></ProtectedRoute>} />
          <Route path="/rh-dashboard" element={<ProtectedRoute><RHDashboard /></ProtectedRoute>} />
          <Route path="/sales" element={<ProtectedRoute><Sales /></ProtectedRoute>} />
          <Route path="/rh/dashboard" element={<ProtectedRoute><RHDashboard /></ProtectedRoute>} />
          <Route path="/rh/employees" element={<ProtectedRoute><RHEmployees /></ProtectedRoute>} />
          <Route path="/rh/candidatures" element={<ProtectedRoute><RHCandidatures /></ProtectedRoute>} />
          <Route path="/rh/taches" element={<ProtectedRoute><RHTaches /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/actions" element={<ProtectedRoute requireAdmin><AdminActions /></ProtectedRoute>} />
          <Route path="/admin/offre" element={<ProtectedRoute requireAdmin><CloserOffer /></ProtectedRoute>} />
          <Route path="/admin/employees" element={<ProtectedRoute requireAdmin><AdminEmployees /></ProtectedRoute>} />
          <Route path="/admin/companies" element={<ProtectedRoute requireAdmin><AdminCompanies /></ProtectedRoute>} />
          <Route path="/admin/leads" element={<ProtectedRoute requireAdmin><AdminLeads /></ProtectedRoute>} />
          <Route path="/closer" element={<ProtectedRoute requireCloser><CloserDashboard /></ProtectedRoute>} />
          <Route path="/closer/actions" element={<ProtectedRoute requireCloser><CloserActions /></ProtectedRoute>} />
          <Route path="/closer/offre" element={<ProtectedRoute requireCloser><CloserOffer /></ProtectedRoute>} />
          <Route path="/roles" element={<ProtectedRoute><RolesManagementGuarded /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute><UsersManagementRBACGuarded /></ProtectedRoute>} />
          <Route path="/delegations" element={<ProtectedRoute><DelegationsManagement /></ProtectedRoute>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <Toaster />
    </ErrorBoundary>
  );
}

export default App;
