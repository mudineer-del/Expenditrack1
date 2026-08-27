import { Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { fmtMoney } from "@/lib/dashboard"
import { chartMeasureLabel, formatMeasureValue, type ChartMeasure, type ReportGroup } from "@/lib/reports"
import { useDisplayStore } from "@/store/useDisplayStore"

const valueLabel = (v: unknown) => fmtMoney(Number(v)).replace(".00", "")

const CHART_PALETTE = ["var(--primary)", "var(--dataviz-2)", "var(--dataviz-5)", "var(--dataviz-2)", "var(--dataviz-6)", "var(--dataviz-5)", "var(--dataviz-2)", "var(--dataviz-1)", "#6fa3c4", "var(--dataviz-2)"]

function shortLabel(k: string): string {
  return k.length > 18 ? "…" + k.slice(-16) : k
}

const paidConfig = {
  paid: { label: "Paid", color: "var(--status-cleared)" },
  outstanding: { label: "Outstanding", color: "var(--status-under)" },
} satisfies ChartConfig

/** Ported from the period "Expenditure by {label}" chart (index.html:4986-4996): line for
 *  time-based grouping, bar otherwise. `measure` (Settings ▸ Charts, default "incl") picks
 *  which ReportGroup/Aggregate field is plotted — every group already carries all of them. */
export function PeriodValueChart({
  groups,
  isTime,
  measure,
  onGroupClick,
}: {
  groups: ReportGroup[]
  isTime: boolean
  measure: ChartMeasure
  onGroupClick: (g: ReportGroup) => void
}) {
  const labelsEnabled = useDisplayStore((s) => s.chartLabelsEnabled)
  const labelPosition = useDisplayStore((s) => s.chartLabelPosition)
  const data = groups.slice(0, 40).map((g) => ({ ...g, label: shortLabel(g.key) }))
  const fmt = (v: unknown) => formatMeasureValue(measure, Number(v), (n) => fmtMoney(n).replace(".00", ""))
  const valueConfig = { [measure]: { label: chartMeasureLabel(measure), color: "var(--primary)" } } satisfies ChartConfig
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
          <YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={fmt} width={60} />
          <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatMeasureValue(measure, Number(v), fmtMoney)} />} />
          <Line type="monotone" dataKey={measure} stroke={`var(--color-${measure})`} strokeWidth={2.5} dot={{ r: 3, cursor: "pointer" }}>
            {labelsEnabled && <LabelList dataKey={measure} position="top" formatter={fmt} fontSize={10} fill="var(--muted-foreground)" />}
          </Line>
        </LineChart>
      ) : (
        <BarChart data={data}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} angle={-30} textAnchor="end" height={50} />
          <YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={fmt} width={60} />
          <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatMeasureValue(measure, Number(v), fmtMoney)} />} />
          <Bar dataKey={measure} radius={4} cursor="pointer" onClick={(d) => onGroupClick(d.payload as ReportGroup)}>
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
            ))}
            {labelsEnabled && (
              <LabelList
                dataKey={measure}
                position={labelPosition === "inside" ? "inside" : "top"}
                formatter={fmt}
                fontSize={10}
                fill={labelPosition === "inside" ? "var(--background)" : "var(--muted-foreground)"}
              />
            )}
          </Bar>
        </BarChart>
      )}
    </ChartContainer>
  )
}

/** Ported from the period "Paid vs Outstanding by {label}" chart (index.html:4997+). */
export function PeriodPaidChart({ groups, onGroupClick }: { groups: ReportGroup[]; onGroupClick: (g: ReportGroup) => void }) {
  const labelsEnabled = useDisplayStore((s) => s.chartLabelsEnabled)
  const data = groups.slice(0, 40).map((g) => ({ ...g, label: shortLabel(g.key), stackTotal: g.paid + g.outstanding }))
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
        <Bar dataKey="outstanding" stackId="s" fill="var(--color-outstanding)" radius={[4, 4, 0, 0]} cursor="pointer" onClick={(d) => onGroupClick(d.payload as ReportGroup)}>
          {labelsEnabled && <LabelList dataKey="stackTotal" position="top" formatter={valueLabel} fontSize={10} fill="var(--muted-foreground)" />}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

