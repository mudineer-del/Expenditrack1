import { AlertTriangle, Trash2 } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import type { Invoice } from "@/types/invoice"

export function BulkDeleteDialog({
  open,
  onOpenChange,
  invoices,
  onDelete,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoices: Invoice[]
  onDelete: (ids: string[]) => Promise<void>
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")
  const [busy, setBusy] = useState(false)

  const filtered = invoices.filter((inv) => {
    const q = searchQuery.toLowerCase()
    return (
      String(inv.vendor || "").toLowerCase().includes(q) ||
      String(inv.invoiceNo || "").toLowerCase().includes(q) ||
      String(inv.srNo || "").includes(q)
    )
  })

  const toggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filtered.map((inv) => inv.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const toggleInvoice = (id: string) => {
    const newIds = new Set(selectedIds)
    if (newIds.has(id)) {
      newIds.delete(id)
    } else {
      newIds.add(id)
    }
    setSelectedIds(newIds)
  }

  const handleDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} invoice(s)? This cannot be undone.`)) return
    setBusy(true)
    try {
      await onDelete(Array.from(selectedIds))
      setSelectedIds(new Set())
      setSearchQuery("")
      onOpenChange(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="size-5 text-destructive" />
            Bulk Delete Invoices
          </DialogTitle>
          <DialogDescription>
            Select invoices to delete. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <Input
            placeholder="Filter by vendor, invoice #, or sr no..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b">
              <Checkbox
                checked={selectedIds.size > 0 && selectedIds.size === filtered.length}
                onCheckedChange={(checked) => toggleAll(checked as boolean)}
              />
              <span className="text-sm font-semibold">
                {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select all"}
              </span>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No invoices match filter</p>
              ) : (
                filtered.map((inv) => (
                  <div key={inv.id} className="flex items-center gap-2 p-2 rounded hover:bg-background/50 text-sm">
                    <Checkbox
                      checked={selectedIds.has(inv.id)}
                      onCheckedChange={() => toggleInvoice(inv.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{inv.vendor}</div>
                      <div className="text-xs text-muted-foreground">
                        #{inv.invoiceNo} • {inv.invoiceDate} • {inv.status}
                      </div>
                    </div>
                    <div className="text-sm font-mono text-right flex-shrink-0">
                      {inv.amountExclTax || "$0"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {selectedIds.size > 0 && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 flex gap-2">
              <AlertTriangle className="size-4 text-destructive flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-destructive">Deleting {selectedIds.size} invoice(s)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  This will permanently remove these records from the database.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={selectedIds.size === 0 || busy}
          >
            <Trash2 className="size-4 mr-2" />
            Delete {selectedIds.size > 0 ? selectedIds.size : "Invoices"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
