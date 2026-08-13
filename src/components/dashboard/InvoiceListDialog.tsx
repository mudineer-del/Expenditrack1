import { useNavigate } from "react-router-dom"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { fmtMoney } from "@/lib/dashboard"
import type { Invoice } from "@/types/invoice"

/** Cascading drill-down opened by clicking a chart segment — lists the invoices behind it,
 *  and clicking one of those goes to the real thing (InvoicesPage's own drawer, same deep-link
 *  the "Recent Invoices" table already uses) for full detail and editing. */
export function InvoiceListDialog({
  open,
  onOpenChange,
  title,
  invoices,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  invoices: Invoice[]
}) {
  const navigate = useNavigate()
  const total = invoices.reduce((s, r) => s + (Number(r.amountInclTax) || 0), 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-full overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {invoices.length.toLocaleString()} invoice{invoices.length !== 1 ? "s" : ""} · {fmtMoney(total)} total — click one to see its full details.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto rounded-lg border">
          {invoices.length ? (
            <div className="divide-y">
              {invoices.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    onOpenChange(false)
                    navigate("/invoices", { state: { openInvoiceId: r.id } })
                  }}
                  className="flex w-full items-center justify-between gap-3 p-2.5 text-left text-sm hover:bg-muted"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{r.invoiceNo || `#${r.srNo}`}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {r.vendor || "—"} · {r.invoiceDate || "—"}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="tabular-nums text-xs">{fmtMoney(r.amountInclTax)}</span>
                    <StatusBadge status={r.status} />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="p-4 text-center text-sm text-muted-foreground">No invoices in this segment.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
