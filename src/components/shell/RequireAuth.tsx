import { Navigate, Outlet } from "react-router-dom"
import { ALWAYS_VISIBLE_PATHS } from "@/components/shell/AppSidebar"
import AccountPendingPage from "@/pages/AccountPendingPage"
import { useAuth } from "@/hooks/useAuth"

export function RequireAuth() {
  const { status } = useAuth()

  if (status === "loading") {
    return <div className="flex min-h-svh items-center justify-center text-muted-foreground">Loading…</div>
  }
  if (status === "unauthenticated") {
    return <Navigate to="/login" replace />
  }
  // Rendered in place rather than redirected — there's no page for a pending/
  // disabled account to be sent to instead, and this keeps the URL bar honest.
  if (status === "pending" || status === "disabled") {
    return <AccountPendingPage status={status} />
  }
  return <Outlet />
}

export function RequireAdmin() {
  const { isAdmin } = useAuth()
  if (!isAdmin) return <Navigate to="/" replace />
  return <Outlet />
}

/** Gates one route behind an Admin-granted "area" (supabase/access_control_setup.sql,
 *  profile_areas — same route-path keys as AppSidebar's HIDEABLE_NAV_ITEMS/
 *  ALWAYS_VISIBLE_PATHS, so this can never drift from what the sidebar itself shows).
 *  Admins bypass; Dashboard/Settings are exempt regardless of grants. */
export function RequireArea({ area }: { area: string }) {
  const { user, isAdmin } = useAuth()
  const allowed =
    isAdmin ||
    ALWAYS_VISIBLE_PATHS.has(area) ||
    user?.accessControlInstalled === false ||
    !!user?.areas.includes(area)
  if (!allowed) return <Navigate to="/" replace />
  return <Outlet />
}
