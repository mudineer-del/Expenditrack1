import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { fmtMoney } from "@/lib/dashboard"

const config = {
  total: { label: "Expenditure (incl. tax)", color: "var(--chart-2)" },
} satisfies ChartConfig

export function ServiceChart({ data }: { data: { service: string; total: number }[] }) {
  if (!data.length) {
    return <div className="flex h-[var(--chart-h)] items-center justify-center text-sm text-muted-foreground">No service data</div>
  }
  return (
    <ChartContainer config={config} className="h-[var(--chart-h)] w-full">
      <BarChart data={data.slice(0, 8)} layout="vertical" margin={{ left: 8 }}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => fmtMoney(v).replace(".00", "")} />
        <YAxis dataKey="service" type="category" tickLine={false} axisLine={false} fontSize={11} width={110} />
        <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmtMoney(Number(v))} />} />
        <Bar dataKey="total" fill="var(--color-total)" radius={4} />
      </BarChart>
    </ChartContainer>
  )
}
