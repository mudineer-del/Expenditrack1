import { Bar, BarChart, Cell, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { turnaroundDays } from "@/lib/reports"
import type { Invoice } from "@/types/invoice"

const BUCKETS: [string, number, number][] = [
  ["≤15 days", 0, 15],
  ["16–30 days", 16, 30],
  ["31–60 days", 31, 60],
  [">60 days", 61, Infinity],
]
const COLORS = ["#49BFAC", "#0A86C8", "#c8781c", "#c23b3b"]

const config = { count: { label: "Invoices", color: "#0A86C8" } } satisfies ChartConfig

/** Ported from the TA-distribution bucket chart inside bindReportCharts (index.html:4904-4916). */
export function TaBucketChart({ rows, onBucketClick }: { rows: Invoice[]; onBucketClick: (rows: Invoice[], label: string) => void }) {
  const bucketRows = BUCKETS.map(() => [] as Invoice[])
  rows.forEach((r) => {
    const d = turnaroundDays(r)
    if (d === null || d < 0) return
    const i = d <= 15 ? 0 : d <= 30 ? 1 : d <= 60 ? 2 : 3
    bucketRows[i].push(r)
  })
  const data = BUCKETS.map(([label], i) => ({ label, count: bucketRows[i].length }))

  return (
    <ChartContainer config={config} className="h-48 w-full">
      <BarChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
        <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} width={30} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar
          dataKey="count"
          radius={4}
          cursor="pointer"
          onClick={(_, i) => bucketRows[i].length && onBucketClick(bucketRows[i], `Turnaround: ${BUCKETS[i][0]}`)}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i]} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
