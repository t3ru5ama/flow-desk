import { Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { LandingPage } from "./pages/Landing/LandingPage";
import { LoginPage } from "./pages/Login/LoginPage";
import { SignupPage } from "./pages/Signup/SignupPage";
import { ForgotPasswordPage } from "./pages/Login/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/Login/ResetPasswordPage";
import { InviteAcceptPage } from "./pages/Invite/InviteAcceptPage";
import { DashboardPage } from "./pages/Dashboard/DashboardPage";
import { ProjectsPage } from "./pages/Projects/ProjectsPage";
import { ProjectDetailPage } from "./pages/ProjectDetail/ProjectDetailPage";
import { TasksPage } from "./pages/Tasks/TasksPage";
import { IncidentsPage } from "./pages/Incidents/IncidentsPage";
import { IncidentDetailPage } from "./pages/IncidentDetail/IncidentDetailPage";
import { ApprovalsPage } from "./pages/Approvals/ApprovalsPage";
import { DocumentsPage } from "./pages/Documents/DocumentsPage";
import { NotificationsPage } from "./pages/Notifications/NotificationsPage";
import { TeamPage } from "./pages/Team/TeamPage";
import { IntegrationsPage } from "./pages/Integrations/IntegrationsPage";
import { BillingPage } from "./pages/Billing/BillingPage";
import { SettingsPage } from "./pages/Settings/SettingsPage";
import { ProfilePage } from "./pages/Profile/ProfilePage";

function protect(element: React.ReactNode) {
  return <ProtectedRoute>{element}</ProtectedRoute>;
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/invite/accept" element={<InviteAcceptPage />} />

      <Route path="/dashboard" element={protect(<DashboardPage />)} />
      <Route path="/projects" element={protect(<ProjectsPage />)} />
      <Route path="/projects/:id" element={protect(<ProjectDetailPage />)} />
      <Route path="/tasks" element={protect(<TasksPage />)} />
      <Route path="/incidents" element={protect(<IncidentsPage />)} />
      <Route path="/incidents/:id" element={protect(<IncidentDetailPage />)} />
      <Route path="/approvals" element={protect(<ApprovalsPage />)} />
      <Route path="/documents" element={protect(<DocumentsPage />)} />
      <Route path="/notifications" element={protect(<NotificationsPage />)} />
      <Route path="/team" element={protect(<TeamPage />)} />
      <Route path="/integrations" element={protect(<IntegrationsPage />)} />
      <Route path="/billing" element={protect(<BillingPage />)} />
      <Route path="/settings" element={protect(<SettingsPage />)} />
      <Route path="/profile" element={protect(<ProfilePage />)} />

      <Route path="*" element={<LandingPage />} />
    </Routes>
  );
}
