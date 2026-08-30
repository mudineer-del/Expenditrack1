import { useMemo } from "react"
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { bar3DShape } from "@/components/dashboard/donut3d"
import { fmtMoney } from "@/lib/dashboard"
import { chartMeasureLabel, formatGroupKey, formatMeasureValue, groupRows, seriesFromGroups, type ChartMeasure } from "@/lib/reports"
import { useDisplayStore } from "@/store/useDisplayStore"
import type { Invoice } from "@/types/invoice"

/** Ported from the monthly-expenditure chart inside bindReportCharts (index.html:4917-4929).
 *  Dimension stays fixed to month (this chart's whole purpose); `measure` (Settings ▸ Charts,
 *  default "incl") picks which aggregate field is plotted per month. */
export function ReportMonthlyChart({
  rows,
  measure,
  onMonthClick,
}: {
  rows: Invoice[]
  measure: ChartMeasure
  onMonthClick: (rows: Invoice[], label: string) => void
}) {
  const labelsEnabled = useDisplayStore((s) => s.chartLabelsEnabled)
  const labelPosition = useDisplayStore((s) => s.chartLabelPosition)
  const data = useMemo(() => {
    const points = seriesFromGroups(groupRows(rows, "month"), "month", measure)
    return points.map((p) => ({ key: p.key, month: formatGroupKey("month", p.key), total: p.value, invoices: p.invoices }))
  }, [rows, measure])
  const fmt = (v: unknown) => formatMeasureValue(measure, Number(v), (n) => fmtMoney(n).replace(".00", ""))
  const config = { total: { label: chartMeasureLabel(measure), color: "var(--primary)" } } satisfies ChartConfig

  if (!data.length) {
    return <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">No dated invoices</div>
  }

  return (
    <ChartContainer config={config} className="h-48 w-full">
      <BarChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
        <YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={fmt} width={60} />
        <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatMeasureValue(measure, Number(v), fmtMoney)} />} />
        <Bar
          dataKey="total"
          fill="var(--color-total)"
          shape={bar3DShape}
          cursor="pointer"
          onClick={(d) => onMonthClick((d.payload as { invoices: Invoice[] }).invoices || [], `Month: ${(d.payload as { month: string }).month}`)}
        >
          {labelsEnabled && (
            <LabelList
              dataKey="total"
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

