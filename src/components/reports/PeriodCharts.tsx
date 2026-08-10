import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { fmtMoney } from "@/lib/dashboard"
import type { ReportGroup } from "@/lib/reports"

const CHART_PALETTE = ["#0A86C8", "#0e8a8c", "#2c5f8a", "#49BFAC", "#5b7086", "#155a82", "#3d8f84", "#0a2540", "#6fa3c4", "#2f9e94"]

function shortLabel(k: string): string {
  return k.length > 18 ? "…" + k.slice(-16) : k
}

const valueConfig = { incl: { label: "Value (incl. tax)", color: "#0A86C8" } } satisfies ChartConfig
const paidConfig = {
  paid: { label: "Paid", color: "#1c8a4b" },
  outstanding: { label: "Outstanding", color: "#c8781c" },
} satisfies ChartConfig

/** Ported from the period "Expenditure by {label}" chart (index.html:4986-4996): line for time-based grouping, bar otherwise. */
export function PeriodValueChart({
  groups,
  isTime,
  onGroupClick,
}: {
  groups: ReportGroup[]
  isTime: boolean
  onGroupClick: (g: ReportGroup) => void
}) {
  const data = groups.slice(0, 40).map((g) => ({ ...g, label: shortLabel(g.key) }))
  if (!data.length) {
    return <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">No data in scope</div>
  }
  return (
    <ChartContainer config={valueConfig} className="h-56 w-full">
      {isTime ? (
        <LineChart
          data={data}
          onClick={(s) => {
            const idx = typeof s.activeIndex === "number" ? s.activeIndex : undefined
            if (idx !== undefined && data[idx]) onGroupClick(data[idx])
          }}
        >
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} angle={-30} textAnchor="end" height={50} />
          <YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => fmtMoney(v).replace(".00", "")} width={60} />
          <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmtMoney(Number(v))} />} />
          <Line type="monotone" dataKey="incl" stroke="var(--color-incl)" strokeWidth={2.5} dot={{ r: 3, cursor: "pointer" }} />
        </LineChart>
      ) : (
        <BarChart data={data}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} angle={-30} textAnchor="end" height={50} />
          <YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => fmtMoney(v).replace(".00", "")} width={60} />
          <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmtMoney(Number(v))} />} />
          <Bar dataKey="incl" radius={4} cursor="pointer" onClick={(d) => onGroupClick(d.payload as ReportGroup)}>
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      )}
    </ChartContainer>
  )
}

/** Ported from the period "Paid vs Outstanding by {label}" chart (index.html:4997+). */
export function PeriodPaidChart({ groups, onGroupClick }: { groups: ReportGroup[]; onGroupClick: (g: ReportGroup) => void }) {
  const data = groups.slice(0, 40).map((g) => ({ ...g, label: shortLabel(g.key) }))
  if (!data.length) {
    return <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">No data in scope</div>
  }
  return (
    <ChartContainer config={paidConfig} className="h-56 w-full">
      <BarChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} angle={-30} textAnchor="end" height={50} />
        <YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => fmtMoney(v).replace(".00", "")} width={60} />
        <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmtMoney(Number(v))} />} />
        <Bar dataKey="paid" stackId="s" fill="var(--color-paid)" cursor="pointer" onClick={(d) => onGroupClick(d.payload as ReportGroup)} />
        <Bar dataKey="outstanding" stackId="s" fill="var(--color-outstanding)" radius={[4, 4, 0, 0]} cursor="pointer" onClick={(d) => onGroupClick(d.payload as ReportGroup)} />
      </BarChart>
    </ChartContainer>
  )
}
