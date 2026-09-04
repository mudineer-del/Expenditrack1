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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/ui/password-input"
import { errorMessage } from "@/lib/utils"
import { useCreateAccount } from "@/hooks/useAdminAccounts"

/** Admin-initiated account creation — the new account lands as a normal
 *  'pending' profile, exactly like a self-signup (see admin-create-user Edge
 *  Function), so it shows up in "Pending Approval" for the same Review &
 *  Approve step (role, departments, areas) a self-signup already goes through. */
export function AddAccountDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const createAccount = useCreateAccount()

  function reset() {
    setName("")
    setEmail("")
    setPassword("")
    setConfirm("")
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  function handleSubmit() {
    if (!name.trim()) {
      toast.error("Name is required.")
      return
    }
    if (!email.trim().includes("@")) {
      toast.error("Enter a valid email address.")
      return
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.")
      return
    }
    if (password !== confirm) {
      toast.error("Passwords don't match.")
      return
    }
    createAccount.mutate(
      { name: name.trim(), email: email.trim(), password },
      {
        onSuccess: () => {
          toast.success(`${name.trim()}'s account created — review it under Pending Approval to finish setup.`)
          handleOpenChange(false)
        },
        onError: (e) => toast.error(errorMessage(e, "Could not create the account.")),
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add account</DialogTitle>
          <DialogDescription>
            Creates the account with this password, ready to sign in — you'll still need to approve it below to set
            their role, departments, and areas before they see any data.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="new-account-name">Name</Label>
            <Input id="new-account-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="new-account-email">Email</Label>
            <Input
              id="new-account-email"
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@ogdcl.com"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="new-account-password">Password</Label>
            <PasswordInput
              id="new-account-password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="new-account-confirm">Confirm password</Label>
            <PasswordInput
              id="new-account-confirm"
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
          <Button onClick={handleSubmit} disabled={createAccount.isPending}>
            {createAccount.isPending ? "Creating…" : "Create account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
