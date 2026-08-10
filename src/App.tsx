import { Navigate, Route, Routes, useLocation } from "react-router-dom"
import { AppShell } from "@/components/shell/AppShell"
import { RequireAdmin, RequireAuth } from "@/components/shell/RequireAuth"
import { useAuth } from "@/hooks/useAuth"
import ActivityLogPage from "@/pages/ActivityLogPage"
import DashboardPage from "@/pages/DashboardPage"
import InvoicesPage from "@/pages/InvoicesPage"
import LoginPage from "@/pages/LoginPage"
import ReportsPage from "@/pages/ReportsPage"
import ResetPasswordPage from "@/pages/ResetPasswordPage"
import SettingsPage from "@/pages/SettingsPage"
import UsersPage from "@/pages/UsersPage"
import VendorsContractsPage from "@/pages/VendorsContractsPage"

function App() {
  const { isRecovery } = useAuth()
  const location = useLocation()

  // A clicked password-reset email link lands here with a valid (recovery)
  // Supabase session — route it to the "set new password" screen instead
  // of the normal authenticated app.
  if (isRecovery && location.pathname !== "/reset-password") {
    return <Navigate to="/reset-password" replace />
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="vendors" element={<VendorsContractsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="activity" element={<ActivityLogPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route element={<RequireAdmin />}>
            <Route path="users" element={<UsersPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
