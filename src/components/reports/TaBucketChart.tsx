import { Bar, BarChart, Cell, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { bar3DShape } from "@/components/dashboard/donut3d"
import { fmtMoney } from "@/lib/dashboard"
import { aggregate, chartMeasureLabel, formatMeasureValue, turnaroundDays, type ChartMeasure } from "@/lib/reports"
import { useDisplayStore } from "@/store/useDisplayStore"
import type { Invoice } from "@/types/invoice"

const BUCKETS: [string, number, number][] = [
  ["≤15 days", 0, 15],
  ["16–30 days", 16, 30],
  ["31–60 days", 31, 60],
  [">60 days", 61, Infinity],
]
const COLORS = ["var(--dataviz-2)", "var(--primary)", "var(--status-under)", "var(--status-returned)"]

/** Ported from the TA-distribution bucket chart inside bindReportCharts (index.html:4904-4916).
 *  Buckets are derived from turnaround days and can't be reassigned to another dimension, but
 *  `measure` (Settings ▸ Charts, default "count") picks which aggregate field is plotted per bucket. */
export function TaBucketChart({
  rows,
  measure,
  onBucketClick,
}: {
  rows: Invoice[]
  measure: ChartMeasure
  onBucketClick: (rows: Invoice[], label: string) => void
}) {
  const labelsEnabled = useDisplayStore((s) => s.chartLabelsEnabled)
  const labelPosition = useDisplayStore((s) => s.chartLabelPosition)
  const bucketRows = BUCKETS.map(() => [] as Invoice[])
  rows.forEach((r) => {
    const d = turnaroundDays(r)
    if (d === null || d < 0) return
    const i = d <= 15 ? 0 : d <= 30 ? 1 : d <= 60 ? 2 : 3
    bucketRows[i].push(r)
  })
  const data = BUCKETS.map(([label], i) => ({ label, plotted: aggregate(bucketRows[i])[measure] ?? 0 }))
  const fmt = (v: unknown) => formatMeasureValue(measure, Number(v), (n) => fmtMoney(n).replace(".00", ""))
  const config = { plotted: { label: chartMeasureLabel(measure), color: "var(--primary)" } } satisfies ChartConfig

  return (
    <ChartContainer config={config} className="h-48 w-full">
      <BarChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
        <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={measure !== "count"} width={30} tickFormatter={fmt} />
        <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatMeasureValue(measure, Number(v), fmtMoney)} />} />
        <Bar
          dataKey="plotted"
          shape={bar3DShape}
          cursor="pointer"
          onClick={(_, i) => bucketRows[i].length && onBucketClick(bucketRows[i], `Turnaround: ${BUCKETS[i][0]}`)}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i]} />
          ))}
          {labelsEnabled && (
            <LabelList
              dataKey="plotted"
              position={labelPosition === "inside" ? "inside" : "top"}
              formatter={fmt}
              fontSize={10}
              fill={labelPosition === "inside" ? "var(--background)" : "var(--muted-foreground)"}
            />
          )}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

