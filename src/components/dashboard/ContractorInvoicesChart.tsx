import { useId } from "react"
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
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
import { vendorColor, type VendorCount } from "@/lib/dashboard"
import { useDisplayStore } from "@/store/useDisplayStore"
import { useIsMobile } from "@/hooks/useIsMobile"
import { DONUT_CORNER_RADIUS, DONUT_PAD_ANGLE, DonutDefs, donutActiveShape, donutGradientId } from "./donut3d"

const config = {
  count: { label: "Invoices" },
} satisfies ChartConfig

/** Number of invoices on file per contractor — shown for the "All" contractor view.
 *  Once a specific contractor is picked on the Dashboard, this slot swaps to
 *  ServiceCountChart instead (see DashboardPage). */
export function ContractorInvoicesChart({ data, onDrill }: { data: VendorCount[]; onDrill: (title: string, invoices: VendorCount["invoices"]) => void }) {
  const chartType = useDisplayStore((s) => s.breakdownChartType)
  const animate = useDisplayStore((s) => s.animationsEnabled)
  const isMobile = useIsMobile()
  const gid = useId()

  if (!data.length) {
    return <div className="flex h-[var(--chart-h)] items-center justify-center text-sm text-muted-foreground">No invoice data</div>
  }
  const top = data.slice(0, 10)

  function drill(d: VendorCount | null) {
    if (d) onDrill(`Invoices — ${d.vendor}`, d.invoices)
  }

  if (chartType === "pie") {
    return (
      <ChartContainer config={config} className="h-[var(--chart-h)] w-full">
        <PieChart>
          {isMobile && <DonutDefs idBase={gid} colors={top.map((d, i) => vendorColor(d.vendor, i))} />}
          <ChartTooltip content={<ChartTooltipContent />} />
          <Pie
            data={top}
            dataKey="count"
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
                fill={isMobile ? `url(#${donutGradientId(gid, i)})` : vendorColor(d.vendor, i)}
                stroke={isMobile ? "var(--card)" : undefined}
                strokeWidth={isMobile ? 2 : undefined}
              />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
    )
  }

  if (chartType === "radar") {
    return (
      <ChartContainer config={config} className="h-[var(--chart-h)] w-full">
        <RadarChart data={top} onClick={(e) => drill(activeChartPayload<VendorCount>(e))}>
          <PolarGrid />
          <PolarAngleAxis dataKey="vendor" fontSize={10} />
          <PolarRadiusAxis fontSize={9} allowDecimals={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Radar dataKey="count" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.35} isAnimationActive={animate} className="cursor-pointer" />
        </RadarChart>
      </ChartContainer>
    )
  }

  if (chartType === "treemap") {
    return (
      <ChartContainer config={config} className="h-[var(--chart-h)] w-full">
        <Treemap
          data={top.map((d) => ({ vendor: d.vendor, count: d.count }))}
          dataKey="count"
          nameKey="vendor"
          type="flat"
          aspectRatio={1.7}
          colorPanel={top.map((d, i) => vendorColor(d.vendor, i))}
          stroke="var(--card)"
          isAnimationActive={animate}
          onClick={(node) => {
            const item = top.find((d) => d.vendor === node.name)
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
        <BarChart data={top} layout="vertical" margin={{ left: 8 }} onClick={(e) => drill(activeChartPayload<VendorCount>(e))} className="cursor-pointer">
          <CartesianGrid horizontal={false} />
          <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
          <YAxis dataKey="vendor" type="category" tickLine={false} axisLine={false} fontSize={11} width={115} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="count" radius={[0, 8, 8, 0]} isAnimationActive={animate}>
            {top.map((d, i) => <Cell key={d.vendor} fill={vendorColor(d.vendor, i)} />)}
          </Bar>
        </BarChart>
      </ChartContainer>
    )
  }

  if (chartType === "bar") {
    return (
      <ChartContainer config={config} className="h-[var(--chart-h)] w-full">
        <BarChart data={top} onClick={(e) => drill(activeChartPayload<VendorCount>(e))} className="cursor-pointer">
          <CartesianGrid vertical={false} />
          <XAxis dataKey="vendor" tickLine={false} axisLine={false} fontSize={11} interval={0} angle={-20} textAnchor="end" height={50} />
          <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} width={32} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="count" radius={[8, 8, 3, 3]} isAnimationActive={animate}>
            {top.map((d, i) => (
              <Cell key={d.vendor} fill={vendorColor(d.vendor, i)} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    )
  }

  return (
    <ChartContainer config={config} className="h-[var(--chart-h)] w-full">
      <ComposedChart data={top} onClick={(e) => drill(activeChartPayload<VendorCount>(e))} className="cursor-pointer">
        <CartesianGrid vertical={false} />
        <XAxis dataKey="vendor" tickLine={false} axisLine={false} fontSize={11} interval={0} angle={-20} textAnchor="end" height={50} />
        <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} width={32} />
        <ChartTooltip content={<ChartTooltipContent />} />
        {chartType === "line" && (
          <Line
            type="monotone"
            dataKey="count"
            stroke="var(--chart-1)"
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
              <linearGradient id="contractorCountGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.45} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="count"
              stroke="var(--chart-1)"
              strokeWidth={2.75}
              strokeLinecap="round"
              fill="url(#contractorCountGradient)"
              activeDot={{ r: 6, strokeWidth: 2, stroke: "var(--background)" }}
              isAnimationActive={animate}
            />
          </>
        )}
      </ComposedChart>
    </ChartContainer>
  )
}
