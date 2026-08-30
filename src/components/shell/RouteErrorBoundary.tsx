import { Component, type ReactNode } from "react"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

const RELOAD_GUARD_KEY = "route-error-reload-attempted"

/** Catches a lazy route chunk failing to load — a real, if intermittent, failure mode:
 *  the service worker's cache-first fetch for that chunk can fail (offline, a dropped
 *  mobile connection, or the chunk hash going stale after a new deploy replaces it on the
 *  server), and with no error boundary anywhere in the tree that rejection used to just
 *  crash the whole app to a blank, frozen screen with no way back short of the user
 *  guessing to hard-refresh.
 *
 *  First failure: reload once automatically — for the common "stale chunk after a deploy"
 *  case this silently fixes itself, since the fresh index.html points at the new hashes.
 *  A `sessionStorage` guard stops that from looping if the failure isn't transient (e.g.
 *  genuinely offline); the second failure in the same tab shows a manual retry instead. */
export class RouteErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch() {
    let alreadyTried = false
    try {
      alreadyTried = sessionStorage.getItem(RELOAD_GUARD_KEY) === "1"
      if (!alreadyTried) sessionStorage.setItem(RELOAD_GUARD_KEY, "1")
    } catch {
      // Storage unavailable (private mode, quota) — fall through to the manual-retry UI.
      alreadyTried = true
    }
    if (!alreadyTried) window.location.reload()
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm font-medium">Couldn't load this page.</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          This can happen after a connection drop or a new update — reloading almost always fixes it.
        </p>
        <Button
          size="sm"
          onClick={() => {
            try {
              sessionStorage.removeItem(RELOAD_GUARD_KEY)
            } catch {
              // ignore
            }
            window.location.reload()
          }}
        >
          <RefreshCw className="size-3.5" />
          Reload
        </Button>
      </div>
    )
  }
}
