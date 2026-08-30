import { Camera, KeyRound, Send } from "lucide-react"
import { useRef, useState } from "react"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SetPasswordDialog } from "@/components/users/SetPasswordDialog"
import { AVATAR_ACCEPT, uploadAvatarFile } from "@/lib/avatars"
import { errorMessage } from "@/lib/utils"
import { useAuth } from "@/hooks/useAuth"
import { useProfilesQuery, useUpdateProfileAvatar, useUpdateProfileRole } from "@/hooks/useProfiles"
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
  const updateAvatar = useUpdateProfileAvatar()
  const [passwordTarget, setPasswordTarget] = useState<AppUser | null>(null)
  const [sendingResetFor, setSendingResetFor] = useState<string | null>(null)
  const [pendingAvatarFor, setPendingAvatarFor] = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  if (!user) return null

  const profiles = profilesQuery.data ?? []

  function handleRoleChange(id: string, role: Role) {
    updateRole.mutate(
      { id, role },
      {
        onSuccess: () => toast.success("Role updated."),
        onError: (e) => toast.error(errorMessage(e, "Could not update role.")),
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

  function triggerAvatarUpload(userId: string) {
    setPendingAvatarFor(userId)
    avatarInputRef.current?.click()
  }

  async function onAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const targetId = pendingAvatarFor
    e.target.value = ""
    setPendingAvatarFor(null)
    if (!file || !targetId) return
    const r = await uploadAvatarFile(targetId, file)
    if (!r.ok) {
      toast.error(r.error)
      return
    }
    updateAvatar.mutate(
      { id: targetId, avatarUrl: r.url },
      {
        onSuccess: () => toast.success("Photo updated."),
        onError: (e) => toast.error(errorMessage(e, "Could not update photo.")),
      }
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
        Sign-in is handled by real Supabase Auth — passwords are verified and stored server-side, never in this
        app's code.
      </div>

      <input ref={avatarInputRef} type="file" accept={AVATAR_ACCEPT} className="hidden" onChange={onAvatarFileChange} />

      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold">Your Account</h3>
        <div className="flex items-center gap-3">
          <Avatar>
            {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
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
                        <div className="group/row-photo relative">
                          <Avatar className="size-7">
                            {p.avatarUrl && <AvatarImage src={p.avatarUrl} alt={p.name} />}
                            <AvatarFallback className="text-xs">{p.initials}</AvatarFallback>
                          </Avatar>
                          {isAdmin && (
                            <button
                              type="button"
                              title={`Set ${p.name}'s photo`}
                              onClick={() => triggerAvatarUpload(p.id)}
                              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover/row-photo:opacity-100"
                            >
                              <Camera className="size-3" />
                            </button>
                          )}
                        </div>
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
