import { Pencil, Trash2 } from "lucide-react"
import { TableCell, TableRow } from "@/components/ui/table"
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

/** Ported from the contract line-item markup inside renderVendors (index.html:4175-4204). */
export function ContractRow({
  contract,
  invoices,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: {
  contract: Contract
  invoices: Invoice[]
  canEdit: boolean
  canDelete: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const spent = contractExpenditure(invoices, contract.contractNo)
  const cost = Number(contract.value) || 0
  const pct = cost > 0 ? Math.min(100, (spent / cost) * 100) : 0
  const barColor = pct >= 90 ? "#c23b3b" : pct >= 70 ? "#c8781c" : "#1c8a4b"
  const rows = invoicesForContract(invoices, contract.contractNo)
  const lead = avgLeadTime(rows)
  const primaryVendor = (contract.vendor || "").split("/")[0].trim()
  const color = vendorColor(primaryVendor)
  const tone = contractStatusTone(contract.status)

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          <div>
            <div className="font-medium">{contract.contractNo}</div>
            <div className="text-xs text-muted-foreground">
              {contract.vendor || "—"}
              {contract.title ? ` · ${contract.title}` : ""}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-right font-mono">{cost > 0 ? fmtMoney(cost) : "—"}</TableCell>
      <TableCell className="text-right font-mono">{fmtMoney(spent)}</TableCell>
      <TableCell className="text-right">{rows.length}</TableCell>
      <TableCell className="text-right">{lead !== null ? `${lead}d` : "—"}</TableCell>
      <TableCell>
        {cost > 0 ? (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full" style={{ width: `${pct.toFixed(1)}%`, backgroundColor: barColor }} />
            </div>
            <span className="w-9 text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">No value set</span>
        )}
      </TableCell>
      <TableCell>
        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", TONE_CLASSES[tone])}>
          {contract.status || "—"}
        </span>
      </TableCell>
      <TableCell>
        <div className="flex justify-end gap-1">
          {canEdit && (
            <button className="rounded p-1 hover:bg-muted" title="Edit" onClick={onEdit}>
              <Pencil className="size-4" />
            </button>
          )}
          {canDelete && (
            <button className="rounded p-1 text-destructive hover:bg-destructive/10" title="Delete" onClick={onDelete}>
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}
