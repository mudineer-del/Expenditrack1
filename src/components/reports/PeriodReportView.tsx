import { Clock, Coins, Hourglass, Receipt } from "lucide-react"
import { useMemo } from "react"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { fmtMoney } from "@/lib/dashboard"
import { aggregate, chartMeasureLabel, groupRows, reportGroupLabel, reportRows, turnaroundDays, type ReportFilters, type ReportGroup } from "@/lib/reports"
import { ChartCard } from "@/components/dashboard/ChartCard"
import { ChartDataQuickMenu } from "@/components/dashboard/ChartDataQuickMenu"
import { ChartFormatMenu } from "@/components/dashboard/ChartFormatMenu"
import { ChartSlotContextMenu } from "@/components/dashboard/ChartSlotContextMenu"
import { ChartVisibilityToggle } from "@/components/dashboard/ChartVisibilityToggle"
import { ChartZoomStepper } from "@/components/dashboard/ChartZoomStepper"
import { KpiTile } from "@/components/dashboard/KpiTile"
import { PeriodPaidChart, PeriodValueChart } from "@/components/reports/PeriodCharts"
import { cn } from "@/lib/utils"
import { useDisplayStore } from "@/store/useDisplayStore"
import type { Invoice } from "@/types/invoice"

const TIME_GROUPS = ["month", "quarter", "year"]

/** Ported from renderPeriodReport (index.html:4639-4703). */
export function PeriodReportView({
  invoices,
  filters,
  onDrill,
}: {
  invoices: Invoice[]
  filters: ReportFilters
  onDrill: (rows: Invoice[], title: string) => void
}) {
  const rows = useMemo(() => reportRows(invoices, filters), [invoices, filters])
  const groups = useMemo(() => {
    const g = groupRows(rows, filters.groupBy)
    if (TIME_GROUPS.includes(filters.groupBy)) g.sort((a, b) => a.key.localeCompare(b.key))
    else g.sort((a, b) => b.incl - a.incl)
    return g
  }, [rows, filters.groupBy])
  const tot = useMemo(() => aggregate(rows), [rows])
  const label = reportGroupLabel(filters.groupBy)
  const isTime = TIME_GROUPS.includes(filters.groupBy)
  const valueMeasure = useDisplayStore((s) => s.chartSlots.periodValue.measure)
  const valueHidden = useDisplayStore((s) => s.chartSlots.periodValue.hidden)
  const tableBanded = useDisplayStore((s) => s.tableBanded)
  const tableHeaderShaded = useDisplayStore((s) => s.tableHeaderShaded)
  const tableGridLines = useDisplayStore((s) => s.tableGridLines)

  function drillGroup(g: ReportGroup) {
    onDrill(g.rows, `${label}: ${g.key}`)
  }

  if (!groups.length) {
    return (
      <div className="rounded-lg border bg-card p-10 text-center text-muted-foreground">
        <h4 className="font-medium text-foreground">No data in scope</h4>
        <p className="text-sm">Adjust the filters above.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 rounded-lg border bg-card p-4 md:grid-cols-5">
        <KpiTile
          icon={<Receipt />}
          accent="var(--dataviz-1)"
          label="Invoices in scope"
          value={tot.count}
          onClick={() => onDrill(rows, "Invoices in scope")}
        />
        <KpiTile
          icon={<Coins />}
          accent="var(--dataviz-2)"
          label="Total value"
          value={fmtMoney(tot.incl)}
          onClick={() => onDrill(rows, "Invoices in scope")}
        />
        <KpiTile
          icon={<Coins />}
          accent="var(--status-cleared)"
          label="Total paid"
          value={fmtMoney(tot.paid)}
          valueClassName="text-status-cleared"
          onClick={() => onDrill(rows.filter((r) => (Number(r.amountPaid) || 0) > 0), "Paid Invoices")}
        />
        <KpiTile
          icon={<Hourglass />}
          accent="var(--status-under)"
          label="Outstanding"
          value={fmtMoney(tot.outstanding)}
          valueClassName="text-status-under"
          onClick={() => onDrill(rows.filter((r) => (Number(r.amountInclTax) || 0) - (Number(r.amountPaid) || 0) > 0), "Outstanding Invoices")}
        />
        <KpiTile
          icon={<Clock />}
          accent="var(--dataviz-3)"
          label="Avg turnaround"
          value={tot.taAvg !== null ? `${Math.round(tot.taAvg)}d` : "—"}
          sub={`${tot.delayed} delayed >30d`}
          onClick={() => onDrill(rows.filter((r) => turnaroundDays(r) !== null), "Invoices with recorded turnaround")}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {!valueHidden && (
        <ChartCard
          id="periodValue"
          accent="var(--dataviz-1)"
          title={valueMeasure === "incl" ? `Expenditure by ${label}` : `${chartMeasureLabel(valueMeasure)} by ${label}`}
          action={
            <>
              <ChartZoomStepper id="periodValue" />
              <ChartDataQuickMenu id="periodValue" hasDimension={false} />
              <ChartVisibilityToggle id="periodValue" />
              <ChartFormatMenu id="periodValue" />
              <span className="text-xs text-muted-foreground">Click a point/bar for details</span>
            </>
          }
        >
          <ChartSlotContextMenu id="periodValue" hasDimension={false}>
            <PeriodValueChart groups={groups} isTime={isTime} measure={valueMeasure} onGroupClick={drillGroup} />
          </ChartSlotContextMenu>
        </ChartCard>
        )}
        <ChartCard accent="var(--dataviz-2)" title={`Paid vs Outstanding by ${label}`} action={<span className="text-xs text-muted-foreground">Click a bar for details</span>}>
          <PeriodPaidChart groups={groups} onGroupClick={drillGroup} />
        </ChartCard>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="border-b p-4">
          <h3 className="text-sm font-semibold">
            Breakdown by {label} ({groups.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={cn(tableHeaderShaded && "bg-muted", tableGridLines && "border-r")}>{label}</TableHead>
                <TableHead className={cn("text-right", tableHeaderShaded && "bg-muted", tableGridLines && "border-r")}>Invoices</TableHead>
                <TableHead className={cn("text-right", tableHeaderShaded && "bg-muted", tableGridLines && "border-r")}>Excl. Tax</TableHead>
                <TableHead className={cn("text-right", tableHeaderShaded && "bg-muted", tableGridLines && "border-r")}>Tax</TableHead>
                <TableHead className={cn("text-right", tableHeaderShaded && "bg-muted", tableGridLines && "border-r")}>Incl. Tax</TableHead>
                <TableHead className={cn("text-right", tableHeaderShaded && "bg-muted", tableGridLines && "border-r")}>Paid</TableHead>
                <TableHead className={cn("text-right", tableHeaderShaded && "bg-muted", tableGridLines && "border-r")}>Outstanding</TableHead>
                <TableHead className={cn("text-center", tableHeaderShaded && "bg-muted", tableGridLines && "border-r")}>Avg TA</TableHead>
                <TableHead className={cn("text-right", tableHeaderShaded && "bg-muted")}>Delayed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((g) => (
                <TableRow key={g.key} className={cn("cursor-pointer", tableBanded && "even:bg-muted/30")} onClick={() => drillGroup(g)}>
                  <TableCell className={cn(tableGridLines && "border-r")}>{g.key}</TableCell>
                  <TableCell className={cn("text-right", tableGridLines && "border-r")}>{g.count}</TableCell>
                  <TableCell className={cn("text-right tabular-nums", tableGridLines && "border-r")}>{fmtMoney(g.exclTax)}</TableCell>
                  <TableCell className={cn("text-right tabular-nums", tableGridLines && "border-r")}>{fmtMoney(g.tax)}</TableCell>
                  <TableCell className={cn("text-right tabular-nums", tableGridLines && "border-r")}>{fmtMoney(g.incl)}</TableCell>
                  <TableCell className={cn("text-right tabular-nums text-status-cleared", tableGridLines && "border-r")}>{fmtMoney(g.paid)}</TableCell>
                  <TableCell className={cn(`text-right tabular-nums ${g.outstanding > 0 ? "text-status-under" : "text-status-cleared"}`, tableGridLines && "border-r")}>
                    {fmtMoney(g.outstanding)}
                  </TableCell>
                  <TableCell className={cn("text-center", tableGridLines && "border-r")}>{g.taAvg !== null ? `${Math.round(g.taAvg)}d` : "—"}</TableCell>
                  <TableCell className={`text-right ${g.delayed ? "text-status-returned" : ""}`}>{g.delayed}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell>Total</TableCell>
                <TableCell className="text-right">{tot.count}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtMoney(tot.exclTax)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtMoney(tot.tax)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtMoney(tot.incl)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtMoney(tot.paid)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtMoney(tot.outstanding)}</TableCell>
                <TableCell className="text-center">{tot.taAvg !== null ? `${Math.round(tot.taAvg)}d` : "—"}</TableCell>
                <TableCell className="text-right">{tot.delayed}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </div>
    </div>
  )
}

