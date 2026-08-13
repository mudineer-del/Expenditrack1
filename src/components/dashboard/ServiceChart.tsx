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
import { fmtMoney } from "@/lib/dashboard"
import { useDisplayStore } from "@/store/useDisplayStore"

const config = {
  total: { label: "Expenditure (incl. tax)", color: "var(--chart-2)" },
} satisfies ChartConfig

const PIE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"]

export function ServiceChart({ data }: { data: { service: string; total: number }[] }) {
  const chartType = useDisplayStore((s) => s.serviceChartType)
  const animate = useDisplayStore((s) => s.animationsEnabled)

  if (!data.length) {
    return <div className="flex h-[var(--chart-h)] items-center justify-center text-sm text-muted-foreground">No service data</div>
  }
  const top = data.slice(0, 8)

  if (chartType === "pie") {
    return (
      <ChartContainer config={config} className="h-[var(--chart-h)] w-full">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmtMoney(Number(v))} />} />
          <Pie data={top} dataKey="total" nameKey="service" innerRadius="45%" outerRadius="80%" isAnimationActive={animate}>
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
        <RadarChart data={top}>
          <PolarGrid />
          <PolarAngleAxis dataKey="service" fontSize={10} />
          <PolarRadiusAxis tickFormatter={(v) => fmtMoney(v).replace(".00", "")} fontSize={9} />
          <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmtMoney(Number(v))} />} />
          <Radar dataKey="total" stroke="var(--color-total)" fill="var(--color-total)" fillOpacity={0.35} isAnimationActive={animate} />
        </RadarChart>
      </ChartContainer>
    )
  }

  if (chartType === "bar") {
    return (
      <ChartContainer config={config} className="h-[var(--chart-h)] w-full">
        <BarChart data={top} layout="vertical" margin={{ left: 8 }}>
          <CartesianGrid horizontal={false} />
          <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => fmtMoney(v).replace(".00", "")} />
          <YAxis dataKey="service" type="category" tickLine={false} axisLine={false} fontSize={11} width={110} />
          <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmtMoney(Number(v))} />} />
          <Bar dataKey="total" fill="var(--color-total)" radius={4} isAnimationActive={animate} />
        </BarChart>
      </ChartContainer>
    )
  }

  return (
    <ChartContainer config={config} className="h-[var(--chart-h)] w-full">
      <ComposedChart data={top}>
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
            dot={false}
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
