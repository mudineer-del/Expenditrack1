import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/ui/password-input"
import { errorMessage } from "@/lib/utils"
import { useSetUserPassword } from "@/hooks/useAdminPassword"
import type { AppUser } from "@/types/user"

export function SetPasswordDialog({
  user,
  open,
  onOpenChange,
}: {
  user: AppUser | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const setUserPassword = useSetUserPassword()

  function reset() {
    setPassword("")
    setConfirm("")
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  function handleSubmit() {
    if (!user) return
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.")
      return
    }
    if (password !== confirm) {
      toast.error("Passwords don't match.")
      return
    }
    setUserPassword.mutate(
      { userId: user.id, newPassword: password },
      {
        onSuccess: () => {
          toast.success(`Password updated for ${user.name}.`)
          handleOpenChange(false)
        },
        onError: (e) => toast.error(errorMessage(e, "Could not set password.")),
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set password</DialogTitle>
          <DialogDescription>
            {user && (
              <>
                Sets a new password for <b>{user.name}</b> ({user.email}) immediately — they won't get an email, and
                any other device they're signed in on stays signed in.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="new-password">New password</Label>
            <PasswordInput
              id="new-password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <PasswordInput
              id="confirm-password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={setUserPassword.isPending}>
            {setUserPassword.isPending ? "Setting…" : "Set password"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
