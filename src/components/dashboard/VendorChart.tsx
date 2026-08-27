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
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { activeChartPayload } from "@/lib/chartClick"
import {
  fmtMoney,
  vendorColor,
  type VendorServiceBreakdown,
  type VendorServiceRow,
  type VendorTotal,
  type VendorTypeBreakdown,
} from "@/lib/dashboard"
import { useDisplayStore } from "@/store/useDisplayStore"
import { useIsMobile } from "@/hooks/useIsMobile"
import type { Invoice } from "@/types/invoice"
import { DONUT_CORNER_RADIUS, DONUT_PAD_ANGLE, DonutDefs, donutActiveShape, donutGradientId } from "./donut3d"

const config = {
  total: { label: "Expenditure (incl. tax)" },
} satisfies ChartConfig

const SERVICE_COLORS = ["var(--dataviz-1)", "var(--dataviz-2)", "var(--dataviz-3)", "var(--dataviz-4)", "var(--dataviz-5)", "var(--dataviz-6)"]

interface TypeSlice {
  type: string
  total: number
  invoices: Invoice[]
}

const totalLabelFormatter = (v: unknown) => fmtMoney(Number(v)).replace(".00", "")

export function VendorChart({
  data,
  serviceBreakdown,
  typeBreakdown,
  onDrill,
}: {
  data: VendorTotal[]
  serviceBreakdown: VendorServiceBreakdown
  typeBreakdown: VendorTypeBreakdown
  onDrill: (title: string, invoices: VendorTotal["invoices"]) => void
}) {
  const chartType = useDisplayStore((s) => s.vendorChartType)
  const animate = useDisplayStore((s) => s.animationsEnabled)
  const labelsEnabled = useDisplayStore((s) => s.chartLabelsEnabled)
  const isMobile = useIsMobile()
  const gid = useId()

  if (!data.length) {
    return <div className="flex h-[var(--chart-h)] items-center justify-center text-sm text-muted-foreground">No vendor data</div>
  }
  const top = data.slice(0, 10)

  function drill(d: VendorTotal | null) {
    if (d) onDrill(`Invoices — ${d.vendor}`, d.invoices)
  }

  // Once the Dashboard's contractor filter has narrowed things to one contractor, a chart
  // keyed by vendor has only one thing to show — a single flat slice/point/bar. Break that
  // one contractor's total down by work type instead (Dewatering, Sprinkling, Unspecified,
  // etc.) — the same dimension the "Invoices by Type" chart uses for its count breakdown.
  const singleVendorType = top.length === 1 ? typeBreakdown.rows.find((r) => r.vendor === top[0].vendor) : undefined
  const bySingleVendorType: TypeSlice[] | null = singleVendorType
    ? typeBreakdown.types
        .map((t) => ({ type: t, total: singleVendorType.values[t] ?? 0, invoices: singleVendorType.invoicesByType[t] ?? [] }))
        .filter((d) => d.total > 0)
    : null

  function drillType(d: TypeSlice | null) {
    if (d && singleVendorType) onDrill(`Invoices — ${singleVendorType.vendor} · ${d.type}`, d.invoices)
  }

  if (chartType === "pie") {
    if (bySingleVendorType) {
      const legendConfig: ChartConfig = Object.fromEntries(
        bySingleVendorType.map((d, i) => [d.type, { label: d.type, color: SERVICE_COLORS[i % SERVICE_COLORS.length] }]),
      )
      return (
        <ChartContainer config={legendConfig} className="h-[var(--chart-h)] w-full">
          <PieChart>
            {isMobile && <DonutDefs idBase={gid} colors={SERVICE_COLORS} />}
            <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmtMoney(Number(v))} />} />
            <Pie
              data={bySingleVendorType}
              dataKey="total"
              nameKey="type"
              innerRadius="45%"
              outerRadius="80%"
              paddingAngle={isMobile ? DONUT_PAD_ANGLE : undefined}
              cornerRadius={isMobile ? DONUT_CORNER_RADIUS : undefined}
              activeShape={isMobile ? donutActiveShape : undefined}
              isAnimationActive={animate}
              cursor="pointer"
              onClick={(_, index) => drillType(bySingleVendorType[index])}
            >
              {bySingleVendorType.map((d, i) => (
                <Cell
                  key={d.type}
                  fill={isMobile ? `url(#${donutGradientId(gid, i % SERVICE_COLORS.length)})` : SERVICE_COLORS[i % SERVICE_COLORS.length]}
                  stroke={isMobile ? "var(--card)" : undefined}
                  strokeWidth={isMobile ? 2 : undefined}
                />
              ))}
            </Pie>
            <ChartLegend content={<ChartLegendContent nameKey="type" />} />
          </PieChart>
        </ChartContainer>
      )
    }
    const vendorLegendConfig: ChartConfig = Object.fromEntries(
      top.map((d, i) => [d.vendor, { label: d.vendor, color: vendorColor(d.vendor, i) }]),
    )
    return (
      <ChartContainer config={vendorLegendConfig} className="h-[var(--chart-h)] w-full">
        <PieChart>
          {isMobile && <DonutDefs idBase={`${gid}-v`} colors={top.map((d, i) => vendorColor(d.vendor, i))} />}
          <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmtMoney(Number(v))} />} />
          <Pie
            data={top}
            dataKey="total"
            nameKey="vendor"
            innerRadius="45%"
            outerRadius="80%"
            paddingAngle={isMobile ? DONUT_PAD_ANGLE : undefined}
            cornerRadius={isMobile ? DONUT_CORNER_RADIUS : undefined}
            activeShape={isMobile ? donutActiveShape : undefined}
            isAnimationActive={animate}
            cursor="pointer"
            onClick={(_, index) => drill(top[index])}
          >
            {top.map((d, i) => (
              <Cell
                key={d.vendor}
                fill={isMobile ? `url(#${donutGradientId(`${gid}-v`, i)})` : vendorColor(d.vendor, i)}
                stroke={isMobile ? "var(--card)" : undefined}
                strokeWidth={isMobile ? 2 : undefined}
              />
            ))}
          </Pie>
          <ChartLegend content={<ChartLegendContent nameKey="vendor" />} />
        </PieChart>
      </ChartContainer>
    )
  }

  if (chartType === "radar") {
    if (bySingleVendorType) {
      return (
        <ChartContainer config={config} className="h-[var(--chart-h)] w-full">
          <RadarChart data={bySingleVendorType} onClick={(e) => drillType(activeChartPayload<TypeSlice>(e))}>
            <PolarGrid />
            <PolarAngleAxis dataKey="type" fontSize={10} />
            <PolarRadiusAxis tickFormatter={(v) => fmtMoney(v).replace(".00", "")} fontSize={9} />
            <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmtMoney(Number(v))} />} />
            <Radar dataKey="total" stroke="var(--dataviz-4)" fill="var(--dataviz-4)" fillOpacity={0.35} isAnimationActive={animate} className="cursor-pointer" />
          </RadarChart>
        </ChartContainer>
      )
    }
    return (
      <ChartContainer config={config} className="h-[var(--chart-h)] w-full">
        <RadarChart data={top} onClick={(e) => drill(activeChartPayload<VendorTotal>(e))}>
          <PolarGrid />
          <PolarAngleAxis dataKey="vendor" fontSize={10} />
          <PolarRadiusAxis tickFormatter={(v) => fmtMoney(v).replace(".00", "")} fontSize={9} />
          <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmtMoney(Number(v))} />} />
          <Radar dataKey="total" stroke="var(--dataviz-4)" fill="var(--dataviz-4)" fillOpacity={0.35} isAnimationActive={animate} className="cursor-pointer" />
        </RadarChart>
      </ChartContainer>
    )
  }

  if (chartType === "treemap") {
    const treemapData = bySingleVendorType
      ? bySingleVendorType.map((d) => ({ type: d.type, total: d.total }))
      : top.map((d) => ({ vendor: d.vendor, total: d.total }))
    const nameKey = bySingleVendorType ? "type" : "vendor"
    const dataKey = "total"
    const colors = bySingleVendorType ? SERVICE_COLORS : top.map((d, i) => vendorColor(d.vendor, i))
    return (
      <ChartContainer config={config} className="h-[var(--chart-h)] w-full">
        <Treemap
          data={treemapData}
          dataKey={dataKey}
          nameKey={nameKey}
          type="flat"
          aspectRatio={1.7}
          colorPanel={colors}
          stroke="var(--card)"
          isAnimationActive={animate}
          onClick={(node) => {
            if (bySingleVendorType) {
              const item = bySingleVendorType.find((d) => d.type === node.name)
              if (item) drillType(item)
            } else {
              const item = top.find((d) => d.vendor === node.name)
              if (item) drill(item)
            }
          }}
        >
          <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmtMoney(Number(v))} />} />
        </Treemap>
      </ChartContainer>
    )
  }

  if (chartType === "horizontalBar") {
    if (bySingleVendorType) {
      return (
        <ChartContainer config={config} className="h-[var(--chart-h)] w-full">
          <BarChart data={bySingleVendorType} layout="vertical" margin={{ left: 8 }} onClick={(e) => drillType(activeChartPayload<TypeSlice>(e))} className="cursor-pointer">
            <CartesianGrid horizontal={false} />
            <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => fmtMoney(v).replace(".00", "")} />
            <YAxis dataKey="type" type="category" tickLine={false} axisLine={false} fontSize={11} width={110} />
            <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmtMoney(Number(v))} />} />
            <Bar dataKey="total" radius={[0, 8, 8, 0]} isAnimationActive={animate}>
              {bySingleVendorType.map((d, i) => <Cell key={d.type} fill={SERVICE_COLORS[i % SERVICE_COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ChartContainer>
      )
    }
    return (
      <ChartContainer config={config} className="h-[var(--chart-h)] w-full">
        <BarChart data={top} layout="vertical" margin={{ left: 8 }} onClick={(e) => drill(activeChartPayload<VendorTotal>(e))} className="cursor-pointer">
          <CartesianGrid horizontal={false} />
          <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => fmtMoney(v).replace(".00", "")} />
          <YAxis dataKey="vendor" type="category" tickLine={false} axisLine={false} fontSize={11} width={115} />
          <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmtMoney(Number(v))} />} />
          <Bar dataKey="total" radius={[0, 8, 8, 0]} isAnimationActive={animate}>
            {top.map((d, i) => <Cell key={d.vendor} fill={vendorColor(d.vendor, i)} />)}
          </Bar>
        </BarChart>
      </ChartContainer>
    )
  }

  if (chartType === "bar") {
    if (singleVendorType) {
      // Single contractor selected: one bar, stacked by work type instead of service —
      // matches the pie/radar/line/area breakdown above and the "Invoices by Type" chart.
      const sv = singleVendorType
      const { types } = typeBreakdown
      const legendConfig: ChartConfig = Object.fromEntries(types.map((t) => [t, { label: t }]))
      const stackData = [{ vendor: sv.vendor, total: sv.total, ...sv.values }]

      function drillTypeSegment(t: string) {
        onDrill(`Invoices — ${sv.vendor} · ${t}`, sv.invoicesByType[t] ?? [])
      }

      return (
        <ChartContainer config={legendConfig} className="h-[var(--chart-h)] w-full">
          <BarChart data={stackData}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="vendor" tickLine={false} axisLine={false} fontSize={11} />
            <YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => fmtMoney(v).replace(".00", "")} width={60} />
            <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmtMoney(Number(v))} />} />
            <ChartLegend content={<ChartLegendContent />} />
            {types.map((t, i) => (
              <Bar
                key={t}
                dataKey={t}
                name={t}
                stackId="type"
                fill={SERVICE_COLORS[i % SERVICE_COLORS.length]}
                radius={i === types.length - 1 ? [8, 8, 0, 0] : 0}
                isAnimationActive={animate}
                cursor="pointer"
                onClick={() => drillTypeSegment(t)}
              >
                {i === types.length - 1 && labelsEnabled && (
                  <LabelList dataKey="total" position="top" formatter={totalLabelFormatter} fontSize={10} fill="var(--foreground)" />
                )}
              </Bar>
            ))}
          </BarChart>
        </ChartContainer>
      )
    }
    // Multiple contractors: stacked by service instead of one flat bar per contractor, so
    // the cost breakdown is visible per contractor rather than just a total.
    const { rows: serviceRows, services } = serviceBreakdown
    const legendConfig: ChartConfig = Object.fromEntries(services.map((s) => [s, { label: s }]))
    const stackData = serviceRows.map((r) => ({ ...r.values, vendor: r.vendor, total: r.total, invoicesByService: r.invoicesByService }))

    function drillSegment(row: VendorServiceRow | undefined, service: string) {
      if (!row) return
      onDrill(`Invoices — ${row.vendor} · ${service}`, row.invoicesByService[service] ?? [])
    }

    return (
      <ChartContainer config={legendConfig} className="h-[var(--chart-h)] w-full">
        <BarChart data={stackData}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="vendor" tickLine={false} axisLine={false} fontSize={11} interval={0} angle={-20} textAnchor="end" height={50} />
          <YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => fmtMoney(v).replace(".00", "")} width={60} />
          <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmtMoney(Number(v))} />} />
          <ChartLegend content={<ChartLegendContent />} />
          {services.map((s, i) => (
            <Bar
              key={s}
              dataKey={s}
              name={s}
              stackId="service"
              fill={SERVICE_COLORS[i % SERVICE_COLORS.length]}
              radius={i === services.length - 1 ? [8, 8, 0, 0] : 0}
              isAnimationActive={animate}
              cursor="pointer"
              onClick={(d) => drillSegment((d as { payload?: VendorServiceRow })?.payload, s)}
            >
              {/* One total label per contractor, on the topmost segment of its stack. */}
              {i === services.length - 1 && labelsEnabled && (
                <LabelList dataKey="total" position="top" formatter={totalLabelFormatter} fontSize={10} fill="var(--foreground)" />
              )}
            </Bar>
          ))}
        </BarChart>
      </ChartContainer>
    )
  }

  // line / area
  if (bySingleVendorType) {
    return (
      <ChartContainer config={config} className="h-[var(--chart-h)] w-full">
        <ComposedChart data={bySingleVendorType} onClick={(e) => drillType(activeChartPayload<TypeSlice>(e))} className="cursor-pointer">
          <CartesianGrid vertical={false} />
          <XAxis dataKey="type" tickLine={false} axisLine={false} fontSize={10} interval={0} angle={-20} textAnchor="end" height={45} />
          <YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => fmtMoney(v).replace(".00", "")} width={60} />
          <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmtMoney(Number(v))} />} />
          {chartType === "line" && (
            <Line
              type="monotone"
              dataKey="total"
              stroke="var(--dataviz-4)"
              strokeWidth={2.75}
              strokeLinecap="round"
              dot={{ r: 3.5 }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: "var(--background)" }}
              isAnimationActive={animate}
            >
              {labelsEnabled && <LabelList dataKey="total" position="top" formatter={totalLabelFormatter} fontSize={10} fill="var(--foreground)" />}
            </Line>
          )}
          {chartType === "area" && (
            <>
              <defs>
                <linearGradient id="vendorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--dataviz-4)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="var(--dataviz-4)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="total"
                stroke="var(--dataviz-4)"
                strokeWidth={2.75}
                strokeLinecap="round"
                fill="url(#vendorGradient)"
                activeDot={{ r: 6, strokeWidth: 2, stroke: "var(--background)" }}
                isAnimationActive={animate}
              >
                {labelsEnabled && <LabelList dataKey="total" position="top" formatter={totalLabelFormatter} fontSize={10} fill="var(--foreground)" />}
              </Area>
            </>
          )}
        </ComposedChart>
      </ChartContainer>
    )
  }

  return (
    <ChartContainer config={config} className="h-[var(--chart-h)] w-full">
      <ComposedChart data={top} onClick={(e) => drill(activeChartPayload<VendorTotal>(e))} className="cursor-pointer">
        <CartesianGrid vertical={false} />
        <XAxis dataKey="vendor" tickLine={false} axisLine={false} fontSize={11} interval={0} angle={-20} textAnchor="end" height={50} />
        <YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => fmtMoney(v).replace(".00", "")} width={60} />
        <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmtMoney(Number(v))} />} />
        {chartType === "line" && (
          <Line
            type="monotone"
            dataKey="total"
            stroke="var(--dataviz-4)"
            strokeWidth={2.75}
            strokeLinecap="round"
            dot={{ r: 3.5 }}
            activeDot={{ r: 6, strokeWidth: 2, stroke: "var(--background)" }}
            isAnimationActive={animate}
          >
            <LabelList dataKey="total" position="top" formatter={totalLabelFormatter} fontSize={10} fill="var(--foreground)" />
          </Line>
        )}
        {chartType === "area" && (
          <>
            <defs>
              <linearGradient id="vendorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--dataviz-4)" stopOpacity={0.45} />
                <stop offset="100%" stopColor="var(--dataviz-4)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="total"
              stroke="var(--dataviz-4)"
              strokeWidth={2.75}
              strokeLinecap="round"
              fill="url(#vendorGradient)"
              activeDot={{ r: 6, strokeWidth: 2, stroke: "var(--background)" }}
              isAnimationActive={animate}
            >
              {labelsEnabled && <LabelList dataKey="total" position="top" formatter={totalLabelFormatter} fontSize={10} fill="var(--foreground)" />}
            </Area>
          </>
        )}
      </ComposedChart>
    </ChartContainer>
  )
}
