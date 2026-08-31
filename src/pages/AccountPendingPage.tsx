import { Clock, LogOut, ShieldOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { OgdclLogoFull } from "@/components/shared/OgdclMark"
import { useAuth } from "@/hooks/useAuth"

const COPY = {
  pending: {
    icon: Clock,
    title: "Awaiting approval",
    body: "Your account has been created but hasn't been reviewed yet. An administrator needs to approve it — and choose which departments and sections you can access — before you can sign in.",
  },
  disabled: {
    icon: ShieldOff,
    title: "Account disabled",
    body: "An administrator has disabled this account. Contact your administrator if you believe this is a mistake.",
  },
}

/** Shown by RequireAuth in place of the app shell whenever a signed-in session's
 *  profile status isn't "active" — see supabase/access_control_setup.sql and
 *  useAuthStore's statusFor(). Rendered in place (no redirect) so the URL the
 *  user landed on doesn't matter; there's nothing to navigate to regardless. */
export default function AccountPendingPage({ status }: { status: "pending" | "disabled" }) {
  const { user, signOut } = useAuth()
  const { icon: Icon, title, body } = COPY[status]

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <OgdclLogoFull className="w-28" />
      <div className="flex max-w-sm flex-col items-center gap-3 rounded-2xl border bg-card p-8 shadow-sm">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="size-6" />
        </div>
        <h1 className="text-lg font-bold tracking-tight">{title}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
        {user?.email && <p className="mt-1 text-xs text-muted-foreground">Signed in as {user.email}</p>}
        <Button variant="outline" size="sm" className="mt-3" onClick={() => signOut()}>
          <LogOut /> Sign out
        </Button>
      </div>
    </div>
  )
}
