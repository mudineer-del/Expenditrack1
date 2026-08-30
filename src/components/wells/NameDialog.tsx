import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

/** A single required text field in a Dialog — shared by "+ Add Department" and "+ Add
 *  Service Description", both of which are just a name. */
export function NameDialog({
  open,
  title,
  label,
  placeholder,
  submitting,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  title: string
  label: string
  placeholder?: string
  submitting?: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (name: string) => void
}) {
  const [value, setValue] = useState("")

  useEffect(() => {
    if (open) setValue("")
  }, [open])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return
    onSubmit(trimmed)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">{label} entry form</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name-dialog-input">{label}</Label>
            <Input id="name-dialog-input" autoFocus value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!value.trim() || submitting}>
              Save
            </Button>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
