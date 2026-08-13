import {
  Area,
  Bar,
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
import { fmtMoney, type TrendPoint } from "@/lib/dashboard"
import { useDisplayStore } from "@/store/useDisplayStore"

const config = {
  total: { label: "Expenditure (incl. tax)", color: "var(--chart-1)" },
} satisfies ChartConfig

const PIE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"]

export function TrendChart({ data, onDrill }: { data: TrendPoint[]; onDrill: (title: string, invoices: TrendPoint["invoices"]) => void }) {
  const chartType = useDisplayStore((s) => s.trendChartType)
  const animate = useDisplayStore((s) => s.animationsEnabled)

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
            outerRadius="80%"
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
          <Radar dataKey="total" stroke="var(--color-total)" fill="var(--color-total)" fillOpacity={0.35} isAnimationActive={animate} className="cursor-pointer" />
        </RadarChart>
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
        {chartType === "bar" && <Bar dataKey="total" fill="var(--color-total)" radius={4} isAnimationActive={animate} />}
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
      </ComposedChart>
    </ChartContainer>
  )
}
