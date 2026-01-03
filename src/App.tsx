import { Routes, Route, useLocation } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Toaster } from './components/ui/sonner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FloatingAIAssistant } from './components/ai/FloatingAIAssistant';
import { DemoModeGuard } from './components/DemoModeGuard';
import { useAuth } from './hooks/useAuth';

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
import Messaging from './pages/Messaging';
import AI from './pages/AI';
import Settings from './pages/Settings';
import CompleteProfile from './pages/CompleteProfile';
import ClientsAndQuotes from './pages/ClientsAndQuotes';
import EmployeesAndRH from './pages/EmployeesAndRH';
import EmployeesDashboard from './pages/EmployeesDashboard';
import Facturation from './pages/Facturation';
import Sales from './pages/Sales';
import RHDashboard from './pages/RHDashboard';
import RHEmployees from './pages/RHEmployees';
import RHCandidatures from './pages/RHCandidatures';
import RHTaches from './pages/RHTaches';
import AdminEmployees from './pages/AdminEmployees';
import AdminCompanies from './pages/AdminCompanies';
import AcceptInvitation from './pages/AcceptInvitation';
import StripeCallback from './pages/StripeCallback';
import NotFound from './pages/NotFound';

function App() {
  const { user } = useAuth();
  const location = useLocation();
  
  // Pages publiques où l'agent IA ne doit PAS être visible
  const isPublicPage = 
    location.pathname.startsWith('/sign/') ||
    location.pathname.startsWith('/signature/') ||
    location.pathname.startsWith('/payment/') ||
    location.pathname.startsWith('/candidature/') ||
    location.pathname.startsWith('/quote/');
  
  return (
    <ErrorBoundary>
      {/* Guard qui désactive automatiquement le mode démo si l'utilisateur se connecte */}
      <DemoModeGuard />
      {/* Widget Agent IA flottant - masqué sur les pages publiques (signature, paiement) */}
      {user && !isPublicPage && <FloatingAIAssistant />}
      <Routes>
        {/* Routes publiques */}
        <Route path="/" element={<Index />} />
        {/* Route callback DOIT être AVANT /auth pour éviter les conflits de matching */}
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/accept-invitation" element={<AcceptInvitation />} />
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
              <Messaging />
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

        {/* Route 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </ErrorBoundary>
  );
}

export default App;

