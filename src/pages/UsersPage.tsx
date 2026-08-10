import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@/hooks/useAuth"

/** Ported from renderUsers (index.html:5592-5614): there is no separate users
 *  table — role/name live in Supabase Auth's user_metadata, editable only
 *  from the Supabase dashboard. This page is an account card + instructions. */
export default function UsersPage() {
  const { user } = useAuth()
  if (!user) return null

  return (
    <div className="grid gap-4">
      <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
        Sign-in is handled by real Supabase Auth — passwords are verified and stored server-side, never in this
        app's code. This page can only see the account that's currently signed in.
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold">Your Account</h3>
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback>{user.initials}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{user.name}</div>
            <div className="text-xs text-muted-foreground">{user.email}</div>
          </div>
        </div>
        <span className="mt-3 inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{user.role}</span>
      </div>

      <div className="rounded-lg border bg-card p-4 text-sm leading-relaxed">
        <h3 className="mb-3 text-sm font-semibold">Adding Teammates</h3>
        <p>
          New teammates create their own account from the <b>Create an account</b> link on the sign-in screen
          (email + password). New accounts default to <b>Viewer</b> access.
        </p>
        <p className="mt-2">
          To change someone's role or remove access, open your Supabase project → <b>Authentication → Users</b>,
          select the person, and edit their <code>raw_user_meta_data</code> — for example:
        </p>
        <pre className="mt-2 overflow-auto rounded-md bg-muted p-3 text-xs">{`{"role": "Editor", "name": "Jane Doe"}`}</pre>
        <p className="mt-2 text-muted-foreground">
          Roles used by this app: <b>Admin</b> (full access), <b>Editor</b> (add/edit/export), <b>Viewer</b>{" "}
          (export only).
        </p>
      </div>
    </div>
  )
}
