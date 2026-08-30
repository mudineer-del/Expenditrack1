import {
  Area,
  Bar,
  Brush,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Line,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { activeChartPayload } from "@/lib/chartClick"
import { fmtMoney, type TrendPoint } from "@/lib/dashboard"
import { useDisplayStore } from "@/store/useDisplayStore"
import { makeDonutOuterLabel, makePolarValueLabel } from "./donut3d"

const config = {
  total: { label: "Expenditure (incl. tax)", color: "var(--dataviz-1)" },
} satisfies ChartConfig

const PIE_COLORS = ["var(--dataviz-1)", "var(--dataviz-2)", "var(--dataviz-3)", "var(--dataviz-4)", "var(--dataviz-5)", "var(--dataviz-6)"]
const valueLabel = (v: unknown) => fmtMoney(Number(v)).replace(".00", "")

export function TrendChart({
  data,
  onDrill,
  zoomEnabled = true,
}: {
  data: TrendPoint[]
  onDrill: (title: string, invoices: TrendPoint["invoices"]) => void
  /** Settings ▸ Format ▸ Charts (or the chart's own right-click menu) ▸ "Zoom bar" — shows
   *  or hides the Brush/pan control under the trend line. Defaults on, matching today's
   *  always-on-past-8-points behavior for any caller that doesn't pass this yet. */
  zoomEnabled?: boolean
}) {
  const chartType = useDisplayStore((s) => s.trendChartType)
  const animate = useDisplayStore((s) => s.animationsEnabled)
  // Only gates the pie/radar labels below — the line/bar/composed view further down stays
  // label-less on purpose (too many months of per-point labels turns into unreadable noise;
  // see the Brush/zoom control added for that same density problem).
  const labelsEnabled = useDisplayStore((s) => s.chartLabelsEnabled)

  if (!data.length) {
    return <div className="flex h-[var(--chart-h)] items-center justify-center text-sm text-muted-foreground">No dated invoices</div>
  }

  function drill(d: TrendPoint | null) {
    if (d) onDrill(`Invoices — ${d.month}`, d.invoices)
  }

  if (chartType === "pie") {
    return (
      <ChartContainer config={config} className="h-[var(--chart-h)] w-full">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmtMoney(Number(v))} />} />
          <Pie
            data={data}
            dataKey="total"
            nameKey="month"
            innerRadius="45%"
            outerRadius={labelsEnabled ? "62%" : "80%"}
            label={labelsEnabled ? makeDonutOuterLabel(PIE_COLORS) : undefined}
            labelLine={labelsEnabled ? { stroke: "var(--border)" } : false}
            isAnimationActive={animate}
            cursor="pointer"
            onClick={(_, index) => drill(data[index])}
          >
            {data.map((d, i) => (
              <Cell key={d.month} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
    )
  }

  if (chartType === "radar") {
    return (
      <ChartContainer config={config} className="h-[var(--chart-h)] w-full">
        <RadarChart data={data} onClick={(e) => drill(activeChartPayload<TrendPoint>(e))}>
          <PolarGrid />
          <PolarAngleAxis dataKey="month" fontSize={10} />
          <PolarRadiusAxis tickFormatter={(v) => fmtMoney(v).replace(".00", "")} fontSize={9} />
          <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmtMoney(Number(v))} />} />
          <Radar dataKey="total" stroke="var(--color-total)" fill="var(--color-total)" fillOpacity={0.35} isAnimationActive={labelsEnabled ? false : animate} className="cursor-pointer">
            {labelsEnabled && <LabelList dataKey="total" content={makePolarValueLabel(PIE_COLORS, valueLabel)} />}
          </Radar>
        </RadarChart>
      </ChartContainer>
    )
  }

  if (chartType === "scatter") {
    const scatterData = data.map((point, index) => ({ ...point, index }))
    return (
      <ChartContainer config={config} className="h-[var(--chart-h)] w-full">
        <ScatterChart onClick={(e) => drill(activeChartPayload<TrendPoint>(e))} className="cursor-pointer">
          <CartesianGrid />
          <XAxis
            type="number"
            dataKey="index"
            domain={[0, Math.max(0, data.length - 1)]}
            tickLine={false}
            axisLine={false}
            fontSize={11}
            tickFormatter={(v) => data[Number(v)]?.month ?? ""}
          />
          <YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => fmtMoney(v).replace(".00", "")} width={60} />
          <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmtMoney(Number(v))} />} />
          <Scatter data={scatterData} dataKey="total" fill="var(--color-total)" isAnimationActive={animate} />
        </ScatterChart>
      </ChartContainer>
    )
  }

  return (
    <ChartContainer config={config} className="h-[var(--chart-h)] w-full">
      <ComposedChart data={data} onClick={(e) => drill(activeChartPayload<TrendPoint>(e))} className="cursor-pointer">
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
        <YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => fmtMoney(v).replace(".00", "")} width={60} />
        <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmtMoney(Number(v))} />} />
        {chartType === "bar" && <Bar dataKey="total" fill="var(--color-total)" radius={[8, 8, 3, 3]} isAnimationActive={animate} />}
        {chartType === "composed" && (
          <>
            <Bar dataKey="total" fill="var(--color-total)" fillOpacity={0.45} radius={[8, 8, 3, 3]} isAnimationActive={animate} />
            <Line type="monotone" dataKey="total" stroke="var(--foreground)" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={animate} />
          </>
        )}
        {chartType === "line" && (
          <Line
            type="monotone"
            dataKey="total"
            stroke="var(--color-total)"
            strokeWidth={2.75}
            strokeLinecap="round"
            dot={{ r: 3.5 }}
            activeDot={{ r: 6, strokeWidth: 2, stroke: "var(--background)" }}
            isAnimationActive={animate}
          />
        )}
        {chartType === "area" && (
          <>
            <defs>
              <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-total)" stopOpacity={0.45} />
                <stop offset="100%" stopColor="var(--color-total)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="total"
              stroke="var(--color-total)"
              strokeWidth={2.75}
              strokeLinecap="round"
              fill="url(#trendGradient)"
              activeDot={{ r: 6, strokeWidth: 2, stroke: "var(--background)" }}
              isAnimationActive={animate}
            />
          </>
        )}
        {zoomEnabled && data.length > 8 && (
          <Brush dataKey="month" height={22} travellerWidth={8} stroke="var(--color-total)" fill="var(--muted)" className="text-xs" />
        )}
      </ComposedChart>
    </ChartContainer>
  )
}
