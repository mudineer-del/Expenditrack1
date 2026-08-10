import { Bar, BarChart, Cell, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { fmtMoney } from "@/lib/dashboard"
import { shortContract, type ReportGroup } from "@/lib/reports"

const valueConfig = {
  paid: { label: "Paid", color: "#1c8a4b" },
  outstanding: { label: "Outstanding", color: "#c8781c" },
} satisfies ChartConfig
const taConfig = { taAvg: { label: "Avg turnaround (days)", color: "#0A86C8" } } satisfies ChartConfig

function taColor(days: number | null): string {
  const d = days || 0
  return d <= 15 ? "#49BFAC" : d <= 30 ? "#0A86C8" : d <= 60 ? "#c8781c" : "#c23b3b"
}

/** Ported from the "Value by Contract" chart inside bindReportCharts (index.html:4940-4949). */
export function CompareValueChart({ groups, onGroupClick }: { groups: ReportGroup[]; onGroupClick: (g: ReportGroup) => void }) {
  const data = groups.map((g) => ({ ...g, label: shortContract(g.key) }))
  return (
    <ChartContainer config={valueConfig} className="w-full" style={{ height: Math.max(220, groups.length * 34) }}>
      <BarChart data={data} layout="vertical" margin={{ left: 8 }}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => fmtMoney(v).replace(".00", "")} />
        <YAxis dataKey="label" type="category" tickLine={false} axisLine={false} fontSize={11} width={140} />
        <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmtMoney(Number(v))} />} />
        <Bar dataKey="paid" stackId="s" fill="var(--color-paid)" radius={[0, 0, 0, 0]} cursor="pointer" onClick={(d) => onGroupClick(d.payload as ReportGroup)} />
        <Bar dataKey="outstanding" stackId="s" fill="var(--color-outstanding)" radius={[4, 4, 4, 4]} cursor="pointer" onClick={(d) => onGroupClick(d.payload as ReportGroup)} />
      </BarChart>
    </ChartContainer>
  )
}

/** Ported from the "Avg Turnaround by Contract" chart inside bindReportCharts (index.html:4951-4959). */
export function CompareTaChart({ groups, onGroupClick }: { groups: ReportGroup[]; onGroupClick: (g: ReportGroup) => void }) {
  const data = groups.map((g) => ({ ...g, label: shortContract(g.key), taRounded: g.taAvg !== null ? Math.round(g.taAvg) : 0 }))
  return (
    <ChartContainer config={taConfig} className="w-full" style={{ height: Math.max(220, groups.length * 34) }}>
      <BarChart data={data} layout="vertical" margin={{ left: 8 }}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => `${v}d`} />
        <YAxis dataKey="label" type="category" tickLine={false} axisLine={false} fontSize={11} width={140} />
        <ChartTooltip content={<ChartTooltipContent formatter={(v) => `${v} days`} />} />
        <Bar dataKey="taRounded" radius={4} cursor="pointer" onClick={(d) => onGroupClick(d.payload as ReportGroup)}>
          {data.map((g, i) => (
            <Cell key={i} fill={taColor(g.taAvg)} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
