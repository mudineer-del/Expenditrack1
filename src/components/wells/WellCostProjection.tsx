import { Fragment, useMemo, useState } from "react"
import { CartesianGrid, Line, LineChart, ReferenceLine, Scatter, ScatterChart, XAxis, YAxis, ZAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { fmtCurrency } from "@/lib/wellCost"
import {
  MAX_FORECAST_DAYS,
  activityCells,
  actualCurvesByWbs,
  burnRate,
  costAtDepthDays,
  costAtMilestones,
  cumulativeWithForecast,
  dailyActualSpend,
  wbsCurveValueAt,
  forecastAtCompletion,
  importedDates,
  projectionStatus,
  totalActual,
  type ProjectionStatus,
} from "@/lib/projection"
import type { WellCostTransaction } from "@/types/wellCost"
import type { WellMilestone } from "@/types/wellMilestone"
import type { WellDailyDepth } from "@/types/wellDailyDepth"
import { cn } from "@/lib/utils"

const chartConfig = {
  actual: { label: "Actual", color: "var(--dataviz-3)" },
  forecast: { label: "Forecast", color: "var(--dataviz-5)" },
} satisfies ChartConfig

const STATUS_COLOUR: Record<ProjectionStatus, string> = {
  "On track": "var(--status-cleared)",
  "At risk": "var(--status-under)",
  "Over budget": "var(--status-returned)",
  "No budget": "var(--muted-foreground)",
}

const DEFAULT_REMAINING_DAYS = 30

/** Projection for one well: spend to date, a burn-rate forecast over a user-set number of
 *  remaining days, status against the budget, the cumulative S-curve, a cost-versus-depth
 *  view built from milestones, and a day-by-day activity strip. Only actual entries count;
 *  commitments are left out of the forecast. */
export function WellCostProjection({
  transactions,
  costCentreIds,
  milestones,
  depths,
  budget,
  wbsCentres,
  wbsBudgets,
  currency = "USD",
}: {
  transactions: WellCostTransaction[]
  costCentreIds: Set<string>
  milestones: WellMilestone[]
  /** Measured depth per report date for this well; falls back to milestones until any are captured. */
  depths: WellDailyDepth[]
  budget: number
  /** Cost centre id to its WBS code, for the per-code S-curves. */
  wbsCentres: Map<string, string>
  /** AFE budget per WBS code. */
  wbsBudgets: Record<string, number>
  currency?: string
}) {
  const [remainingInput, setRemainingInput] = useState(String(DEFAULT_REMAINING_DAYS))
  const remainingDays = Math.min(MAX_FORECAST_DAYS, Math.max(0, Math.floor(Number(remainingInput)) || 0))

  const daily = useMemo(() => dailyActualSpend(transactions, costCentreIds), [transactions, costCentreIds])
  const imported = useMemo(() => importedDates(transactions, costCentreIds), [transactions, costCentreIds])
  const actual = useMemo(() => totalActual(daily), [daily])
  const rate = useMemo(() => burnRate(daily, 7), [daily])
  const forecast = forecastAtCompletion(actual, rate, remainingDays)
  const status = projectionStatus(forecast, budget)
  const points = useMemo(() => cumulativeWithForecast(daily, rate, remainingDays), [daily, rate, remainingDays])
  // One actual line per WBS code that has spend, each with its AFE budget as a dashed line in the same colour.
  const wbsCurves = useMemo(() => actualCurvesByWbs(transactions, wbsCentres), [transactions, wbsCentres])
  const curveKey = (i: number) => `wbs${i}`
  const curveColour = (i: number) => `var(--dataviz-${(i % 6) + 1})`
  const chartData = useMemo(
    () =>
      points.map((p) => {
        const row: Record<string, string | number | undefined> = { ...p }
        wbsCurves.forEach((c, i) => {
          row[curveKey(i)] = wbsCurveValueAt(c, p.date)
        })
        return row
      }),
    [points, wbsCurves]
  )
  const cells = useMemo(() => activityCells(daily, 90, imported), [daily, imported])
  const maxCell = Math.max(0, ...cells.map((c) => c.amount))
  const depthDayPoints = useMemo(() => costAtDepthDays(depths, daily), [depths, daily])
  const depthPoints = useMemo(() => (depthDayPoints.length ? depthDayPoints : costAtMilestones(milestones, daily)), [depthDayPoints, milestones, daily])
  const depthSource = depthDayPoints.length ? "daily depth" : "milestones"
  const forecastPct = budget > 0 ? Math.min(100, (forecast / budget) * 100) : 0

  const kpis = [
    { label: "Actual to date", value: fmtCurrency(actual, currency) },
    { label: "Burn rate (7-day avg / day)", value: fmtCurrency(rate, currency) },
    { label: "Forecast at completion", value: fmtCurrency(forecast, currency) },
  ]

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm md:rounded-lg md:shadow-none">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-sm font-semibold">Cost Projection</span>
          <p className="text-xs text-muted-foreground">Burn-rate forecast from the last 7 calendar days. Actuals only; commitments are excluded.</p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="projection-remaining" className="text-xs text-muted-foreground">Days remaining</Label>
          <Input
            id="projection-remaining"
            type="number"
            min={0}
            max={MAX_FORECAST_DAYS}
            className="h-8 w-24"
            value={remainingInput}
            onChange={(e) => setRemainingInput(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border bg-background p-3">
            <div className="text-xs text-muted-foreground">{k.label}</div>
            <div className="mt-0.5 truncate text-lg font-semibold tabular-nums">{k.value}</div>
          </div>
        ))}
        <div className="rounded-xl border bg-background p-3">
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>Forecast vs budget</span>
            <span className="rounded-full px-2 py-0.5 text-[11px] font-medium text-white" style={{ backgroundColor: STATUS_COLOUR[status] }}>
              {status}
            </span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full transition-all" style={{ width: `${forecastPct.toFixed(1)}%`, backgroundColor: STATUS_COLOUR[status] }} />
          </div>
          <div className="mt-1 text-xs tabular-nums text-muted-foreground">
            {budget > 0 ? `Budget ${fmtCurrency(budget, currency)}` : "No budget set for this well"}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div>
          <div className="mb-1.5 text-xs font-medium text-muted-foreground">Cumulative cost (S-curve)</div>
          {points.length ? (
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <LineChart data={chartData} margin={{ left: 4, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} minTickGap={24} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} width={72} tickFormatter={(v) => fmtCurrency(v, currency)} />
                <ChartTooltip content={<ChartTooltipContent />} />
                {budget > 0 ? <ReferenceLine y={budget} stroke="var(--status-returned)" strokeDasharray="4 4" label={{ value: "Budget", fontSize: 11, fill: "var(--muted-foreground)" }} /> : null}
                <Line type="monotone" dataKey="actual" name="Actual" stroke="var(--color-actual)" strokeWidth={2} dot={false} connectNulls={false} />
                <Line type="monotone" dataKey="forecast" name="Forecast" stroke="var(--color-forecast)" strokeWidth={2} strokeDasharray="6 4" dot={false} connectNulls={false} />
                {wbsCurves.map((c, i) => (
                  <Fragment key={c.code}>
                    <Line type="monotone" dataKey={curveKey(i)} name={`${c.code} actual`} stroke={curveColour(i)} strokeWidth={1.5} dot={false} connectNulls={false} />
                    {(wbsBudgets[c.code] ?? 0) > 0 ? <ReferenceLine y={wbsBudgets[c.code]} stroke={curveColour(i)} strokeDasharray="4 4" /> : null}
                  </Fragment>
                ))}
              </LineChart>
            </ChartContainer>
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">No actual spend logged for this well yet</div>
          )}
        </div>

        <div>
          <div className="mb-1.5 text-xs font-medium text-muted-foreground">Cost versus depth ({depthSource})</div>
          {depthPoints.length ? (
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <ScatterChart margin={{ left: 4, right: 12 }}>
                <CartesianGrid />
                <XAxis type="number" dataKey="depth" name="Depth" unit=" m" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis type="number" dataKey="cumulativeCost" name="Cumulative cost" tickLine={false} axisLine={false} fontSize={11} width={72} tickFormatter={(v) => fmtCurrency(v, currency)} />
                <ZAxis range={[60, 60]} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      hideLabel
                      formatter={(_, __, item) => {
                        const p = item.payload as { label: string; depth: number; cumulativeCost: number; date: string }
                        return (
                          <div className="grid gap-0.5">
                            <span className="font-medium">{p.label}</span>
                            <span className="text-muted-foreground">{p.date} · {p.depth} m</span>
                            <span className="tabular-nums">{fmtCurrency(p.cumulativeCost, currency)}</span>
                          </div>
                        )
                      }}
                    />
                  }
                />
                <Scatter data={depthPoints} fill="var(--color-actual)" line={{ stroke: "var(--color-actual)", strokeWidth: 2 }} />
              </ScatterChart>
            </ChartContainer>
          ) : (
            <div className="flex h-64 items-center justify-center p-4 text-center text-sm text-muted-foreground">
              No depth recorded yet. Enter depth in the Field Entry form or import daily reports to see cost against depth.
            </div>
          )}
        </div>
      </div>

      {wbsCurves.length ? (
        <div className="mt-4 overflow-x-auto">
          <div className="mb-1.5 text-xs font-medium text-muted-foreground">Budget against actual by WBS code (codes with actual spend)</div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-1 font-medium">WBS code</th>
                <th className="py-1 text-right font-medium">Budget (AFE)</th>
                <th className="py-1 text-right font-medium">Actual</th>
                <th className="py-1 text-right font-medium">Used</th>
              </tr>
            </thead>
            <tbody>
              {wbsCurves.map((c, i) => {
                const budgetFor = wbsBudgets[c.code] ?? 0
                const used = budgetFor > 0 ? (c.total / budgetFor) * 100 : null
                return (
                  <tr key={c.code} className="border-t">
                    <td className="py-1">
                      <span className="mr-1.5 inline-block size-2 rounded-full align-middle" style={{ backgroundColor: curveColour(i) }} />
                      {c.code}
                    </td>
                    <td className="py-1 text-right tabular-nums">{budgetFor > 0 ? fmtCurrency(budgetFor, currency) : "No budget"}</td>
                    <td className="py-1 text-right tabular-nums">{fmtCurrency(c.total, currency)}</td>
                    <td className={cn("py-1 text-right tabular-nums", used !== null && used > 100 && "text-destructive")}>
                      {used === null ? "—" : `${used.toFixed(0)}%`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {cells.length ? (
        <div className="mt-4">
          <div className="mb-1.5 text-xs font-medium text-muted-foreground">Last 90 days</div>
          <div className="flex flex-wrap gap-[3px]" role="img" aria-label="Daily spend, last 90 days">
            {cells.map((c) => {
              const hasSpend = c.amount > 0
              const colour = hasSpend ? (c.imported ? "var(--dataviz-3)" : "var(--dataviz-5)") : undefined
              return (
                <div
                  key={c.date}
                  title={`${c.date}: ${hasSpend ? fmtCurrency(c.amount, currency) : "no spend logged"}${hasSpend ? (c.imported ? " (imported)" : " (typed in)") : ""}`}
                  className={cn("size-3 rounded-[2px]", !hasSpend && "bg-muted")}
                  style={hasSpend ? { backgroundColor: colour, opacity: 0.25 + 0.75 * (c.amount / maxCell) } : undefined}
                />
              )
            })}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[2px]" style={{ backgroundColor: "var(--dataviz-3)" }} /> Imported from a report</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[2px]" style={{ backgroundColor: "var(--dataviz-5)" }} /> Typed in</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[2px] bg-muted" /> No spend logged (zero days aren't imported, so this can also mean a missing report)</span>
          </div>
        </div>
      ) : null}
    </div>
  )
}
