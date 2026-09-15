import { Scale, TrendingUp, Wallet, Wallet2 } from "lucide-react"
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import wellCostIllustration from "@/assets/well-cost-illustration.webp"
import wellIconPumpjack from "@/assets/well-icon-pumpjack.webp"
import { ChartCard } from "@/components/dashboard/ChartCard"
import { ChartFormatMenu } from "@/components/dashboard/ChartFormatMenu"
import { ChartSlotContextMenu } from "@/components/dashboard/ChartSlotContextMenu"
import { ChartTypeMenu, type ChartTypeOption } from "@/components/dashboard/ChartTypeMenu"
import { ChartVisibilityToggle } from "@/components/dashboard/ChartVisibilityToggle"
import { ChartZoomStepper } from "@/components/dashboard/ChartZoomStepper"
import { KpiTile } from "@/components/dashboard/KpiTile"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { SaveLayoutButton } from "@/components/dashboard/SaveLayoutButton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CategoryBreakdownChart, MonthlySpendTrendChart } from "@/components/wells/WellCostCharts"
import { WellCostCompareDialog } from "@/components/wells/WellCostCompareDialog"
import { ServiceCostSummary } from "@/components/wells/ServiceCostSummary"
import { WellPhaseCostSection } from "@/components/wells/WellPhaseCostSection"
import { WellCostSourceEntries } from "@/components/wells/WellCostSourceEntries"
import { cn, errorMessage } from "@/lib/utils"
import { utilizationColor } from "@/lib/contracts"
import {
  buildCostCentreTotals,
  buildDepartmentBreakdown,
  buildMonthlySpendSeries,
  buildServiceCatalogSummary,
  buildServiceCategoryBreakdown,
  fmtCurrency,
  budgetStatus,
  rollup,
  wellStatusTone,
  WELL_STATUS_TONE_CLASSES,
} from "@/lib/wellCost"
import { useWellCostDepartmentsQuery, useWellCostServiceCategoriesQuery } from "@/hooks/useWellCostCatalog"
import { useWellCostCentresQuery } from "@/hooks/useWellCostCentres"
import { useWellCostTransactionsQuery } from "@/hooks/useWellCostTransactions"
import { useWellMilestonesQuery } from "@/hooks/useWellMilestones"
import { useWellsQuery } from "@/hooks/useWells"
import { useDisplayStore } from "@/store/useDisplayStore"
import type { Well } from "@/types/well"

const TREND_TYPE_OPTIONS: ChartTypeOption[] = [
  { type: "bar", label: "Bar" },
  { type: "line", label: "Line" },
  { type: "area", label: "Area" },
]
const BREAKDOWN_TYPE_OPTIONS: ChartTypeOption[] = [
  { type: "bar", label: "Bar" },
  { type: "pie", label: "Donut" },
]
const EMPTY_ROWS: never[] = []

/** Well Cost module's landing page: a portfolio-level view across every (non-archived)
 *  well, each rolled up from its own well_cost_centres rows — see rollup() in
 *  lib/wellCost.ts, the same helper each department tab on the Structure page uses. */
export default function WellDashboardPage() {
  const navigate = useNavigate()
  const [compareOpen, setCompareOpen] = useState(false)
  const [currency, setCurrency] = useState("USD")
  const [wellSearch, setWellSearch] = useState("")
  const chartSlots = useDisplayStore((s) => s.chartSlots)
  const wellCostTrendChartType = useDisplayStore((s) => s.wellCostTrendChartType)
  const wellCostDeptChartType = useDisplayStore((s) => s.wellCostDeptChartType)
  const wellCostServiceChartType = useDisplayStore((s) => s.wellCostServiceChartType)
  const setChartType = useDisplayStore((s) => s.setChartType)
  const wellsQuery = useWellsQuery()
  const costCentresQuery = useWellCostCentresQuery()
  const transactionsQuery = useWellCostTransactionsQuery()
  const departmentsQuery = useWellCostDepartmentsQuery()
  const serviceCategoriesQuery = useWellCostServiceCategoriesQuery()
  const milestonesQuery = useWellMilestonesQuery()

  const wells = useMemo(() => (wellsQuery.data ?? []).filter((w) => !w.archived), [wellsQuery.data])
  const allCostCentres = costCentresQuery.data ?? EMPTY_ROWS
  const costCentres = useMemo(() => {
    const activeWellIds = new Set(wells.map((w) => w.id))
    return allCostCentres.filter((c) => activeWellIds.has(c.wellId) && (c.currency || "USD") === currency)
  }, [allCostCentres, wells, currency])
  const departments = departmentsQuery.data ?? EMPTY_ROWS
  const serviceCategories = serviceCategoriesQuery.data ?? EMPTY_ROWS
  const transactions = transactionsQuery.data ?? EMPTY_ROWS
  const milestones = milestonesQuery.data ?? EMPTY_ROWS
  const costCentreTotals = useMemo(() => buildCostCentreTotals(transactions), [transactions])

  const activeCostCentreIds = useMemo(() => new Set(costCentres.map((c) => c.id)), [costCentres])
  const activeTransactions = useMemo(
    () => transactions.filter((t) => activeCostCentreIds.has(t.costCentreId)),
    [transactions, activeCostCentreIds]
  )
  const monthlySpend = useMemo(() => buildMonthlySpendSeries(activeTransactions), [activeTransactions])
  const departmentBreakdown = useMemo(
    () => buildDepartmentBreakdown(costCentres, costCentreTotals, departments),
    [costCentres, costCentreTotals, departments]
  )
  const serviceBreakdown = useMemo(
    () => buildServiceCategoryBreakdown(costCentres, costCentreTotals, serviceCategories),
    [costCentres, costCentreTotals, serviceCategories]
  )
  const serviceCatalogSummary = useMemo(
    () => buildServiceCatalogSummary(costCentres, costCentreTotals, serviceCategories, departments),
    [costCentres, costCentreTotals, serviceCategories, departments]
  )

  const rows = useMemo(() => {
    return wells
      .map((w) => ({ well: w, r: rollup(costCentres.filter((c) => c.wellId === w.id), costCentreTotals) }))
      .sort((a, b) => a.well.name.localeCompare(b.well.name))
  }, [wells, costCentres, costCentreTotals])

  const totals = useMemo(() => rollup(costCentres, costCentreTotals), [costCentres, costCentreTotals])

  function openWell(well: Well) {
    navigate("/well-cost/structure", { state: { wellId: well.id } })
  }

  if (
    wellsQuery.isLoading ||
    costCentresQuery.isLoading ||
    transactionsQuery.isLoading ||
    departmentsQuery.isLoading ||
    serviceCategoriesQuery.isLoading ||
    milestonesQuery.isLoading
  ) {
    return (
      <div className="grid grid-cols-1 gap-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    )
  }

  if (
    wellsQuery.isError ||
    costCentresQuery.isError ||
    transactionsQuery.isError ||
    departmentsQuery.isError ||
    serviceCategoriesQuery.isError ||
    milestonesQuery.isError
  ) {
    const firstError =
      wellsQuery.error ?? costCentresQuery.error ?? transactionsQuery.error ?? departmentsQuery.error ?? serviceCategoriesQuery.error ?? milestonesQuery.error
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        <p>Could not load well cost data. Check your connection and try again.</p>
        <Button className="mt-3" variant="outline" onClick={() => {
          void Promise.all([wellsQuery.refetch(), costCentresQuery.refetch(), transactionsQuery.refetch(), departmentsQuery.refetch(), serviceCategoriesQuery.refetch(), milestonesQuery.refetch()])
        }}>Try again</Button>
        {firstError && <details className="mt-2 text-xs"><summary>Error details</summary>{errorMessage(firstError)}</details>}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-xl font-semibold">Well Cost Overview</h2>
          <p className="text-sm text-muted-foreground">Non-archived wells · All dates · {currency}, rounded to whole units</p></div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">Currency
            <select aria-label="Cost currency" className="min-h-10 rounded-md border bg-background px-3" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {Array.from(new Set(["USD", ...allCostCentres.map((c) => c.currency || "USD")])).sort().map((code) => <option key={code} value={code}>{code}</option>)}
            </select>
          </label><SaveLayoutButton /></div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile
          icon={<img src={wellIconPumpjack} alt="" className="h-full w-full rounded-xl object-cover md:rounded-md" />}
          label="Total Wells"
          value={wells.length}
          accent="var(--chart-1)"
        />
        <KpiTile icon={<Wallet />} label="Total Budget" value={fmtCurrency(totals.budget, currency)} accent="var(--chart-2)" />
        <KpiTile icon={<Wallet2 />} label="Actual + Commitments" value={fmtCurrency(totals.actual + totals.commitments, currency)} accent="var(--chart-3)" />
        <KpiTile icon={<TrendingUp />} label="Utilization" value={totals.budget > 0 ? `${totals.utilizationPct.toFixed(1)}%` : "—"} sub={budgetStatus(totals.budget, totals.actual + totals.commitments)} accent="var(--chart-4)" />
      </div>

      {rows.some(({ r }) => r.available < 0) && (
        <div role="status" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <strong>{rows.filter(({ r }) => r.available < 0).length} {rows.filter(({ r }) => r.available < 0).length === 1 ? "well needs" : "wells need"} budget review.</strong> Open a well below to review its budget, actual costs, and commitments.
        </div>
      )}

      <Tabs defaultValue="overview" className="min-w-0 gap-4">
        <TabsList className="h-auto min-h-11 w-full sm:w-fit" aria-label="Well cost views">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="phases">Drilling phases</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="grid min-w-0 gap-4">
          <WellCostSourceEntries key={currency} currency={currency} centres={costCentres} transactions={activeTransactions} />

      {!chartSlots.wellCostTrend.hidden && (
        <ChartCard
          accent="var(--dataviz-3)"
          title="Monthly Spend Trend"
          action={
            <div className="flex items-center gap-0.5">
              <ChartZoomStepper id="wellCostTrend" />
              <ChartVisibilityToggle id="wellCostTrend" />
              <ChartTypeMenu
                options={TREND_TYPE_OPTIONS}
                value={wellCostTrendChartType}
                onChange={(t) => setChartType("wellCostTrendChartType", t)}
              />
              <ChartFormatMenu id="wellCostTrend" hasZoom chartType={wellCostTrendChartType} />
            </div>
          }
        >
          <ChartSlotContextMenu
            id="wellCostTrend"
            hasDimension={false}
            hasMeasure={false}
            hasZoom
            chartTypeOptions={TREND_TYPE_OPTIONS}
            chartTypeValue={wellCostTrendChartType}
            onChartTypeChange={(t) => setChartType("wellCostTrendChartType", t)}
          >
            <MonthlySpendTrendChart currency={currency} data={monthlySpend} chartType={wellCostTrendChartType} />
          </ChartSlotContextMenu>
        </ChartCard>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {!chartSlots.wellCostDept.hidden && (
          <ChartCard
            accent="var(--chart-2)"
            title="Cost by Department"
            action={
              <div className="flex items-center gap-0.5">
                <ChartVisibilityToggle id="wellCostDept" />
                <ChartTypeMenu
                  options={BREAKDOWN_TYPE_OPTIONS}
                  value={wellCostDeptChartType}
                  onChange={(t) => setChartType("wellCostDeptChartType", t)}
                />
                <ChartFormatMenu id="wellCostDept" chartType={wellCostDeptChartType} />
              </div>
            }
          >
            <ChartSlotContextMenu
              id="wellCostDept"
              hasDimension={false}
              hasMeasure={false}
              chartTypeOptions={BREAKDOWN_TYPE_OPTIONS}
              chartTypeValue={wellCostDeptChartType}
              onChartTypeChange={(t) => setChartType("wellCostDeptChartType", t)}
            >
              <CategoryBreakdownChart currency={currency} items={departmentBreakdown} chartType={wellCostDeptChartType} />
            </ChartSlotContextMenu>
          </ChartCard>
        )}
        {!chartSlots.wellCostService.hidden && (
          <ChartCard
            accent="var(--dataviz-1)"
            title="Spend by Service"
            action={
              <div className="flex items-center gap-0.5">
                <ChartVisibilityToggle id="wellCostService" />
                <ChartTypeMenu
                  options={BREAKDOWN_TYPE_OPTIONS}
                  value={wellCostServiceChartType}
                  onChange={(t) => setChartType("wellCostServiceChartType", t)}
                />
                <ChartFormatMenu id="wellCostService" chartType={wellCostServiceChartType} />
              </div>
            }
          >
            <ChartSlotContextMenu
              id="wellCostService"
              hasDimension={false}
              hasMeasure={false}
              chartTypeOptions={BREAKDOWN_TYPE_OPTIONS}
              chartTypeValue={wellCostServiceChartType}
              onChartTypeChange={(t) => setChartType("wellCostServiceChartType", t)}
            >
              <CategoryBreakdownChart slotId="wellCostService" currency={currency} items={serviceBreakdown} chartType={wellCostServiceChartType} />
            </ChartSlotContextMenu>
          </ChartCard>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm md:rounded-lg md:shadow-none">
        <div className="flex items-center justify-between gap-2 border-b p-4">
          <h3 className="text-base font-bold md:text-sm md:font-semibold">Wells</h3>
          <Button size="sm" variant="outline" disabled={!rows.length} onClick={() => setCompareOpen(true)}>
            <Scale /> Compare Cost
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-b p-4">
          <Input aria-label="Search wells" placeholder="Search by well name or code…" className="max-w-sm" value={wellSearch} onChange={(e) => setWellSearch(e.target.value)} />
          {wellSearch && <Button variant="ghost" size="sm" onClick={() => setWellSearch("")}>Clear search</Button>}
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
              {!rows.some(({ well }) => `${well.name} ${well.code ?? ""}`.toLowerCase().includes(wellSearch.trim().toLowerCase())) && (
                <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No wells match your search.</TableCell></TableRow>
              )}
              {rows.filter(({ well }) => `${well.name} ${well.code ?? ""}`.toLowerCase().includes(wellSearch.trim().toLowerCase())).map(({ well, r }) => {
                const tone = wellStatusTone(well.status)
                return (
                  <TableRow key={well.id} className="cursor-pointer" onClick={() => openWell(well)}>
                    <TableCell>
                      <button type="button" className="rounded text-left font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring" onClick={(e) => { e.stopPropagation(); openWell(well) }}>{well.name}</button>
                      {well.code && <div className="text-xs text-muted-foreground">{well.code}</div>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{fmtCurrency(r.budget, currency)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtCurrency(r.actual, currency)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtCurrency(r.commitments, currency)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtCurrency(r.available, currency)}</TableCell>
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
                      <span className={cn("text-xs", r.available < 0 ? "text-destructive" : "text-muted-foreground")}>{budgetStatus(r.budget, r.actual + r.commitments)}</span>
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
        </TabsContent>
        <TabsContent value="services"><ServiceCostSummary currency={currency} rows={serviceCatalogSummary} /></TabsContent>
        <TabsContent value="phases"><WellPhaseCostSection currency={currency} wells={wells} milestones={milestones} costCentres={costCentres} transactions={transactions} /></TabsContent>
      </Tabs>

      <WellCostCompareDialog currency={currency} open={compareOpen} onOpenChange={setCompareOpen} rows={rows} />
    </div>
  )
}
