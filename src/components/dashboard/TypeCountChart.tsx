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
  XAxis,
  YAxis,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { activeChartPayload } from "@/lib/chartClick"
import type { TypeCount } from "@/lib/dashboard"
import { useDisplayStore } from "@/store/useDisplayStore"

const config = {
  count: { label: "Invoices", color: "var(--chart-2)" },
} satisfies ChartConfig

const PIE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"]

/** How many invoices fall under each work type (Dewatering, Mud Engineering, Local Mud
 *  Chemicals, etc.) — shown once a specific contractor is picked on the Dashboard, scoped
 *  to that one contractor's invoices. Swaps in for ContractorInvoicesChart in that case. */
export function TypeCountChart({ data, onDrill }: { data: TypeCount[]; onDrill: (title: string, invoices: TypeCount["invoices"]) => void }) {
  const chartType = useDisplayStore((s) => s.breakdownChartType)
  const animate = useDisplayStore((s) => s.animationsEnabled)

  if (!data.length) {
    return <div className="flex h-[var(--chart-h)] items-center justify-center text-sm text-muted-foreground">No type data</div>
  }
  const top = data.slice(0, 8)

  function drill(d: TypeCount | null) {
    if (d) onDrill(`Invoices — ${d.type}`, d.invoices)
  }

  if (chartType === "pie") {
    return (
      <ChartContainer config={config} className="h-[var(--chart-h)] w-full">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent />} />
          <Pie
            data={top}
            dataKey="count"
            nameKey="type"
            innerRadius="45%"
            outerRadius="80%"
            isAnimationActive={animate}
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

  if (chartType === "radar") {
    return (
      <ChartContainer config={config} className="h-[var(--chart-h)] w-full">
        <RadarChart data={top} onClick={(e) => drill(activeChartPayload<TypeCount>(e))}>
          <PolarGrid />
          <PolarAngleAxis dataKey="type" fontSize={10} />
          <PolarRadiusAxis fontSize={9} allowDecimals={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Radar dataKey="count" stroke="var(--color-count)" fill="var(--color-count)" fillOpacity={0.35} isAnimationActive={animate} className="cursor-pointer" />
        </RadarChart>
      </ChartContainer>
    )
  }

  if (chartType === "bar") {
    return (
      <ChartContainer config={config} className="h-[var(--chart-h)] w-full">
        <BarChart data={top} layout="vertical" margin={{ left: 8 }} onClick={(e) => drill(activeChartPayload<TypeCount>(e))} className="cursor-pointer">
          <CartesianGrid horizontal={false} />
          <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
          <YAxis dataKey="type" type="category" tickLine={false} axisLine={false} fontSize={11} width={110} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="count" fill="var(--color-count)" radius={4} isAnimationActive={animate} />
        </BarChart>
      </ChartContainer>
    )
  }

  return (
    <ChartContainer config={config} className="h-[var(--chart-h)] w-full">
      <ComposedChart data={top} onClick={(e) => drill(activeChartPayload<TypeCount>(e))} className="cursor-pointer">
        <CartesianGrid vertical={false} />
        <XAxis dataKey="type" tickLine={false} axisLine={false} fontSize={10} interval={0} angle={-20} textAnchor="end" height={45} />
        <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} width={32} />
        <ChartTooltip content={<ChartTooltipContent />} />
        {chartType === "line" && (
          <Line
            type="monotone"
            dataKey="count"
            stroke="var(--color-count)"
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
              <linearGradient id="typeCountGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-count)" stopOpacity={0.45} />
                <stop offset="100%" stopColor="var(--color-count)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="count"
              stroke="var(--color-count)"
              strokeWidth={2.75}
              strokeLinecap="round"
              fill="url(#typeCountGradient)"
              activeDot={{ r: 6, strokeWidth: 2, stroke: "var(--background)" }}
              isAnimationActive={animate}
            />
          </>
        )}
      </ComposedChart>
    </ChartContainer>
  )
}
