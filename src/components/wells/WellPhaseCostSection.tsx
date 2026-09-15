import { Layers, ListChecks, PieChart as PieChartIcon, TriangleAlert } from "lucide-react"
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { KpiTile } from "@/components/dashboard/KpiTile"
import { Button } from "@/components/ui/button"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  buildPhaseRankSummary,
  buildWellPhaseCosts,
  fmtCurrency,
  type WellPhaseCost,
} from "@/lib/wellCost"
import type { WellCostCentre, WellCostTransaction } from "@/types/wellCost"
import type { WellMilestone } from "@/types/wellMilestone"
import type { Well } from "@/types/well"

const ALL_WELLS = "__all__"

const phaseConfig = {
  actual: { label: "Actual", color: "var(--dataviz-3)" },
  commitment: { label: "Commitments", color: "var(--dataviz-5)" },
} satisfies ChartConfig

function fmtDate(d: string | null): string {
  if (!d) return ""
  try {
    return new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
  } catch {
    return d
  }
}

/** Cost broken down by drilling phase/section — 1st phase, 2nd phase, and so on, bounded
 *  by whatever well_milestones the well has logged (Spud, casing points, section TDs,
 *  cementation...). A single well drills into its own phase-by-phase story; "All Wells"
 *  instead compares everyone's Nth phase side by side (see buildPhaseRankSummary's own
 *  comment for why that's rank-based rather than label-based). Self-contained, same
 *  pattern-level as ServiceCostSummary — no chart-slot/Format-dialog wiring, since a
 *  well/phase selector doesn't fit that system's dimension/measure shape. */
export function WellPhaseCostSection({
  currency = "USD",
  wells,
  milestones,
  costCentres,
  transactions,
}: {
  currency?: string
  wells: Well[]
  milestones: WellMilestone[]
  costCentres: WellCostCentre[]
  transactions: WellCostTransaction[]
}) {
  const navigate = useNavigate()

  const wellsWithPhases = useMemo(() => {
    return wells
      .map((w) => ({ well: w, phases: buildWellPhaseCosts(w.id, milestones, costCentres, transactions) }))
      .filter((x) => x.phases.length > 0)
  }, [wells, milestones, costCentres, transactions])

  const [selectedWellId, setSelectedWellId] = useState<string>(ALL_WELLS)
  const activeWellId = wellsWithPhases.some((x) => x.well.id === selectedWellId) ? selectedWellId : ALL_WELLS

  const singleWell = wellsWithPhases.find((x) => x.well.id === activeWellId) ?? null
  const rankSummary = useMemo(
    () => (singleWell ? [] : buildPhaseRankSummary(wellsWithPhases.map((x) => x.phases))),
    [singleWell, wellsWithPhases]
  )

  const chartData = singleWell
    ? singleWell.phases.map((p) => ({ key: p.id, name: p.label, actual: p.actual, commitment: p.commitment }))
    : rankSummary.map((r) => ({ key: String(r.order), name: r.label, actual: r.actual, commitment: r.commitment }))

  const missingDataWells = wells.filter((w) => !wellsWithPhases.some((x) => x.well.id === w.id))

  const stats = useMemo(() => {
    const all: WellPhaseCost[] = singleWell ? singleWell.phases : wellsWithPhases.flatMap((x) => x.phases)
    const totalSpend = all.reduce((s, p) => s + p.actual + p.commitment, 0)
    const phaseCount = singleWell ? singleWell.phases.length : rankSummary.length
    const top = singleWell
      ? singleWell.phases.reduce<WellPhaseCost | null>((best, p) => ((p.actual + p.commitment > (best?.actual ?? 0) + (best?.commitment ?? 0)) ? p : best), null)
      : null
    const topRank = !singleWell
      ? rankSummary.reduce<(typeof rankSummary)[number] | null>((best, r) => (r.actual + r.commitment > (best?.actual ?? 0) + (best?.commitment ?? 0) ? r : best), null)
      : null
    return {
      totalSpend,
      phaseCount,
      topLabel: top?.label ?? topRank?.label ?? "—",
      topSpend: top ? top.actual + top.commitment : topRank ? topRank.actual + topRank.commitment : 0,
    }
  }, [singleWell, wellsWithPhases, rankSummary])

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile icon={<Layers />} label="Phases Tracked" value={stats.phaseCount} accent="var(--dataviz-2)" />
        <KpiTile icon={<PieChartIcon />} label="Section Cost" value={fmtCurrency(stats.totalSpend, currency)} accent="var(--dataviz-4)" />
        <KpiTile
          icon={<ListChecks />}
          label="Costliest Phase"
          value={stats.topLabel}
          valueClassName="text-base md:text-[length:var(--tile-value)]"
          sub={stats.topSpend > 0 ? fmtCurrency(stats.topSpend, currency) : undefined}
          accent="var(--chart-3)"
        />
        <KpiTile
          icon={<TriangleAlert />}
          label="Wells Missing Data"
          value={missingDataWells.length}
          sub={missingDataWells.length ? "add Well Data to unlock" : "all wells tracked"}
          accent="var(--status-returned)"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm md:rounded-lg md:shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
          <div>
            <h3 className="text-base font-bold md:text-sm md:font-semibold">Section / Phase Cost</h3>
            <p className="text-xs text-muted-foreground">
              Cost between drilling milestones. Dates after the start and up to the end are included. All-well comparisons group by phase order, which may represent different sections.
            </p>
          </div>
          <Select value={activeWellId} onValueChange={setSelectedWellId}>
            <SelectTrigger className="w-full sm:w-64" aria-label="Well for phase analysis">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_WELLS}>All Wells (by phase rank)</SelectItem>
              {wellsWithPhases.map((x) => (
                <SelectItem key={x.well.id} value={x.well.id}>
                  {x.well.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {(singleWell ? singleWell.phases : wellsWithPhases.flatMap((x) => x.phases)).some((p) => p.usesPlannedDate) && (
          <p role="status" className="border-b bg-muted/40 p-4 text-sm">Some phase boundaries use planned dates because actual dates are missing. Cost allocation may change when actual milestone dates are recorded.</p>
        )}

        {chartData.length ? (
          <div className="flex flex-col gap-4 p-4">
            <ChartContainer config={phaseConfig} className="h-64 w-full">
              <BarChart data={chartData} margin={{ left: 4 }} barGap={4}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={10} interval={0} angle={-15} textAnchor="end" height={56} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} width={72} tickFormatter={(v) => fmtCurrency(v, currency)} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name, item) => (
                        <div className="flex w-full items-center justify-between gap-3">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <span className="size-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: item.color }} />
                            {phaseConfig[name as keyof typeof phaseConfig]?.label ?? name}
                          </span>
                          <span className="font-medium tabular-nums text-foreground">{fmtCurrency(Number(value), currency)}</span>
                        </div>
                      )}
                    />
                  }
                />
                <Bar dataKey="actual" stackId="phase" fill="var(--color-actual)" radius={[0, 0, 4, 4]} />
                <Bar dataKey="commitment" stackId="phase" fill="var(--color-commitment)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>

            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Phase</TableHead>
                    {singleWell && <TableHead>Date Range</TableHead>}
                    {singleWell && <TableHead className="text-right">Depth</TableHead>}
                    {!singleWell && <TableHead className="text-right">Wells</TableHead>}
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Commitments</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {singleWell
                    ? singleWell.phases.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.label}{p.usesPlannedDate && <span className="block text-xs font-normal text-muted-foreground">Uses planned date</span>}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {fmtDate(p.startDate)} {p.startDate || p.endDate ? "→" : ""} {fmtDate(p.endDate) || "ongoing"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{p.actualDepth !== "" ? `${p.actualDepth} m` : "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmtCurrency(p.actual, currency)}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmtCurrency(p.commitment, currency)}</TableCell>
                          <TableCell className="text-right font-medium tabular-nums">{fmtCurrency(p.actual + p.commitment, currency)}</TableCell>
                        </TableRow>
                      ))
                    : rankSummary.map((r) => (
                        <TableRow key={r.order}>
                          <TableCell className="font-medium">{r.label}</TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">{r.wellCount}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmtCurrency(r.actual, currency)}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmtCurrency(r.commitment, currency)}</TableCell>
                          <TableCell className="text-right font-medium tabular-nums">{fmtCurrency(r.actual + r.commitment, currency)}</TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 p-10 text-center text-muted-foreground">
            <h4 className="font-medium text-foreground">No drilling phases logged yet</h4>
            <p className="max-w-sm text-sm">
              Add Well Data (Spud date, casing points, section TDs) on a well's Cost Structure page to break its cost down
              phase by phase.
            </p>
          </div>
        )}

        {missingDataWells.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-t p-4 text-xs text-muted-foreground">
            <span>Missing phase data:</span>
            {missingDataWells.map((w) => (
              <Button
                key={w.id}
                size="sm"
                variant="outline"
                className="min-h-9 px-3 text-xs"
                onClick={() => navigate("/well-cost/structure", { state: { wellId: w.id } })}
              >
                {w.name}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
