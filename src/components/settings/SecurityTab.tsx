import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/hooks/useAuth"

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
          <Switch defaultChecked={!!user.twofa} disabled />
        </div>
        <div className="flex items-center justify-between py-3">
          <div>
            <div className="font-medium">Login Alerts</div>
            <p className="text-sm text-muted-foreground">Get notified of sign-ins from new devices.</p>
          </div>
          <Switch disabled />
        </div>
        <div className="flex items-center justify-between py-3">
          <div>
            <div className="font-medium">Session Timeout</div>
            <p className="text-sm text-muted-foreground">Automatically sign out after a period of inactivity.</p>
          </div>
          <span className="text-sm text-muted-foreground">1 hour</span>
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
        These security preferences are stored for this prototype. In a production deployment they'd be enforced by
        your identity provider and backend.
      </p>
    </div>
  )
}
