import { Calendar, DollarSign, FileText } from "lucide-react"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { ContractorLogo } from "@/components/shared/ContractorLogo"
import { cn } from "@/lib/utils"
import { avgLeadTime, fmtMoney, vendorColor } from "@/lib/dashboard"
import { CONTRACT_TONE_CLASSES, contractExpenditure, contractStatusTone, daysUntil, invoicesForContract, utilizationColor } from "@/lib/contracts"
import type { Contract } from "@/types/contract"
import type { Invoice } from "@/types/invoice"

/** Immersive contract detail view — everything about one contract in one place, opened by clicking its row. */
export function ContractDetailSheet({
  open,
  contract,
  invoices,
  onOpenChange,
  onEdit,
  canEdit,
  logo,
}: {
  open: boolean
  contract: Contract | null
  invoices: Invoice[]
  onOpenChange: (open: boolean) => void
  onEdit: () => void
  canEdit: boolean
  logo?: string
}) {
  if (!contract) return <Dialog open={open} onOpenChange={onOpenChange} />

  const cost = Number(contract.value) || 0
  const spent = contractExpenditure(invoices, contract.contractNo)
  const pct = cost > 0 ? Math.min(100, (spent / cost) * 100) : 0
  const barColor = utilizationColor(pct)
  const rows = invoicesForContract(invoices, contract.contractNo).sort((a, b) => (b.invoiceDate || "").localeCompare(a.invoiceDate || ""))
  const lead = avgLeadTime(rows)
  const primaryVendor = (contract.vendor || "").split("/")[0].trim()
  const color = vendorColor(primaryVendor)
  const tone = contractStatusTone(contract.status)
  const daysLeft = daysUntil(contract.endDate)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-full overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span className="mt-1 h-10 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
            <div className="min-w-0">
              <DialogTitle className="flex flex-wrap items-center gap-2">
                {contract.contractNo}
                <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", CONTRACT_TONE_CLASSES[tone])}>
                  {contract.status || "—"}
                </span>
              </DialogTitle>
              <DialogDescription className="truncate">{contract.title || "No title"}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="flex items-center gap-2">
              <ContractorLogo vendor={primaryVendor || contract.vendor} logo={logo} color={color} size="sm" />
              <div>
                <div className="text-xs text-muted-foreground">Vendor</div>
                <div className="font-medium">{contract.vendor || "—"}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Contract Period</div>
                <div className="font-medium">
                  {contract.startDate || "—"} → {contract.endDate || "—"}
                  {daysLeft !== null && (
                    <span className={cn("ml-1", daysLeft < 0 ? "text-destructive" : daysLeft <= 30 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
                      ({daysLeft < 0 ? "expired" : `${daysLeft}d left`})
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="size-4 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Avg. Clearance Lead</div>
                <div className="font-medium">{lead !== null ? `${lead} days` : "—"}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Invoices Logged</div>
                <div className="font-medium">{rows.length}</div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Utilization</span>
              <span className="font-medium">
                {fmtMoney(spent)} {cost > 0 && <>/ {fmtMoney(cost)}</>}
              </span>
            </div>
            {cost > 0 ? (
              <>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct.toFixed(1)}%`, backgroundColor: barColor }} />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{pct.toFixed(1)}% utilized · {fmtMoney(Math.max(0, cost - spent))} remaining</div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">No contract value set.</p>
            )}
          </div>

          <div>
            <h4 className="mb-2 text-sm font-semibold">Invoices on this contract</h4>
            <div className="max-h-72 overflow-y-auto rounded-lg border">
              {rows.length ? (
                <div className="divide-y">
                  {rows.map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-3 p-2.5 text-sm">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{r.invoiceNo || `#${r.srNo}`}</div>
                        <div className="text-xs text-muted-foreground">{r.invoiceDate || "—"}</div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="tabular-nums text-xs">{fmtMoney(r.amountInclTax)}</span>
                        <StatusBadge status={r.status} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="p-4 text-center text-sm text-muted-foreground">No invoices logged against this contract yet.</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={onEdit}
            disabled={!canEdit}
            title={canEdit ? "Edit contract" : "Only Editors and Admins can edit contracts"}
          >
            Edit Contract
          </Button>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
