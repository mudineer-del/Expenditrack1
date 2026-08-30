import { useId } from "react"
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Funnel,
  FunnelChart,
  LabelList,
  Line,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  Treemap,
  XAxis,
  YAxis,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { activeChartPayload } from "@/lib/chartClick"
import { fmtMoney, type CategoryTotal } from "@/lib/dashboard"
import { useDisplayStore, type ChartType } from "@/store/useDisplayStore"
import { useIsMobile } from "@/hooks/useIsMobile"
import {
  Area3DDefs,
  DONUT_CORNER_RADIUS,
  DONUT_PAD_ANGLE,
  donut3DShape,
  donutActiveShape,
  makeDonutOuterLabel,
  makePolarValueLabel,
  makeRadialBarValueLabel,
} from "./donut3d"
import { Chart3DBoundary, LazyArea3DScene, LazyBar3DScene, LazyDonut3DScene, type Chart3DDatum } from "./chart3d"

const config = {
  total: { label: "Expenditure (incl. tax)", color: "var(--dataviz-3)" },
} satisfies ChartConfig

const PIE_COLORS = ["var(--dataviz-1)", "var(--dataviz-2)", "var(--dataviz-3)", "var(--dataviz-4)", "var(--dataviz-5)", "var(--dataviz-6)"]

/** `chartType` is a prop rather than read from the store directly, so this same component
 *  can back two independent chart-type toggles: the always-on "Expenditure by Service"
 *  card, and the "Cost by Service" card that swaps in for the contractor breakdown once a
 *  specific contractor is selected on the Dashboard. */
export function ServiceChart({
  data,
  chartType,
  onDrill,
}: {
  data: CategoryTotal[]
  chartType: ChartType
  onDrill: (title: string, invoices: CategoryTotal["invoices"]) => void
}) {
  const animate = useDisplayStore((s) => s.animationsEnabled)
  const labelsEnabled = useDisplayStore((s) => s.chartLabelsEnabled)
  const labelPosition = useDisplayStore((s) => s.chartLabelPosition)
  const isMobile = useIsMobile()
  const gid = useId()
  const valueLabel = (v: unknown) => fmtMoney(Number(v)).replace(".00", "")

  if (!data.length) {
    return <div className="flex h-[var(--chart-h)] items-center justify-center text-sm text-muted-foreground">No service data</div>
  }
  const top = data.slice(0, 8)

  function drill(d: CategoryTotal | null) {
    if (d) onDrill(`Invoices — ${d.service}`, d.invoices)
  }

  const total3D: Chart3DDatum[] = top.map((d, i) => ({ key: d.service, label: d.service, value: d.total, color: PIE_COLORS[i % PIE_COLORS.length], invoices: d.invoices }))
  const grandTotal = top.reduce((s, d) => s + d.total, 0)

  function renderDonut2D() {
    return (
      <ChartContainer config={config} className="h-[var(--chart-h)] w-full">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmtMoney(Number(v))} />} />
          <Pie
            data={top}
            dataKey="total"
            nameKey="service"
            innerRadius="45%"
            outerRadius={isMobile ? "76%" : "55%"}
            paddingAngle={DONUT_PAD_ANGLE}
            cornerRadius={DONUT_CORNER_RADIUS}
            shape={donut3DShape}
            activeShape={donutActiveShape}
            label={isMobile ? undefined : makeDonutOuterLabel(PIE_COLORS, 28, top.map((d) => ({ name: d.service, value: d.total })))}
            labelLine={false}
            // Recharts only shows Pie labels once its entrance animation resolves
            // (showLabels: !isAnimating internally) — with `top` a fresh array
            // every render, that transition seemingly never settles, so labels
            // never appeared. The desktop labeled view isn't worth an entrance
            // animation anyway; mobile (no outer labels) keeps its animation.
            isAnimationActive={isMobile ? animate : false}
            cursor="pointer"
            onClick={(_, index) => drill(top[index])}
          >
            {top.map((d, i) => (
              <Cell key={d.service} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
    )
  }

  if (chartType === "pie") return renderDonut2D()

  if (chartType === "donut3d" || chartType === "donut3dExploded" || chartType === "donutSemi3d") {
    const variant = chartType === "donut3dExploded" ? "exploded" : chartType === "donutSemi3d" ? "semi" : "solid"
    return (
      <div className="h-[var(--chart-h)] w-full">
        <Chart3DBoundary fallback={renderDonut2D()}>
          <LazyDonut3DScene
            data={total3D}
            variant={variant}
            otherColor="var(--muted-foreground)"
            centerLabel={{ title: "Total", value: fmtMoney(grandTotal).replace(".00", "") }}
            formatValue={valueLabel}
            onSliceClick={(d) => drill(top.find((t) => t.service === d.key) ?? null)}
          />
        </Chart3DBoundary>
      </div>
    )
  }

  if (chartType === "radar") {
    return (
      <ChartContainer config={config} className="h-[var(--chart-h)] w-full">
        <RadarChart data={top} onClick={(e) => drill(activeChartPayload<CategoryTotal>(e))}>
          <PolarGrid />
          <PolarAngleAxis dataKey="service" fontSize={10} />
          <PolarRadiusAxis tickFormatter={(v) => fmtMoney(v).replace(".00", "")} fontSize={9} />
          <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmtMoney(Number(v))} />} />
          <Radar dataKey="total" stroke="var(--color-total)" fill="var(--color-total)" fillOpacity={0.22} isAnimationActive={false} className="cursor-pointer">
            <LabelList dataKey="total" content={makePolarValueLabel(PIE_COLORS, valueLabel, -14)} />
          </Radar>
        </RadarChart>
      </ChartContainer>
    )
  }

  if (chartType === "treemap") {
    return (
      <ChartContainer config={config} className="h-[var(--chart-h)] w-full">
        <Treemap
          data={top.map((d) => ({ service: d.service, total: d.total }))}
          dataKey="total"
          nameKey="service"
          type="flat"
          aspectRatio={1.7}
          colorPanel={PIE_COLORS}
          stroke="var(--card)"
          isAnimationActive={animate}
          onClick={(node) => {
            const item = top.find((d) => d.service === node.name)
            if (item) drill(item)
          }}
        >
          <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmtMoney(Number(v))} />} />
        </Treemap>
      </ChartContainer>
    )
  }

  if (chartType === "radial") {
    // Rings with a similar value sweep by a similar amount from the shared start angle, so
    // their labels would otherwise land at nearly the same angle — spread those out before
    // handing the per-index push to the label renderer.
    const radialEntries = top.map((d) => ({ name: d.service, value: d.total }))
    return (
      <ChartContainer config={config} className="h-[var(--chart-h)] w-full">
        <RadialBarChart
          data={top}
          innerRadius="18%"
          outerRadius="52%"
          startAngle={90}
          endAngle={-270}
          onClick={(e) => drill(activeChartPayload<CategoryTotal>(e))}
        >
          <PolarAngleAxis type="number" domain={[0, "dataMax"]} tick={false} />
          <RadialBar dataKey="total" background={{ fill: "var(--muted)" }} cornerRadius={8} isAnimationActive={false}>
            {top.map((d, i) => <Cell key={d.service} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
            <LabelList dataKey="total" content={makeRadialBarValueLabel(PIE_COLORS, valueLabel, radialEntries)} />
          </RadialBar>
          <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmtMoney(Number(v))} />} />
        </RadialBarChart>
      </ChartContainer>
    )
  }

  if (chartType === "funnel") {
    return (
      <ChartContainer config={config} className="h-[var(--chart-h)] w-full">
        <FunnelChart onClick={(e) => drill(activeChartPayload<CategoryTotal>(e))}>
          <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmtMoney(Number(v))} />} />
          <Funnel data={top} dataKey="total" nameKey="service" isAnimationActive={animate}>
            {top.map((d, i) => <Cell key={d.service} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
            <LabelList position="right" fill="var(--foreground)" stroke="none" dataKey="service" fontSize={10} />
          </Funnel>
        </FunnelChart>
      </ChartContainer>
    )
  }

  function renderBar2D() {
    return (
      <ChartContainer config={config} className="h-[var(--chart-h)] w-full">
        <BarChart data={top} layout="vertical" margin={{ left: 8 }} onClick={(e) => drill(activeChartPayload<CategoryTotal>(e))} className="cursor-pointer">
          <CartesianGrid horizontal={false} />
          <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => fmtMoney(v).replace(".00", "")} />
          <YAxis dataKey="service" type="category" tickLine={false} axisLine={false} fontSize={11} width={110} />
          <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmtMoney(Number(v))} />} />
          <Bar dataKey="total" fill="var(--color-total)" radius={8} isAnimationActive={animate}>
            {labelsEnabled && (
              <LabelList
                dataKey="total"
                position={labelPosition === "inside" ? "insideRight" : "right"}
                formatter={valueLabel}
                fontSize={10}
                fill={labelPosition === "inside" ? "var(--background)" : "var(--muted-foreground)"}
              />
            )}
          </Bar>
        </BarChart>
      </ChartContainer>
    )
  }

  if (chartType === "bar") return renderBar2D()

  if (chartType === "bar3d") {
    return (
      <div className="h-[var(--chart-h)] w-full">
        <Chart3DBoundary fallback={renderBar2D()}>
          <LazyBar3DScene
            data={total3D}
            otherColor="var(--muted-foreground)"
            formatValue={valueLabel}
            onBarClick={(d) => drill(top.find((t) => t.service === d.key) ?? null)}
          />
        </Chart3DBoundary>
      </div>
    )
  }

  function renderArea2D() {
    return (
      <ChartContainer config={config} className="h-[var(--chart-h)] w-full">
        <ComposedChart data={top} onClick={(e) => drill(activeChartPayload<CategoryTotal>(e))} className="cursor-pointer">
          <CartesianGrid vertical={false} />
          <XAxis dataKey="service" tickLine={false} axisLine={false} fontSize={10} interval={0} angle={-20} textAnchor="end" height={45} />
          <YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => fmtMoney(v).replace(".00", "")} width={60} />
          <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmtMoney(Number(v))} />} />
          <Area3DDefs id={`${gid}-area`} color="var(--dataviz-3)" />
          <Area
            type="monotone"
            dataKey="total"
            stroke="var(--color-total)"
            strokeWidth={3}
            strokeLinecap="round"
            fill={`url(#${gid}-area)`}
            filter={`url(#${gid}-area-glow)`}
            dot={{ r: 3.5, fill: "var(--dataviz-3)", stroke: "var(--card)", strokeWidth: 1.5 }}
            activeDot={{ r: 7, strokeWidth: 2, stroke: "var(--card)", fill: "var(--dataviz-3)" }}
            isAnimationActive={animate}
          >
            {labelsEnabled && <LabelList dataKey="total" position="top" formatter={valueLabel} fontSize={10} fill="var(--muted-foreground)" />}
          </Area>
        </ComposedChart>
      </ChartContainer>
    )
  }

  if (chartType === "area") return renderArea2D()

  if (chartType === "area3d") {
    return (
      <div className="h-[var(--chart-h)] w-full">
        <Chart3DBoundary fallback={renderArea2D()}>
          <LazyArea3DScene
            points={top.map((d) => ({ key: d.service, label: d.service, value: d.total }))}
            color="var(--dataviz-3)"
            formatValue={valueLabel}
            onPointClick={(p) => drill(top.find((t) => t.service === p.key) ?? null)}
          />
        </Chart3DBoundary>
      </div>
    )
  }

  return (
    <ChartContainer config={config} className="h-[var(--chart-h)] w-full">
      <ComposedChart data={top} onClick={(e) => drill(activeChartPayload<CategoryTotal>(e))} className="cursor-pointer">
        <CartesianGrid vertical={false} />
        <XAxis dataKey="service" tickLine={false} axisLine={false} fontSize={10} interval={0} angle={-20} textAnchor="end" height={45} />
        <YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => fmtMoney(v).replace(".00", "")} width={60} />
        <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmtMoney(Number(v))} />} />
        <Line
          type="monotone"
          dataKey="total"
          stroke="var(--color-total)"
          strokeWidth={2.75}
          strokeLinecap="round"
          dot={{ r: 3.5 }}
          activeDot={{ r: 6, strokeWidth: 2, stroke: "var(--background)" }}
          isAnimationActive={animate}
        >
          {labelsEnabled && <LabelList dataKey="total" position="top" formatter={valueLabel} fontSize={10} fill="var(--muted-foreground)" />}
        </Line>
      </ComposedChart>
    </ChartContainer>
  )
}
