import { Scale, TrendingUp, Wallet, Wallet2 } from "lucide-react"
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import wellCostIllustration from "@/assets/well-cost-illustration.webp"
import wellIconPumpjack from "@/assets/well-icon-pumpjack.webp"
import { KpiTile } from "@/components/dashboard/KpiTile"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { WellCostCompareDialog } from "@/components/wells/WellCostCompareDialog"
import { cn, errorMessage } from "@/lib/utils"
import { utilizationColor } from "@/lib/contracts"
import { buildCostCentreTotals, fmtCurrency, rollup, wellStatusTone, WELL_STATUS_TONE_CLASSES } from "@/lib/wellCost"
import { useWellCostCentresQuery } from "@/hooks/useWellCostCentres"
import { useWellCostTransactionsQuery } from "@/hooks/useWellCostTransactions"
import { useWellsQuery } from "@/hooks/useWells"
import type { Well } from "@/types/well"

/** Well Cost module's landing page: a portfolio-level view across every (non-archived)
 *  well, each rolled up from its own well_cost_centres rows — see rollup() in
 *  lib/wellCost.ts, the same helper each department tab on the Structure page uses. */
export default function WellDashboardPage() {
  const navigate = useNavigate()
  const [compareOpen, setCompareOpen] = useState(false)
  const wellsQuery = useWellsQuery()
  const costCentresQuery = useWellCostCentresQuery()
  const transactionsQuery = useWellCostTransactionsQuery()

  const wells = (wellsQuery.data ?? []).filter((w) => !w.archived)
  const costCentres = costCentresQuery.data ?? []
  const transactions = transactionsQuery.data ?? []
  const costCentreTotals = useMemo(() => buildCostCentreTotals(transactions), [transactions])

  const rows = useMemo(() => {
    return wells
      .map((w) => ({ well: w, r: rollup(costCentres.filter((c) => c.wellId === w.id), costCentreTotals) }))
      .sort((a, b) => a.well.name.localeCompare(b.well.name))
  }, [wells, costCentres, costCentreTotals])

  const totals = useMemo(
    () => rollup(costCentres.filter((c) => wells.some((w) => w.id === c.wellId)), costCentreTotals),
    [costCentres, wells, costCentreTotals]
  )

  function openWell(well: Well) {
    navigate("/well-cost/structure", { state: { wellId: well.id } })
  }

  if (wellsQuery.isLoading || costCentresQuery.isLoading || transactionsQuery.isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  if (wellsQuery.isError || costCentresQuery.isError || transactionsQuery.isError) {
    const firstError = wellsQuery.error ?? costCentresQuery.error ?? transactionsQuery.error
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        <p>
          Could not load well cost data. Check your connection to Supabase in Settings → Cloud Sync, and that
          supabase/well_cost_setup.sql has been run.
        </p>
        {firstError && <p className="mt-2 font-mono text-xs opacity-80">{errorMessage(firstError)}</p>}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile
          icon={<img src={wellIconPumpjack} alt="" className="h-full w-full rounded-xl object-cover md:rounded-md" />}
          label="Total Wells"
          value={wells.length}
          accent="var(--chart-1)"
        />
        <KpiTile icon={<Wallet />} label="Total Budget" value={fmtCurrency(totals.budget, "USD")} accent="var(--chart-2)" />
        <KpiTile icon={<Wallet2 />} label="Actual + Commitments" value={fmtCurrency(totals.actual + totals.commitments, "USD")} accent="var(--chart-3)" />
        <KpiTile icon={<TrendingUp />} label="Utilization" value={`${totals.utilizationPct.toFixed(1)}%`} accent="var(--chart-4)" />
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm md:rounded-lg md:shadow-none">
        <div className="flex items-center justify-between gap-2 border-b p-4">
          <h3 className="text-base font-bold md:text-sm md:font-semibold">Wells</h3>
          <Button size="sm" variant="outline" disabled={!rows.length} onClick={() => setCompareOpen(true)}>
            <Scale /> Compare Cost
          </Button>
        </div>
        {rows.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Well</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">Commitments</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead>Utilization</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ well, r }) => {
                const tone = wellStatusTone(well.status)
                return (
                  <TableRow key={well.id} className="cursor-pointer" onClick={() => openWell(well)}>
                    <TableCell>
                      <div className="font-medium">{well.name}</div>
                      {well.code && <div className="text-xs text-muted-foreground">{well.code}</div>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{fmtCurrency(r.budget, "USD")}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtCurrency(r.actual, "USD")}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtCurrency(r.commitments, "USD")}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtCurrency(r.available, "USD")}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${Math.min(100, r.utilizationPct).toFixed(1)}%`, backgroundColor: utilizationColor(r.utilizationPct) }}
                          />
                        </div>
                        <span className="text-xs tabular-nums text-muted-foreground">{r.budget > 0 ? `${r.utilizationPct.toFixed(0)}%` : "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", WELL_STATUS_TONE_CLASSES[tone])}>
                        {well.status || "—"}
                      </span>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="flex flex-col items-center gap-3 p-10 text-center text-muted-foreground">
            <img src={wellCostIllustration} alt="" className="h-36 w-36 object-contain" />
            <h4 className="font-medium text-foreground">No wells yet</h4>
            <p className="text-sm">Add a well under Manage Wells to get started.</p>
          </div>
        )}
      </div>

      <WellCostCompareDialog open={compareOpen} onOpenChange={setCompareOpen} rows={rows} />
    </div>
  )
}
