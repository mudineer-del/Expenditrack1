import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { fmtMoney } from "@/lib/dashboard"

const config = {
  total: { label: "Expenditure (incl. tax)", color: "var(--chart-1)" },
} satisfies ChartConfig

export function TrendChart({ data }: { data: { month: string; total: number }[] }) {
  if (!data.length) {
    return <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">No dated invoices</div>
  }
  return (
    <ChartContainer config={config} className="h-56 w-full">
      <BarChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
        <YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => fmtMoney(v).replace(".00", "")} width={60} />
        <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmtMoney(Number(v))} />} />
        <Bar dataKey="total" fill="var(--color-total)" radius={4} />
      </BarChart>
    </ChartContainer>
  )
}
