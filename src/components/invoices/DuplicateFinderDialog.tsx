import { useMemo, useState } from "react"
import { Ban, CheckCircle2, Eye, Trash2 } from "lucide-react"
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
import { StatusBadge } from "@/components/shared/StatusBadge"
import { fmtMoney } from "@/lib/dashboard"
import { findDuplicateGroups, loadIgnoredDuplicateIds, saveIgnoredDuplicateIds } from "@/lib/invoiceIO"
import type { Invoice } from "@/types/invoice"

export function DuplicateFinderDialog({
  open,
  onOpenChange,
  invoices,
  canDelete,
  onView,
  onDelete,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoices: Invoice[]
  canDelete: boolean
  onView: (inv: Invoice) => void
  onDelete: (inv: Invoice) => void
}) {
  const [ignoredIds, setIgnoredIds] = useState<Set<string>>(() => loadIgnoredDuplicateIds())

  const visibleInvoices = useMemo(() => invoices.filter((inv) => !ignoredIds.has(inv.id)), [invoices, ignoredIds])
  const groups = useMemo(() => findDuplicateGroups(visibleInvoices), [visibleInvoices])
  const totalRows = groups.reduce((s, g) => s + g.rows.length, 0)
  const exactCount = groups.filter((g) => g.exact).length

  function handleIgnore(inv: Invoice) {
    const next = new Set(ignoredIds)
    next.add(inv.id)
    setIgnoredIds(next)
    saveIgnoredDuplicateIds(next)
  }

  function handleRestoreIgnored() {
    setIgnoredIds(new Set())
    saveIgnoredDuplicateIds(new Set())
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-full overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Duplicate Invoice Finder</DialogTitle>
          <DialogDescription>
            {groups.length
              ? `${groups.length} group${groups.length !== 1 ? "s" : ""} · ${totalRows} invoice${totalRows !== 1 ? "s" : ""} · ${exactCount} exact match${exactCount !== 1 ? "es" : ""}`
              : "Scanning all invoices for the same vendor & invoice no."}
          </DialogDescription>
        </DialogHeader>

        {groups.length ? (
          <div className="grid gap-3">
            {groups.map((g, i) => (
              <div key={i} className="rounded-lg border p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm">
                    <b>{g.rows[0].vendor || "—"}</b> · Invoice No. <b>{g.rows[0].invoiceNo || "—"}</b>{" "}
                    <span className="text-muted-foreground">({g.rows.length}×)</span>
                  </div>
                  <Badge variant={g.exact ? "destructive" : "outline"}>
                    {g.exact ? "Exact duplicate" : "Same # · different amount"}
                  </Badge>
                </div>
                <div className="grid gap-1">
                  {g.rows.map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="text-muted-foreground">Sr. {r.srNo || "—"}</span>
                        <span className="text-muted-foreground">{r.invoiceDate || "—"}</span>
                        <span className="tabular-nums font-medium">{fmtMoney(r.amountInclTax)}</span>
                        <StatusBadge status={r.status} />
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button className="rounded p-1 hover:bg-muted" title="View" onClick={() => onView(r)}>
                          <Eye className="size-4" />
                        </button>
                        <button
                          className="rounded p-1 text-muted-foreground hover:bg-muted"
                          title="Ignore — not a duplicate, stop flagging this one"
                          onClick={() => handleIgnore(r)}
                        >
                          <Ban className="size-4" />
                        </button>
                        {canDelete && (
                          <button
                            className="rounded p-1 text-destructive hover:bg-destructive/10"
                            title="Delete"
                            onClick={() => onDelete(r)}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
            <CheckCircle2 className="size-8" />
            <p className="font-medium text-foreground">No duplicates found</p>
            <p className="text-sm">No two invoices share the same vendor and invoice number.</p>
          </div>
        )}

        <DialogFooter className="sm:justify-between">
          {ignoredIds.size > 0 ? (
            <button
              className="text-left text-xs text-muted-foreground underline-offset-2 hover:underline"
              onClick={handleRestoreIgnored}
            >
              {ignoredIds.size} invoice{ignoredIds.size !== 1 ? "s" : ""} ignored — restore
            </button>
          ) : (
            <span />
          )}
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
