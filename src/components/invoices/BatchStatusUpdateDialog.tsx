import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useReferenceLists } from "@/lib/referenceLists"
import type { Invoice } from "@/types/invoice"

export function BatchStatusUpdateDialog({
  open,
  invoices,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  invoices: Invoice[]
  onOpenChange: (open: boolean) => void
  onConfirm: (status: string) => Promise<void>
}) {
  const [selectedStatus, setSelectedStatus] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const { ref: refLists } = useReferenceLists()

  useEffect(() => {
    if (open) {
      setSelectedStatus("")
    }
  }, [open])

  async function handleConfirm() {
    if (!selectedStatus) {
      toast.error("Please select a status")
      return
    }

    setIsLoading(true)
    try {
      await onConfirm(selectedStatus)
      toast.success(`Updated ${invoices.length} invoice(s) to ${selectedStatus}`)
      onOpenChange(false)
    } catch (err) {
      toast.error("Failed to update invoices")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const statuses = [
    { value: "Under Clearance", label: "Under Clearance" },
    { value: "Returned", label: "Returned" },
    { value: "Cleared", label: "Cleared" },
  ]

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Update Invoice Status</AlertDialogTitle>
          <AlertDialogDescription>
            Update the status for {invoices.length} selected invoice{invoices.length !== 1 ? "s" : ""}.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="status">New Status</Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger id="status">
                <SelectValue placeholder="Select a status..." />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isLoading || !selectedStatus}>
            {isLoading ? "Updating..." : "Update"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
