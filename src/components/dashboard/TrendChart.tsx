import { useId } from "react"
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
import { DONUT_CORNER_RADIUS, DONUT_PAD_ANGLE, donut3DShape, donutActiveShape, makeDonutOuterLabel, makePolarValueLabel } from "./donut3d"
import { Chart3DBoundary, LazyArea3DScene, LazyBar3DScene, type Chart3DDatum } from "./chart3d"

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
  const areaId = useId().replace(/:/g, "")
  // Only gates the pie/radar labels below — the line/bar/composed view further down stays
  // label-less on purpose (too many months of per-point labels turns into unreadable noise;
  // see the Brush/zoom control added for that same density problem).
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
            outerRadius="55%"
            paddingAngle={DONUT_PAD_ANGLE}
            cornerRadius={DONUT_CORNER_RADIUS}
            shape={donut3DShape}
            activeShape={donutActiveShape}
            label={makeDonutOuterLabel(PIE_COLORS, 28, data.map((d) => ({ name: d.month, value: d.total })))}
            labelLine={false}
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
          <Radar dataKey="total" stroke="var(--color-total)" fill="var(--color-total)" fillOpacity={0.22} isAnimationActive={false} className="cursor-pointer">
            <LabelList dataKey="total" content={makePolarValueLabel(PIE_COLORS, valueLabel, -14)} />
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

  function renderComposed(effectiveType: string) {
    return (
      <ChartContainer config={config} className="h-[var(--chart-h)] w-full">
        <ComposedChart data={data} onClick={(e) => drill(activeChartPayload<TrendPoint>(e))} className="cursor-pointer">
          <defs>
            <linearGradient id={`${areaId}-fill`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--dataviz-1)" stopOpacity={0.38} />
              <stop offset="58%" stopColor="var(--dataviz-1)" stopOpacity={0.13} />
              <stop offset="100%" stopColor="var(--dataviz-1)" stopOpacity={0.015} />
            </linearGradient>
            <filter id={`${areaId}-glow`} x="-20%" y="-25%" width="140%" height="150%">
              <feDropShadow dx="0" dy="3" stdDeviation="3.5" floodColor="var(--dataviz-1)" floodOpacity={0.16} />
            </filter>
          </defs>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
          <YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => fmtMoney(v).replace(".00", "")} width={60} />
          <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmtMoney(Number(v))} />} />
          {effectiveType === "bar" && <Bar dataKey="total" fill="var(--color-total)" radius={8} isAnimationActive={animate} />}
          {effectiveType === "composed" && (
            <>
              <Bar dataKey="total" fill="var(--color-total)" radius={8} isAnimationActive={animate} />
              <Line type="monotone" dataKey="total" stroke="var(--foreground)" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={animate} />
            </>
          )}
          {effectiveType === "line" && (
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
          {effectiveType === "area" && (
            <>
              <Area
                type="monotone"
                dataKey="total"
                stroke="var(--color-total)"
                strokeWidth={3}
                strokeLinecap="round"
                fill={`url(#${areaId}-fill)`}
                fillOpacity={1}
                filter={`url(#${areaId}-glow)`}
                dot={{ r: 3.25, fill: "var(--card)", stroke: "var(--dataviz-1)", strokeWidth: 2 }}
                activeDot={{ r: 7, strokeWidth: 2, stroke: "var(--card)", fill: "var(--dataviz-1)" }}
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

  if (chartType === "bar3d") {
    const bars3D: Chart3DDatum[] = data.map((d, i) => ({ key: d.key, label: d.month, value: d.total, color: PIE_COLORS[i % PIE_COLORS.length], invoices: d.invoices }))
    return (
      <div className="h-[var(--chart-h)] w-full">
        <Chart3DBoundary fallback={renderComposed("bar")}>
          <LazyBar3DScene
            data={bars3D}
            otherColor="var(--muted-foreground)"
            formatValue={valueLabel}
            maxCategories={14}
            onBarClick={(d) => drill(data.find((t) => (t.key) === d.key) ?? null)}
          />
        </Chart3DBoundary>
      </div>
    )
  }

  if (chartType === "area3d") {
    return (
      <div className="h-[var(--chart-h)] w-full">
        <Chart3DBoundary fallback={renderComposed("area")}>
          <LazyArea3DScene
            points={data.map((d) => ({ key: d.key, label: d.month, value: d.total }))}
            color="var(--dataviz-1)"
            formatValue={valueLabel}
            onPointClick={(p) => drill(data.find((t) => (t.key) === p.key) ?? null)}
          />
        </Chart3DBoundary>
      </div>
    )
  }

  return renderComposed(chartType)
}
