import { useMemo } from "react"
import { Area, AreaChart, Bar, BarChart, Brush, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { useDisplayStore, type ChartSlotId, type ChartType } from "@/store/useDisplayStore"
import { fmtCurrency, type CategoryCostBreakdown, type MonthlySpendPoint } from "@/lib/wellCost"

const trendConfig = {
  actual: { label: "Actual", color: "var(--dataviz-3)" },
  commitment: { label: "Commitments", color: "var(--dataviz-5)" },
} satisfies ChartConfig

function trendTooltip(currency: string) {
  return (
    <ChartTooltip
      content={
        <ChartTooltipContent
          formatter={(value, name, item) => (
            <div className="flex w-full items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="size-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: item.color }} />
                {trendConfig[name as keyof typeof trendConfig]?.label ?? name}
              </span>
              <span className="font-medium tabular-nums text-foreground">{fmtCurrency(Number(value), currency)}</span>
            </div>
          )}
        />
      }
    />
  )
}

/** Portfolio-wide spend over time — every well's well_cost_transactions bucketed by
 *  calendar month (see buildMonthlySpendSeries). "line"/"area" show Actual vs Commitments
 *  as two series over time; anything else (including the default) renders as a stacked
 *  bar — the well-cost equivalent of TrendChart.tsx/ServiceChart.tsx's own chartType
 *  switch, just with a narrower, purpose-fit set of shapes for this data. */
export function MonthlySpendTrendChart({ data, chartType, currency = "USD" }: { data: MonthlySpendPoint[]; chartType: ChartType; currency?: string }) {
  const cfg = useDisplayStore((s) => s.chartSlots.wellCostTrend)
  const labels = useDisplayStore((s) => s.chartLabelsEnabled)
  const labelPosition = useDisplayStore((s) => s.chartLabelPosition)
  const label = labels ? { position: labelPosition === "inside" ? "inside" as const : "top" as const, fill: "var(--foreground)", fontSize: 11 } : false
  const chartStyle = { height: 256 * (cfg.sizePercent ?? 100) / 100 }
  const brush = (cfg.zoomEnabled ?? true) && data.length > 1 ? <Brush dataKey="monthLabel" height={24} stroke="var(--muted-foreground)" fill="var(--card)" /> : null
  if (!data.length) {
    return <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">No cost entries logged yet</div>
  }

  if (chartType === "line") {
    return (
      <ChartContainer config={trendConfig} style={chartStyle} className="w-full">
        <LineChart data={data} margin={{ left: 4 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="monthLabel" tickLine={false} axisLine={false} fontSize={11} />
          <YAxis tickLine={false} axisLine={false} fontSize={11} width={72} tickFormatter={(v) => fmtCurrency(v, currency)} />
          {trendTooltip(currency)}
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {brush}
          <Line label={label} type="monotone" name="Actual" dataKey="actual" stroke="var(--color-actual)" strokeWidth={2} dot={{ r: 3 }} />
          <Line label={label} type="monotone" name="Commitments" dataKey="commitment" stroke="var(--color-commitment)" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ChartContainer>
    )
  }

  if (chartType === "area") {
    return (
      <ChartContainer config={trendConfig} style={chartStyle} className="w-full">
        <AreaChart data={data} margin={{ left: 4 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="monthLabel" tickLine={false} axisLine={false} fontSize={11} />
          <YAxis tickLine={false} axisLine={false} fontSize={11} width={72} tickFormatter={(v) => fmtCurrency(v, currency)} />
          {trendTooltip(currency)}
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {brush}
          <Area label={label} type="monotone" name="Actual" dataKey="actual" stackId="spend" stroke="var(--color-actual)" fill="var(--color-actual)" fillOpacity={0.5} />
          <Area label={label} type="monotone" name="Commitments" dataKey="commitment" stackId="spend" stroke="var(--color-commitment)" fill="var(--color-commitment)" fillOpacity={0.5} />
        </AreaChart>
      </ChartContainer>
    )
  }

  return (
    <ChartContainer config={trendConfig} style={chartStyle} className="w-full">
      <BarChart data={data} margin={{ left: 4 }} barGap={4}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="monthLabel" tickLine={false} axisLine={false} fontSize={11} />
        <YAxis tickLine={false} axisLine={false} fontSize={11} width={72} tickFormatter={(v) => fmtCurrency(v, currency)} />
        {trendTooltip(currency)}
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {brush}
        <Bar label={label} name="Actual" dataKey="actual" stackId="spend" fill="var(--color-actual)" radius={[0, 0, 4, 4]} />
        <Bar label={label} name="Commitments" dataKey="commitment" stackId="spend" fill="var(--color-commitment)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}

const breakdownConfig = {
  budget: { label: "Budget (AFE)", color: "var(--chart-2)" },
  spent: { label: "Actual + Commitments", color: "var(--chart-3)" },
} satisfies ChartConfig

const DONUT_COLORS = ["var(--dataviz-1)", "var(--dataviz-2)", "var(--dataviz-3)", "var(--dataviz-4)", "var(--dataviz-5)", "var(--dataviz-6)"]
const DONUT_TOP_N = 5

/** Budget vs. actual+commitments for a set of named categories — departments, or service
 *  categories — shared by "Cost by Department" and "Spend by Service" so both charts get
 *  the same chart-type switch. Default/"bar" is a horizontal grouped Budget-vs-Spent bar
 *  (the same color language as WellCostCompareDialog's per-well comparison); "pie" folds
 *  to a spend-share donut (top 5 + "Other", never an unbounded rainbow of slices). */
export function CategoryBreakdownChart({ items, chartType, currency = "USD", slotId = "wellCostDept" }: { items: CategoryCostBreakdown[]; chartType: ChartType; currency?: string; slotId?: ChartSlotId }) {
  const size = useDisplayStore((s) => s.chartSlots[slotId].sizePercent) ?? 100
  const labels = useDisplayStore((s) => s.chartLabelsEnabled)
  const labelPosition = useDisplayStore((s) => s.chartLabelPosition)
  const label = labels ? { position: labelPosition === "inside" ? "inside" as const : "right" as const, fill: "var(--foreground)", fontSize: 11 } : false
  const donutSlices = useMemo(() => {
    const withSpend = items.map((i) => ({ name: i.name, value: i.actual + i.commitment })).filter((i) => i.value > 0)
    const top = withSpend.slice(0, DONUT_TOP_N)
    const rest = withSpend.slice(DONUT_TOP_N)
    const otherTotal = rest.reduce((s, i) => s + i.value, 0)
    return otherTotal > 0 ? [...top, { name: "Other", value: otherTotal }] : top
  }, [items])

  if (chartType === "pie") {
    const total = donutSlices.reduce((s, i) => s + i.value, 0)
    const config = Object.fromEntries(
      donutSlices.map((s, i) => [s.name, { label: s.name, color: DONUT_COLORS[i % DONUT_COLORS.length] }])
    ) as ChartConfig
    if (!donutSlices.length) return <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">No spend logged yet</div>

    // A single 100%-share slice can't be drawn as one continuous SVG arc (its start and
    // end point coincide), so Recharts renders it a hair short of a full circle — with
    // this donut's thick stroke, that sliver reads as a visible wedge cut out of the
    // ring rather than the clean full circle "100% of one category" should be. A single
    // category is also the one case with nothing left for a legend to distinguish, so a
    // plain CSS ring (no Recharts involved) both sidesteps the artifact and reads better.
    if (donutSlices.length === 1) {
      const only = donutSlices[0]
      return (
        <div style={{ minHeight: 256 * size / 100 }} className="flex flex-col items-center justify-center gap-4">
          <div className="flex size-36 items-center justify-center rounded-full" style={{ backgroundColor: DONUT_COLORS[0] }}>
            <div className="flex size-[52%] items-center justify-center rounded-full bg-card">
              <span className="text-xl font-bold tabular-nums">100%</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <span className="size-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: DONUT_COLORS[0] }} />
            <span className="font-medium text-foreground">{only.name}</span>
            <span className="text-muted-foreground">· {fmtCurrency(only.value, currency)}</span>
          </div>
        </div>
      )
    }

    return (
      <ChartContainer config={config} style={{ height: 256 * size / 100 }} className="w-full">
        <PieChart>
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name) => (
                  <div className="flex w-full items-center justify-between gap-3">
                    <span className="text-muted-foreground">{name}</span>
                    <span className="font-medium tabular-nums text-foreground">
                      {fmtCurrency(Number(value), currency)} ({total > 0 ? Math.round((Number(value) / total) * 100) : 0}%)
                    </span>
                  </div>
                )}
              />
            }
          />
          <Pie
            label={labels}
            data={donutSlices}
            dataKey="value"
            nameKey="name"
            innerRadius="52%"
            outerRadius="82%"
            paddingAngle={donutSlices.length > 1 ? 2 : 0}
            strokeWidth={2}
            stroke="var(--card)"
          >
            {donutSlices.map((s, i) => (
              <Cell key={s.name} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
            ))}
          </Pie>
          <Legend wrapperStyle={{ fontSize: 11 }} layout="horizontal" verticalAlign="bottom" />
        </PieChart>
      </ChartContainer>
    )
  }

  const data = items.map((i) => ({ name: i.name, budget: i.budget, spent: i.actual + i.commitment }))
  const height = Math.max(160, data.length * 44) * size / 100
  if (!data.length) return <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">No cost centres yet</div>
  return (
    <ChartContainer config={breakdownConfig} style={{ height }} className="w-full">
      <BarChart data={data} layout="vertical" margin={{ left: 8 }} barGap={4}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => fmtCurrency(v, currency)} />
        <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} fontSize={11} width={110} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name, item) => (
                <div className="flex w-full items-center justify-between gap-3">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="size-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: item.color }} />
                    {breakdownConfig[name as keyof typeof breakdownConfig]?.label ?? name}
                  </span>
                  <span className="font-medium tabular-nums text-foreground">{fmtCurrency(Number(value), currency)}</span>
                </div>
              )}
            />
          }
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar label={label} name="Budget" dataKey="budget" fill="var(--color-budget)" radius={5} maxBarSize={16} />
        <Bar label={label} name="Actual + Commitments" dataKey="spent" fill="var(--color-spent)" radius={5} maxBarSize={16} />
      </BarChart>
    </ChartContainer>
  )
}
