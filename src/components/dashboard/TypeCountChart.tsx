import { useId } from "react"
import {
  Area,
  Bar,
  BarChart,
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
  Treemap,
  XAxis,
  YAxis,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { activeChartPayload } from "@/lib/chartClick"
import type { TypeCount } from "@/lib/dashboard"
import { useDisplayStore } from "@/store/useDisplayStore"
import { useIsMobile } from "@/hooks/useIsMobile"
import {
  Area3DDefs,
  DONUT_CORNER_RADIUS,
  DONUT_PAD_ANGLE,
  donutActiveShape,
  makeDonutOuterLabel,
  makePolarValueLabel,
} from "./donut3d"
import { Chart3DBoundary, LazyArea3DScene, LazyBar3DScene, LazyDonut3DScene, type Chart3DDatum } from "./chart3d"

const config = {
  count: { label: "Invoices", color: "var(--dataviz-2)" },
} satisfies ChartConfig

const countLabel = (v: unknown) => String(Math.round(Number(v)))

const PIE_COLORS = ["var(--dataviz-1)", "var(--dataviz-2)", "var(--dataviz-3)", "var(--dataviz-4)", "var(--dataviz-5)", "var(--dataviz-6)"]

/** How many invoices fall under each work type (Dewatering, Mud Engineering, Local Mud
 *  Chemicals, etc.) — shown once a specific contractor is picked on the Dashboard, scoped
 *  to that one contractor's invoices. Swaps in for ContractorInvoicesChart in that case. */
export function TypeCountChart({ data, onDrill }: { data: TypeCount[]; onDrill: (title: string, invoices: TypeCount["invoices"]) => void }) {
  const chartType = useDisplayStore((s) => s.breakdownChartType)
  const animate = useDisplayStore((s) => s.animationsEnabled)
  const labelsEnabled = useDisplayStore((s) => s.chartLabelsEnabled)
  const labelPosition = useDisplayStore((s) => s.chartLabelPosition)
  const isMobile = useIsMobile()
  const gid = useId()

  if (!data.length) {
    return <div className="flex h-[var(--chart-h)] items-center justify-center text-sm text-muted-foreground">No type data</div>
  }
  const top = data.slice(0, 8)

  function drill(d: TypeCount | null) {
    if (d) onDrill(`Invoices — ${d.type}`, d.invoices)
  }

  const type3D: Chart3DDatum[] = top.map((d, i) => ({ key: d.type, label: d.type, value: d.count, color: PIE_COLORS[i % PIE_COLORS.length], invoices: d.invoices }))
  const typeGrandTotal = top.reduce((s, d) => s + d.count, 0)

  function renderDonut2D() {
    return (
      <ChartContainer config={config} className="h-[var(--chart-h)] w-full">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent />} />
          <Pie
            data={top}
            dataKey="count"
            nameKey="type"
            innerRadius="45%"
            outerRadius={isMobile ? "76%" : "55%"}
            paddingAngle={DONUT_PAD_ANGLE}
            cornerRadius={DONUT_CORNER_RADIUS}
            activeShape={donutActiveShape}
            label={isMobile ? undefined : makeDonutOuterLabel(PIE_COLORS, 28, top.map((d) => ({ name: d.type, value: d.count })))}
            labelLine={false}
            isAnimationActive={isMobile ? animate : false}
            cursor="pointer"
            onClick={(_, index) => drill(top[index])}
          >
            {top.map((d, i) => (
              <Cell key={d.type} fill={PIE_COLORS[i % PIE_COLORS.length]} />
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
            data={type3D}
            variant={variant}
            otherColor="var(--muted-foreground)"
            centerLabel={{ title: "Total", value: String(typeGrandTotal) }}
            formatValue={countLabel}
            onSliceClick={(d) => drill(top.find((t) => t.type === d.key) ?? null)}
          />
        </Chart3DBoundary>
      </div>
    )
  }

  if (chartType === "radar") {
    return (
      <ChartContainer config={config} className="h-[var(--chart-h)] w-full">
        <RadarChart data={top} onClick={(e) => drill(activeChartPayload<TypeCount>(e))}>
          <PolarGrid />
          <PolarAngleAxis dataKey="type" fontSize={10} />
          <PolarRadiusAxis fontSize={9} allowDecimals={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Radar dataKey="count" stroke="var(--color-count)" fill="var(--color-count)" fillOpacity={0.22} isAnimationActive={false} className="cursor-pointer">
            <LabelList dataKey="count" content={makePolarValueLabel(PIE_COLORS, undefined, -14)} />
          </Radar>
        </RadarChart>
      </ChartContainer>
    )
  }

  if (chartType === "treemap") {
    return (
      <ChartContainer config={config} className="h-[var(--chart-h)] w-full">
        <Treemap
          data={top.map((d) => ({ type: d.type, count: d.count }))}
          dataKey="count"
          nameKey="type"
          type="flat"
          aspectRatio={1.7}
          colorPanel={PIE_COLORS}
          stroke="var(--card)"
          isAnimationActive={animate}
          onClick={(node) => {
            const item = top.find((d) => d.type === node.name)
            if (item) drill(item)
          }}
        >
          <ChartTooltip content={<ChartTooltipContent />} />
        </Treemap>
      </ChartContainer>
    )
  }

  if (chartType === "horizontalBar") {
    return (
      <ChartContainer config={config} className="h-[var(--chart-h)] w-full">
        <BarChart data={top} layout="vertical" margin={{ left: 8 }} onClick={(e) => drill(activeChartPayload<TypeCount>(e))} className="cursor-pointer">
          <CartesianGrid horizontal={false} />
          <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
          <YAxis dataKey="type" type="category" tickLine={false} axisLine={false} fontSize={11} width={110} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="count" fill="var(--color-count)" radius={8} isAnimationActive={animate}>
            {labelsEnabled && (
              <LabelList
                dataKey="count"
                position={labelPosition === "inside" ? "insideRight" : "right"}
                fontSize={10}
                fill={labelPosition === "inside" ? "var(--background)" : "var(--muted-foreground)"}
              />
            )}
          </Bar>
        </BarChart>
      </ChartContainer>
    )
  }

  function renderBar2D() {
    return (
      <ChartContainer config={config} className="h-[var(--chart-h)] w-full">
        <BarChart data={top} layout="vertical" margin={{ left: 8 }} onClick={(e) => drill(activeChartPayload<TypeCount>(e))} className="cursor-pointer">
          <CartesianGrid horizontal={false} />
          <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
          <YAxis dataKey="type" type="category" tickLine={false} axisLine={false} fontSize={11} width={110} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="count" fill="var(--color-count)" radius={8} isAnimationActive={animate}>
            {labelsEnabled && (
              <LabelList
                dataKey="count"
                position={labelPosition === "inside" ? "insideRight" : "right"}
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
            data={type3D}
            otherColor="var(--muted-foreground)"
            formatValue={countLabel}
            onBarClick={(d) => drill(top.find((t) => t.type === d.key) ?? null)}
          />
        </Chart3DBoundary>
      </div>
    )
  }

  function renderArea2D() {
    return (
      <ChartContainer config={config} className="h-[var(--chart-h)] w-full">
        <ComposedChart data={top} onClick={(e) => drill(activeChartPayload<TypeCount>(e))} className="cursor-pointer">
          <CartesianGrid vertical={false} />
          <XAxis dataKey="type" tickLine={false} axisLine={false} fontSize={10} interval={0} angle={-20} textAnchor="end" height={45} />
          <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} width={32} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Area3DDefs id={`${gid}-area`} color="var(--dataviz-2)" />
          <Area
            type="monotone"
            dataKey="count"
            stroke="var(--color-count)"
            strokeWidth={3}
            strokeLinecap="round"
            fill={`url(#${gid}-area)`}
            filter={`url(#${gid}-area-glow)`}
            dot={{ r: 3.5, fill: "var(--dataviz-2)", stroke: "var(--card)", strokeWidth: 1.5 }}
            activeDot={{ r: 7, strokeWidth: 2, stroke: "var(--card)", fill: "var(--dataviz-2)" }}
            isAnimationActive={animate}
          >
            {labelsEnabled && <LabelList dataKey="count" position="top" fontSize={10} fill="var(--muted-foreground)" />}
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
            points={top.map((d) => ({ key: d.type, label: d.type, value: d.count }))}
            color="var(--dataviz-2)"
            formatValue={countLabel}
            onPointClick={(p) => drill(top.find((t) => t.type === p.key) ?? null)}
          />
        </Chart3DBoundary>
      </div>
    )
  }

  return (
    <ChartContainer config={config} className="h-[var(--chart-h)] w-full">
      <ComposedChart data={top} onClick={(e) => drill(activeChartPayload<TypeCount>(e))} className="cursor-pointer">
        <CartesianGrid vertical={false} />
        <XAxis dataKey="type" tickLine={false} axisLine={false} fontSize={10} interval={0} angle={-20} textAnchor="end" height={45} />
        <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} width={32} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          type="monotone"
          dataKey="count"
          stroke="var(--color-count)"
          strokeWidth={2.75}
          strokeLinecap="round"
          dot={{ r: 3.5 }}
          activeDot={{ r: 6, strokeWidth: 2, stroke: "var(--background)" }}
          isAnimationActive={animate}
        >
          {labelsEnabled && <LabelList dataKey="count" position="top" fontSize={10} fill="var(--muted-foreground)" />}
        </Line>
      </ComposedChart>
    </ChartContainer>
  )
}
