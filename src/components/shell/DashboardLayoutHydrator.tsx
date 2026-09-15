import { useEffect, useRef } from "react"
import { useDashboardLayoutQuery } from "@/hooks/useDashboardLayout"
import { useDisplayStore } from "@/store/useDisplayStore"
import { useAuth } from "@/hooks/useAuth"

/** Pulls the signed-in user's saved Dashboard layout down from the cloud once per login and
 *  applies it, so switching devices/browsers shows the layout they last explicitly saved
 *  (the "Save Layout" button on the Dashboard page) instead of whatever this browser's own
 *  local storage happened to have. A guard ref keeps this to once per session — re-applying
 *  on every render/navigation would stomp on in-progress local edits made after login.
 *  Renders nothing. */
export function DashboardLayoutHydrator() {
  const layoutQuery = useDashboardLayoutQuery()
  const hydrateFromCloud = useDisplayStore((s) => s.hydrateFromCloud)
  const { user } = useAuth()
  const hydratedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!user?.id || hydratedRef.current === user.id || !layoutQuery.isSuccess) return
    hydratedRef.current = user.id
    if (layoutQuery.data) hydrateFromCloud(layoutQuery.data.prefs)
  }, [user?.id, layoutQuery.isSuccess, layoutQuery.data, hydrateFromCloud])

  return null
}
