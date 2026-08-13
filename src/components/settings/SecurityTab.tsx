import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/hooks/useAuth"

/** "Not available yet" badges sit right on each inert control, not just in a
 *  footnote below them — this is a security page, so it shouldn't be possible
 *  to glance at it and believe 2FA or a session timeout is actually active. */
function NotAvailable() {
  return <Badge variant="outline">Not available yet</Badge>
}

/** Ported from the Security settings tab (index.html:5271-5297). These
 *  preferences are prototype-only, same as the legacy app — a real
 *  deployment would enforce them via the identity provider / backend, not
 *  client-side toggles. */
export function SecurityTab() {
  const { user } = useAuth()
  if (!user) return null

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-4 text-sm font-semibold">Security &amp; Access</h3>
      <div className="divide-y">
        <div className="flex items-center justify-between py-3">
          <div>
            <div className="font-medium">Two-Factor Authentication</div>
            <p className="text-sm text-muted-foreground">Add an extra layer of security to your account at sign-in.</p>
          </div>
          <div className="flex items-center gap-2">
            <NotAvailable />
            <Switch defaultChecked={!!user.twofa} disabled />
          </div>
        </div>
        <div className="flex items-center justify-between py-3">
          <div>
            <div className="font-medium">Login Alerts</div>
            <p className="text-sm text-muted-foreground">Get notified of sign-ins from new devices.</p>
          </div>
          <div className="flex items-center gap-2">
            <NotAvailable />
            <Switch disabled />
          </div>
        </div>
        <div className="flex items-center justify-between py-3">
          <div>
            <div className="font-medium">Session Timeout</div>
            <p className="text-sm text-muted-foreground">Not currently enforced — sessions stay signed in until you sign out.</p>
          </div>
          <NotAvailable />
        </div>
        <div className="flex items-center justify-between py-3">
          <div>
            <div className="font-medium">Active Role</div>
            <p className="text-sm text-muted-foreground">Your permission level in this system.</p>
          </div>
          <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{user.role}</span>
        </div>
      </div>
      <p className="mt-4 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
        The settings above marked "Not available yet" aren't enforced by this app — a production deployment would
        implement them via the identity provider and backend, not a client-side toggle.
      </p>
    </div>
  )
}
