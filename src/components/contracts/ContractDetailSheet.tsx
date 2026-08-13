import { Building2, Calendar, DollarSign, FileText } from "lucide-react"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { cn } from "@/lib/utils"
import { avgLeadTime, fmtMoney, vendorColor } from "@/lib/dashboard"
import { contractExpenditure, contractStatusTone, invoicesForContract } from "@/lib/contracts"
import type { Contract } from "@/types/contract"
import type { Invoice } from "@/types/invoice"

const TONE_CLASSES: Record<string, string> = {
  cleared: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  under: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  returned: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  other: "bg-muted text-muted-foreground",
}

function daysUntil(dateStr: string): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return Math.round((d.getTime() - Date.now()) / 86400000)
}

/** Immersive contract detail view — everything about one contract in one place, opened by clicking its row. */
export function ContractDetailSheet({
  open,
  contract,
  invoices,
  onOpenChange,
  onEdit,
  canEdit,
}: {
  open: boolean
  contract: Contract | null
  invoices: Invoice[]
  onOpenChange: (open: boolean) => void
  onEdit: () => void
  canEdit: boolean
}) {
  if (!contract) return <Sheet open={open} onOpenChange={onOpenChange} />

  const cost = Number(contract.value) || 0
  const spent = contractExpenditure(invoices, contract.contractNo)
  const pct = cost > 0 ? Math.min(100, (spent / cost) * 100) : 0
  const barColor = pct >= 90 ? "#c23b3b" : pct >= 70 ? "#c8781c" : "#1c8a4b"
  const rows = invoicesForContract(invoices, contract.contractNo).sort((a, b) => (b.invoiceDate || "").localeCompare(a.invoiceDate || ""))
  const lead = avgLeadTime(rows)
  const primaryVendor = (contract.vendor || "").split("/")[0].trim()
  const color = vendorColor(primaryVendor)
  const tone = contractStatusTone(contract.status)
  const daysLeft = daysUntil(contract.endDate)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <div className="flex items-start gap-3">
            <span className="mt-1 h-10 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
            <div className="min-w-0">
              <SheetTitle className="flex flex-wrap items-center gap-2">
                {contract.contractNo}
                <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", TONE_CLASSES[tone])}>
                  {contract.status || "—"}
                </span>
              </SheetTitle>
              <SheetDescription className="truncate">{contract.title || "No title"}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="grid gap-4 px-4">
          <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="flex items-center gap-2">
              <Building2 className="size-4 text-muted-foreground" />
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

        <SheetFooter className="px-4 pb-4">
          {canEdit && <Button onClick={onEdit}>Edit Contract</Button>}
          <SheetClose asChild>
            <Button variant="outline">Close</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
