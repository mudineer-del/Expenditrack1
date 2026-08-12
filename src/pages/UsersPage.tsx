import { KeyRound, Send } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SetPasswordDialog } from "@/components/users/SetPasswordDialog"
import { useAuth } from "@/hooks/useAuth"
import { useProfilesQuery, useUpdateProfileRole } from "@/hooks/useProfiles"
import type { AppUser, Role } from "@/types/user"

const ROLES: Role[] = ["Admin", "Editor", "Viewer"]

/**
 * Account directory, imported from Supabase (public.profiles — see
 * supabase/profiles_setup.sql) rather than a Supabase-dashboard-only view of
 * just the signed-in account. Role edits here write back to that table; a DB
 * trigger enforces that only Admins can actually change a role.
 */
export default function UsersPage() {
  const { user, isAdmin, sendRecovery } = useAuth()
  const profilesQuery = useProfilesQuery()
  const updateRole = useUpdateProfileRole()
  const [passwordTarget, setPasswordTarget] = useState<AppUser | null>(null)
  const [sendingResetFor, setSendingResetFor] = useState<string | null>(null)

  if (!user) return null

  const profiles = profilesQuery.data ?? []

  function handleRoleChange(id: string, role: Role) {
    updateRole.mutate(
      { id, role },
      {
        onSuccess: () => toast.success("Role updated."),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update role."),
      }
    )
  }

  async function handleSendReset(p: AppUser) {
    setSendingResetFor(p.id)
    const r = await sendRecovery(p.email)
    setSendingResetFor(null)
    if (r.ok) toast.success(`Password reset email sent to ${p.email}.`)
    else toast.error(r.error || "Could not send reset email.")
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
        Sign-in is handled by real Supabase Auth — passwords are verified and stored server-side, never in this
        app's code.
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

      <div className="rounded-lg border bg-card">
        <div className="border-b p-4">
          <h3 className="text-sm font-semibold">All Users</h3>
          <p className="text-xs text-muted-foreground">
            Imported from Supabase Auth. {isAdmin ? "Change a role below to save it back." : "Only Admins can change roles."}
          </p>
        </div>

        {profilesQuery.isLoading ? (
          <div className="grid gap-2 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : profilesQuery.isError ? (
          <div className="p-6 text-sm text-destructive">
            Could not load users. Run <code>supabase/profiles_setup.sql</code> in your Supabase project's SQL
            Editor if you haven't yet, then reload.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Role</TableHead>
                {isAdmin && <TableHead></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((p) => {
                const isSelf = p.id === user.id
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="size-7">
                          <AvatarFallback className="text-xs">{p.initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {p.name}
                            {isSelf && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}
                          </div>
                          <div className="text-xs text-muted-foreground">{p.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.dept || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{p.designation || "—"}</TableCell>
                    <TableCell>
                      {isAdmin && !isSelf ? (
                        <Select value={p.role} onValueChange={(v) => handleRoleChange(p.id, v as Role)}>
                          <SelectTrigger className="w-28" title={`Change ${p.name}'s role`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((r) => (
                              <SelectItem key={r} value={r}>
                                {r}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span
                          className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium"
                          title={isSelf ? "You can't change your own role — ask another Admin." : undefined}
                        >
                          {p.role}
                        </span>
                      )}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        {!isSelf && (
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              title={`Email ${p.name} a password reset link`}
                              disabled={sendingResetFor === p.id}
                              onClick={() => handleSendReset(p)}
                            >
                              <Send />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              title={`Set ${p.name}'s password directly`}
                              onClick={() => setPasswordTarget(p)}
                            >
                              <KeyRound />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="rounded-lg border bg-card p-4 text-sm leading-relaxed">
        <h3 className="mb-3 text-sm font-semibold">Adding Teammates</h3>
        <p>
          New teammates create their own account from the <b>Create an account</b> link on the sign-in screen
          (email + password). New accounts default to <b>Viewer</b> access — an Admin can raise it from the table
          above.
        </p>
        <p className="mt-2 text-muted-foreground">
          Roles used by this app: <b>Admin</b> (full access), <b>Editor</b> (add/edit/export), <b>Viewer</b>{" "}
          (export only).
        </p>
        {isAdmin && (
          <p className="mt-2 text-muted-foreground">
            Use <Send className="inline size-3.5" /> to email a teammate a password reset link, or{" "}
            <KeyRound className="inline size-3.5" /> to set a password for them directly (requires the{" "}
            <code>admin-set-password</code> Edge Function — see{" "}
            <code>supabase/functions/admin-set-password/README.md</code>).
          </p>
        )}
      </div>

      <SetPasswordDialog user={passwordTarget} open={!!passwordTarget} onOpenChange={(v) => !v && setPasswordTarget(null)} />
    </div>
  )
}
