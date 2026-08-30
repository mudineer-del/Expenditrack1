import { utilizationColor } from "@/lib/contracts"
import { fmtCurrency, type CostRollup } from "@/lib/wellCost"
import { cn } from "@/lib/utils"

/** Four rollup figures as cards — reused for both the well-level summary and each
 *  department tab's summary (section 9/10), just over a different (pre-filtered) subset
 *  of cost centres. Amounts are summed and shown as USD regardless of each row's own
 *  currency (see WellCostCentreDrawer) — a known simplification with no FX conversion. */
export function CostSummaryCards({ rollup, size = "md" }: { rollup: CostRollup; size?: "md" | "sm" }) {
  const items: { label: string; value: number }[] = [
    { label: "Budget", value: rollup.budget },
    { label: "Actual", value: rollup.actual },
    { label: "Commitments", value: rollup.commitments },
    { label: "Available", value: rollup.available },
  ]
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className={cn("rounded-xl border bg-card", size === "md" ? "p-3.5" : "p-3")}>
          <div className="text-xs text-muted-foreground">{item.label}</div>
          <div className={cn("mt-0.5 truncate font-semibold tabular-nums", size === "md" ? "text-lg" : "text-base")}>
            {fmtCurrency(item.value, "USD")}
          </div>
        </div>
      ))}
    </div>
  )
}

/** (Actual + Commitments) / Budget * 100, as a labeled bar. */
export function UtilizationBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(100, pct).toFixed(1)}%`, backgroundColor: utilizationColor(pct) }}
        />
      </div>
      <span className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums">{pct.toFixed(1)}%</span>
    </div>
  )
}
