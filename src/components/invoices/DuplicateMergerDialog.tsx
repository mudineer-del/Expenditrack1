import { CheckCircle2, Merge } from "lucide-react"
import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { findDuplicates, mergeInvoices } from "@/lib/duplicateMerger"
import type { Invoice } from "@/types/invoice"

export function DuplicateMergerDialog({
  open,
  onOpenChange,
  invoices,
  onMerge,
  onDelete,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoices: Invoice[]
  onMerge: (primary: Invoice, secondary: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [duplicates, setDuplicates] = useState<ReturnType<typeof findDuplicates>>([])
  const [selected, setSelected] = useState<{ groupIdx: number; keepId: string } | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setDuplicates(findDuplicates(invoices))
      setSelected(null)
    }
  }, [open, invoices])

  const handleMerge = async () => {
    if (!selected) return
    const group = duplicates[selected.groupIdx]
    const keepInv = group.invoices.find((i) => i.id === selected.keepId)
    const deleteInv = group.invoices.find((i) => i.id !== selected.keepId)
    if (!keepInv || !deleteInv) return

    setBusy(true)
    try {
      const merged = mergeInvoices(keepInv, deleteInv)
      await onMerge(merged, deleteInv.id)
      setDuplicates(duplicates.filter((_, i) => i !== selected.groupIdx))
      setSelected(null)
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this invoice? This cannot be undone.")) return
    setBusy(true)
    try {
      await onDelete(id)
      setDuplicates(
        duplicates
          .map((d) => ({
            ...d,
            invoices: d.invoices.filter((i) => i.id !== id),
          }))
          .filter((d) => d.invoices.length > 1)
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="size-5 text-primary" />
            Merge Duplicate Invoices
          </DialogTitle>
          <DialogDescription>
            {duplicates.length === 0
              ? "No duplicates detected in your invoices."
              : `Found ${duplicates.length} potential duplicate group(s). Select which to keep and merge.`}
          </DialogDescription>
        </DialogHeader>

        {duplicates.length === 0 ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="size-12 mx-auto mb-3 text-green-600" />
            <p className="text-sm text-muted-foreground">No duplicates detected!</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            {duplicates.map((group, groupIdx) => (
              <div key={groupIdx} className="rounded-lg border bg-card p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant={group.confidence === "high" ? "default" : "secondary"}
                      >
                        {group.confidence} confidence
                      </Badge>
                      <p className="text-sm font-semibold">{group.reason}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {group.invoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center gap-3 p-2 rounded border hover:bg-muted/50"
                    >
                      <input
                        type="radio"
                        name={`group-${groupIdx}`}
                        value={inv.id}
                        checked={selected?.groupIdx === groupIdx && selected.keepId === inv.id}
                        onChange={(e) => setSelected({ groupIdx, keepId: e.currentTarget.value })}
                        id={inv.id}
                        className="cursor-pointer"
                      />
                      <label
                        htmlFor={inv.id}
                        className="flex-1 cursor-pointer text-sm"
                      >
                        <div className="font-medium">{inv.vendor}</div>
                        <div className="text-xs text-muted-foreground">
                          #{inv.invoiceNo} • {inv.invoiceDate} •{" "}
                          ${inv.amountExclTax || "0"} • {inv.status}
                        </div>
                      </label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(inv.id)}
                        disabled={busy}
                        className="text-destructive hover:text-destructive"
                      >
                        Delete
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {selected && (
            <Button onClick={handleMerge} disabled={busy}>
              <Merge className="size-4 mr-2" />
              Merge Selected
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
