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
import { fmtMoney, type CategoryTotal } from "@/lib/dashboard"
import { useDisplayStore, type ChartType } from "@/store/useDisplayStore"

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

  if (!data.length) {
    return <div className="flex h-[var(--chart-h)] items-center justify-center text-sm text-muted-foreground">No service data</div>
  }
  const top = data.slice(0, 8)

  function drill(d: CategoryTotal | null) {
    if (d) onDrill(`Invoices — ${d.service}`, d.invoices)
  }

  if (chartType === "pie") {
    return (
      <ChartContainer config={config} className="h-[var(--chart-h)] w-full">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmtMoney(Number(v))} />} />
          <Pie
            data={top}
            dataKey="total"
            nameKey="service"
            innerRadius="45%"
            outerRadius="80%"
            isAnimationActive={animate}
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

  if (chartType === "radar") {
    return (
      <ChartContainer config={config} className="h-[var(--chart-h)] w-full">
        <RadarChart data={top} onClick={(e) => drill(activeChartPayload<CategoryTotal>(e))}>
          <PolarGrid />
          <PolarAngleAxis dataKey="service" fontSize={10} />
          <PolarRadiusAxis tickFormatter={(v) => fmtMoney(v).replace(".00", "")} fontSize={9} />
          <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmtMoney(Number(v))} />} />
          <Radar dataKey="total" stroke="var(--color-total)" fill="var(--color-total)" fillOpacity={0.35} isAnimationActive={animate} className="cursor-pointer" />
        </RadarChart>
      </ChartContainer>
    )
  }

  if (chartType === "bar") {
    return (
      <ChartContainer config={config} className="h-[var(--chart-h)] w-full">
        <BarChart data={top} layout="vertical" margin={{ left: 8 }} onClick={(e) => drill(activeChartPayload<CategoryTotal>(e))} className="cursor-pointer">
          <CartesianGrid horizontal={false} />
          <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => fmtMoney(v).replace(".00", "")} />
          <YAxis dataKey="service" type="category" tickLine={false} axisLine={false} fontSize={11} width={110} />
          <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmtMoney(Number(v))} />} />
          <Bar dataKey="total" fill="var(--color-total)" radius={[0, 8, 8, 0]} isAnimationActive={animate} />
        </BarChart>
      </ChartContainer>
    )
  }

  return (
    <ChartContainer config={config} className="h-[var(--chart-h)] w-full">
      <ComposedChart data={top} onClick={(e) => drill(activeChartPayload<CategoryTotal>(e))} className="cursor-pointer">
        <CartesianGrid vertical={false} />
        <XAxis dataKey="service" tickLine={false} axisLine={false} fontSize={10} interval={0} angle={-20} textAnchor="end" height={45} />
        <YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => fmtMoney(v).replace(".00", "")} width={60} />
        <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmtMoney(Number(v))} />} />
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
              <linearGradient id="serviceGradient" x1="0" y1="0" x2="0" y2="1">
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
              fill="url(#serviceGradient)"
              activeDot={{ r: 6, strokeWidth: 2, stroke: "var(--background)" }}
              isAnimationActive={animate}
            />
          </>
        )}
      </ComposedChart>
    </ChartContainer>
  )
}
