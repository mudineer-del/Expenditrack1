import { useEffect, useRef } from "react"
import { useDashboardLayoutQuery } from "@/hooks/useDashboardLayout"
import { useDisplayStore } from "@/store/useDisplayStore"

/** Pulls the signed-in user's saved Dashboard layout down from the cloud once per login and
 *  applies it, so switching devices/browsers shows the layout they last explicitly saved
 *  (the "Save Layout" button on the Dashboard page) instead of whatever this browser's own
 *  local storage happened to have. A guard ref keeps this to once per session — re-applying
 *  on every render/navigation would stomp on in-progress local edits made after login.
 *  Renders nothing. */
export function DashboardLayoutHydrator() {
  const layoutQuery = useDashboardLayoutQuery()
  const hydrateFromCloud = useDisplayStore((s) => s.hydrateFromCloud)
  const hydratedRef = useRef(false)

  useEffect(() => {
    if (hydratedRef.current || !layoutQuery.data) return
    hydratedRef.current = true
    hydrateFromCloud(layoutQuery.data.prefs)
  }, [layoutQuery.data, hydrateFromCloud])

  return null
}
