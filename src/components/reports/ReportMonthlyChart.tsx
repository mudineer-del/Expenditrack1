import { useMemo } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { fmtMoney } from "@/lib/dashboard"
import type { Invoice } from "@/types/invoice"

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

const config = { total: { label: "Expenditure (incl. tax)", color: "var(--primary)" } } satisfies ChartConfig

/** Ported from the monthly-expenditure chart inside bindReportCharts (index.html:4917-4929). */
export function ReportMonthlyChart({ rows, onMonthClick }: { rows: Invoice[]; onMonthClick: (rows: Invoice[], label: string) => void }) {
  const { data, monthRows } = useMemo(() => {
    const byMonth: Record<string, number> = {}
    const monthRows: Record<string, Invoice[]> = {}
    rows.forEach((r) => {
      const d = r.invoiceDate
      if (d && /^\d{4}-\d{2}/.test(d)) {
        const k = d.slice(0, 7)
        byMonth[k] = (byMonth[k] || 0) + (Number(r.amountInclTax) || 0)
        ;(monthRows[k] = monthRows[k] || []).push(r)
      }
    })
    const keys = Object.keys(byMonth).sort()
    return {
      data: keys.map((k) => {
        const [y, m] = k.split("-")
        return { key: k, month: `${MONTHS[Number(m) - 1].slice(0, 3)} ${y.slice(2)}`, total: byMonth[k] }
      }),
      monthRows,
    }
  }, [rows])

  if (!data.length) {
    return <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">No dated invoices</div>
  }

  return (
    <ChartContainer config={config} className="h-48 w-full">
      <BarChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
        <YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => fmtMoney(v).replace(".00", "")} width={60} />
        <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmtMoney(Number(v))} />} />
        <Bar
          dataKey="total"
          fill="var(--color-total)"
          radius={4}
          cursor="pointer"
          onClick={(d) => onMonthClick(monthRows[(d.payload as { key: string }).key] || [], `Month: ${(d.payload as { month: string }).month}`)}
        />
      </BarChart>
    </ChartContainer>
  )
}

