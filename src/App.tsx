import { lazy, Suspense } from "react"
import { Navigate, Route, Routes, useLocation } from "react-router-dom"
import { AppShell } from "@/components/shell/AppShell"
import { RequireAdmin, RequireAuth } from "@/components/shell/RequireAuth"
import { RouteErrorBoundary } from "@/components/shell/RouteErrorBoundary"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/hooks/useAuth"
import LoginPage from "@/pages/LoginPage"
import ResetPasswordPage from "@/pages/ResetPasswordPage"

// Route-level code splitting: each page (and its charts/tables/heavy libs)
// only loads when its route is visited, instead of one ~1.9MB bundle for
// the whole app up front.
const DashboardPage = lazy(() => import("@/pages/DashboardPage"))
const InvoicesPage = lazy(() => import("@/pages/InvoicesPage"))
const VendorsContractsPage = lazy(() => import("@/pages/VendorsContractsPage"))
const WellDashboardPage = lazy(() => import("@/pages/WellDashboardPage"))
const ManageWellsPage = lazy(() => import("@/pages/ManageWellsPage"))
const WellCostStructurePage = lazy(() => import("@/pages/WellCostStructurePage"))
const ReportsPage = lazy(() => import("@/pages/ReportsPage"))
const ActivityLogPage = lazy(() => import("@/pages/ActivityLogPage"))
const MessageCentrePage = lazy(() => import("@/pages/MessageCentrePage"))
const SettingsPage = lazy(() => import("@/pages/SettingsPage"))
const InstallPage = lazy(() => import("@/pages/InstallPage"))
const UsersPage = lazy(() => import("@/pages/UsersPage"))

function RouteFallback() {
  return (
    <div className="grid gap-4">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-72 w-full" />
    </div>
  )
}

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
    <RouteErrorBoundary>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route element={<RequireAuth />}>
            <Route element={<AppShell />}>
              <Route index element={<DashboardPage />} />
              <Route path="invoices" element={<InvoicesPage />} />
              <Route path="vendors" element={<VendorsContractsPage />} />
              <Route path="well-cost" element={<WellDashboardPage />} />
              <Route path="well-cost/wells" element={<ManageWellsPage />} />
              <Route path="well-cost/structure" element={<WellCostStructurePage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="activity" element={<ActivityLogPage />} />
              <Route path="messages" element={<MessageCentrePage />} />
              <Route path="install" element={<InstallPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route element={<RequireAdmin />}>
                <Route path="users" element={<UsersPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </RouteErrorBoundary>
  )
}

export default App
