import { useMemo } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { SegmentSummaryPanel } from "@/components/shared/SegmentSummaryPanel"
import {
  describeCategoryBreakdown,
  describeMonthlySpend,
  fmtCurrency,
  type CategoryCostBreakdown,
  type MonthlySpendPoint,
} from "@/lib/wellCost"

export type WellCostDrillPayload =
  | { kind: "month"; title: string; point: MonthlySpendPoint }
  | { kind: "category"; title: string; entry: CategoryCostBreakdown; wellNameById: Map<string, string> }

/** Drill-down for the Well Cost dashboard's charts — a descriptive summary (entry count,
 *  actual vs. committed or budget utilization, which wells/remarks are behind it) plus the
 *  raw rows, the same "click a chart, read a summary" pattern InvoiceListDialog/
 *  ReportDetailDrawer give the invoice-based charts. */
export function WellCostDrillDialog({
  payload,
  currency,
  onOpenChange,
}: {
  payload: WellCostDrillPayload | null
  currency: string
  onOpenChange: (open: boolean) => void
}) {
  const sentences = useMemo(() => {
    if (!payload) return []
    return payload.kind === "month"
      ? describeMonthlySpend(payload.point, currency)
      : describeCategoryBreakdown(payload.entry, currency, payload.wellNameById)
  }, [payload, currency])

  return (
    <Dialog open={!!payload} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-full overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{payload?.title}</DialogTitle>
          <DialogDescription>
            {payload?.kind === "month"
              ? `${payload.point.transactions.length} entr${payload.point.transactions.length !== 1 ? "ies" : "y"} logged.`
              : payload
                ? `${payload.entry.costCentres.length} cost centre${payload.entry.costCentres.length !== 1 ? "s" : ""}.`
                : ""}
          </DialogDescription>
        </DialogHeader>
        <SegmentSummaryPanel sentences={sentences} />
        <div className="max-h-[50vh] overflow-y-auto rounded-lg border">
          {payload?.kind === "month" ? (
            payload.point.transactions.length ? (
              <div className="divide-y">
                {payload.point.transactions
                  .slice()
                  .sort((a, b) => (a.entryDate < b.entryDate ? 1 : -1))
                  .map((t) => (
                    <div key={t.id} className="flex items-center justify-between gap-3 p-2.5 text-sm">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{t.entryDate || "—"}</div>
                        {t.remarks && <div className="truncate text-xs text-muted-foreground">{t.remarks}</div>}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                          {t.kind}
                        </span>
                        <span className="tabular-nums text-xs">{fmtCurrency(t.amount, currency)}</span>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="p-4 text-center text-sm text-muted-foreground">No entries in this segment.</p>
            )
          ) : payload?.kind === "category" ? (
            payload.entry.costCentres.length ? (
              <div className="divide-y">
                {payload.entry.costCentres.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-3 p-2.5 text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{c.costCentre || c.description || "Cost centre"}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {payload.wellNameById.get(c.wellId) || c.wellId}
                        {c.vendor ? ` · ${c.vendor}` : ""}
                      </div>
                    </div>
                    <span className="shrink-0 tabular-nums text-xs">{fmtCurrency(c.plannedBudget, currency)} budget</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="p-4 text-center text-sm text-muted-foreground">No cost centres in this segment.</p>
            )
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
