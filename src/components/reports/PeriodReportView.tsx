import { useMemo } from "react"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { fmtMoney } from "@/lib/dashboard"
import { aggregate, chartMeasureLabel, groupRows, reportGroupLabel, reportRows, turnaroundDays, type ReportFilters, type ReportGroup } from "@/lib/reports"
import { ChartSlotContextMenu } from "@/components/dashboard/ChartSlotContextMenu"
import { ChartVisibilityToggle } from "@/components/dashboard/ChartVisibilityToggle"
import { ChartZoomStepper } from "@/components/dashboard/ChartZoomStepper"
import { PeriodPaidChart, PeriodValueChart } from "@/components/reports/PeriodCharts"
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
        <button type="button" className="cursor-pointer rounded-md p-1 text-left transition-colors hover:bg-muted/60" onClick={() => onDrill(rows, "Invoices in scope")}>
          <div className="text-xs text-muted-foreground">Invoices in scope</div>
          <div className="text-lg font-semibold">{tot.count}</div>
        </button>
        <button type="button" className="cursor-pointer rounded-md p-1 text-left transition-colors hover:bg-muted/60" onClick={() => onDrill(rows, "Invoices in scope")}>
          <div className="text-xs text-muted-foreground">Total value</div>
          <div className="text-lg font-semibold">{fmtMoney(tot.incl)}</div>
        </button>
        <button
          type="button"
          className="cursor-pointer rounded-md p-1 text-left transition-colors hover:bg-muted/60"
          onClick={() => onDrill(rows.filter((r) => (Number(r.amountPaid) || 0) > 0), "Paid Invoices")}
        >
          <div className="text-xs text-muted-foreground">Total paid</div>
          <div className="text-lg font-semibold text-status-cleared">{fmtMoney(tot.paid)}</div>
        </button>
        <button
          type="button"
          className="cursor-pointer rounded-md p-1 text-left transition-colors hover:bg-muted/60"
          onClick={() => onDrill(rows.filter((r) => (Number(r.amountInclTax) || 0) - (Number(r.amountPaid) || 0) > 0), "Outstanding Invoices")}
        >
          <div className="text-xs text-muted-foreground">Outstanding</div>
          <div className="text-lg font-semibold text-status-under">{fmtMoney(tot.outstanding)}</div>
        </button>
        <button
          type="button"
          className="cursor-pointer rounded-md p-1 text-left transition-colors hover:bg-muted/60"
          onClick={() => onDrill(rows.filter((r) => turnaroundDays(r) !== null), "Invoices with recorded turnaround")}
        >
          <div className="text-xs text-muted-foreground">Avg turnaround</div>
          <div className="text-lg font-semibold">{tot.taAvg !== null ? `${Math.round(tot.taAvg)}d` : "—"}</div>
          <div className="text-xs text-muted-foreground">{tot.delayed} delayed &gt;30d</div>
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {!valueHidden && (
        <div className="rounded-lg border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              {valueMeasure === "incl" ? `Expenditure by ${label}` : `${chartMeasureLabel(valueMeasure)} by ${label}`}
            </h3>
            <div className="flex items-center gap-1">
              <ChartZoomStepper id="periodValue" />
              <ChartVisibilityToggle id="periodValue" />
              <span className="text-xs text-muted-foreground">Click a point/bar for details</span>
            </div>
          </div>
          <ChartSlotContextMenu id="periodValue" hasDimension={false}>
            <PeriodValueChart groups={groups} isTime={isTime} measure={valueMeasure} onGroupClick={drillGroup} />
          </ChartSlotContextMenu>
        </div>
        )}
        <div className="rounded-lg border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Paid vs Outstanding by {label}</h3>
            <span className="text-xs text-muted-foreground">Click a bar for details</span>
          </div>
          <PeriodPaidChart groups={groups} onGroupClick={drillGroup} />
        </div>
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
                <TableHead>{label}</TableHead>
                <TableHead className="text-right">Invoices</TableHead>
                <TableHead className="text-right">Excl. Tax</TableHead>
                <TableHead className="text-right">Tax</TableHead>
                <TableHead className="text-right">Incl. Tax</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead className="text-center">Avg TA</TableHead>
                <TableHead className="text-right">Delayed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((g) => (
                <TableRow key={g.key} className="cursor-pointer" onClick={() => drillGroup(g)}>
                  <TableCell>{g.key}</TableCell>
                  <TableCell className="text-right">{g.count}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtMoney(g.exclTax)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtMoney(g.tax)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtMoney(g.incl)}</TableCell>
                  <TableCell className="text-right tabular-nums text-status-cleared">{fmtMoney(g.paid)}</TableCell>
                  <TableCell className={`text-right tabular-nums ${g.outstanding > 0 ? "text-status-under" : "text-status-cleared"}`}>
                    {fmtMoney(g.outstanding)}
                  </TableCell>
                  <TableCell className="text-center">{g.taAvg !== null ? `${Math.round(g.taAvg)}d` : "—"}</TableCell>
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

