import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { fmtMoney, vendorColor } from "@/lib/dashboard"

const config = {
  total: { label: "Expenditure (incl. tax)" },
} satisfies ChartConfig

export function VendorChart({ data }: { data: { vendor: string; total: number }[] }) {
  if (!data.length) {
    return <div className="flex h-[var(--chart-h)] items-center justify-center text-sm text-muted-foreground">No vendor data</div>
  }
  return (
    <ChartContainer config={config} className="h-[var(--chart-h)] w-full">
      <BarChart data={data.slice(0, 10)}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="vendor" tickLine={false} axisLine={false} fontSize={11} interval={0} angle={-20} textAnchor="end" height={50} />
        <YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => fmtMoney(v).replace(".00", "")} width={60} />
        <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmtMoney(Number(v))} />} />
        <Bar dataKey="total" radius={4}>
          {data.slice(0, 10).map((d, i) => (
            <Cell key={d.vendor} fill={vendorColor(d.vendor, i)} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
