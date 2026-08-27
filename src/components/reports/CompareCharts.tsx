import { Bar, BarChart, Cell, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { fmtMoney } from "@/lib/dashboard"
import { chartMeasureLabel, formatMeasureValue, shortContract, type ChartMeasure, type ReportGroup } from "@/lib/reports"
import { useDisplayStore } from "@/store/useDisplayStore"

const valueLabel = (v: unknown) => fmtMoney(Number(v)).replace(".00", "")

const valueConfig = {
  paid: { label: "Paid", color: "var(--status-cleared)" },
  outstanding: { label: "Outstanding", color: "var(--status-under)" },
} satisfies ChartConfig

function taColor(days: number | null): string {
  const d = days || 0
  return d <= 15 ? "var(--status-cleared)" : d <= 30 ? "var(--primary)" : d <= 60 ? "var(--status-under)" : "var(--status-returned)"
}

/** Ported from the "Value by Contract" chart inside bindReportCharts (index.html:4940-4949). */
export function CompareValueChart({ groups, onGroupClick }: { groups: ReportGroup[]; onGroupClick: (g: ReportGroup) => void }) {
  const labelsEnabled = useDisplayStore((s) => s.chartLabelsEnabled)
  const data = groups.map((g) => ({ ...g, label: shortContract(g.key), stackTotal: g.paid + g.outstanding }))
  return (
    <ChartContainer config={valueConfig} className="w-full" style={{ height: Math.max(220, groups.length * 34) }}>
      <BarChart data={data} layout="vertical" margin={{ left: 8 }}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => fmtMoney(v).replace(".00", "")} />
        <YAxis dataKey="label" type="category" tickLine={false} axisLine={false} fontSize={11} width={140} />
        <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmtMoney(Number(v))} />} />
        <Bar dataKey="paid" stackId="s" fill="var(--color-paid)" radius={[0, 0, 0, 0]} cursor="pointer" onClick={(d) => onGroupClick(d.payload as ReportGroup)} />
        <Bar dataKey="outstanding" stackId="s" fill="var(--color-outstanding)" radius={[4, 4, 4, 4]} cursor="pointer" onClick={(d) => onGroupClick(d.payload as ReportGroup)}>
          {labelsEnabled && <LabelList dataKey="stackTotal" position="right" formatter={valueLabel} fontSize={10} fill="var(--muted-foreground)" />}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

/** Ported from the "Avg Turnaround by Contract" chart inside bindReportCharts
 *  (index.html:4951-4959). `measure` (Settings ▸ Charts, default "taAvg") picks which
 *  field is plotted — the turnaround color-coding only applies while it's still "taAvg". */
export function CompareTaChart({ groups, measure, onGroupClick }: { groups: ReportGroup[]; measure: ChartMeasure; onGroupClick: (g: ReportGroup) => void }) {
  const labelsEnabled = useDisplayStore((s) => s.chartLabelsEnabled)
  const data = groups.map((g) => ({ ...g, label: shortContract(g.key), plotted: g[measure] ?? 0 }))
  const fmt = (v: unknown) => formatMeasureValue(measure, Number(v), (n) => fmtMoney(n).replace(".00", ""))
  const config = { plotted: { label: chartMeasureLabel(measure), color: "var(--primary)" } } satisfies ChartConfig
  return (
    <ChartContainer config={config} className="w-full" style={{ height: Math.max(220, groups.length * 34) }}>
      <BarChart data={data} layout="vertical" margin={{ left: 8 }}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} tickFormatter={fmt} />
        <YAxis dataKey="label" type="category" tickLine={false} axisLine={false} fontSize={11} width={140} />
        <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatMeasureValue(measure, Number(v), fmtMoney)} />} />
        <Bar dataKey="plotted" radius={4} cursor="pointer" onClick={(d) => onGroupClick(d.payload as ReportGroup)}>
          {data.map((g, i) => (
            <Cell key={i} fill={measure === "taAvg" ? taColor(g.taAvg) : "var(--primary)"} />
          ))}
          {labelsEnabled && <LabelList dataKey="plotted" position="right" formatter={fmt} fontSize={10} fill="var(--muted-foreground)" />}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}


