import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { errorMessage } from "@/lib/utils"
import { useUpdateProfileDetails } from "@/hooks/useProfiles"
import type { AppUser } from "@/types/user"

/** Opened by clicking a row in the Users page's "All Users" table — edits the profile
 *  fields the table shows blank ("—") when missing (department, designation) along with
 *  name and phone. Role/status/access are deliberately not here — those already have
 *  their own dedicated controls on the row (Select, disable button, access panel). */
export function EditUserDialog({
  user,
  open,
  onOpenChange,
}: {
  user: AppUser | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const updateDetails = useUpdateProfileDetails()
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [dept, setDept] = useState("")
  const [designation, setDesignation] = useState("")

  // Re-initialize only when a *different* user is opened — not on every open/close
  // toggle, so an accidental close (Escape, click outside) while editing doesn't lose it.
  const lastIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (!open || !user) return
    if (lastIdRef.current === user.id) return
    lastIdRef.current = user.id
    setName(user.name)
    setPhone(user.phone || "")
    setDept(user.dept || "")
    setDesignation(user.designation || "")
  }, [open, user])

  function handleSubmit() {
    if (!user) return
    if (!name.trim()) {
      toast.error("Name is required.")
      return
    }
    updateDetails.mutate(
      { id: user.id, name: name.trim(), phone: phone.trim(), dept: dept.trim(), designation: designation.trim() },
      {
        onSuccess: () => {
          toast.success("Details updated.")
          onOpenChange(false)
        },
        onError: (e) => toast.error(errorMessage(e, "Could not update details.")),
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit {user?.name || "User"}</DialogTitle>
          <DialogDescription>
            Fill in whatever's missing — sign-in email and role are changed elsewhere on this page.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="edit-user-name">Name</Label>
            <Input id="edit-user-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="edit-user-email">Sign-in Email</Label>
            <Input id="edit-user-email" value={user?.email || ""} disabled />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="edit-user-phone">Phone</Label>
            <Input id="edit-user-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+92 ..." />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="edit-user-dept">Department</Label>
            <Input id="edit-user-dept" value={dept} onChange={(e) => setDept(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="edit-user-designation">Designation</Label>
            <Input
              id="edit-user-designation"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="e.g. Chief Engineer"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={updateDetails.isPending}>
            {updateDetails.isPending ? "Saving…" : "Save"}
          </Button>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
