import { useMemo } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { fmtMoney } from "@/lib/dashboard"
import { groupRows, reportRows, shortContract, type ReportFilters, type ReportGroup } from "@/lib/reports"
import { CompareTaChart, CompareValueChart } from "@/components/reports/CompareCharts"
import type { Invoice } from "@/types/invoice"

function normContract(s: string | null | undefined): string {
  return (s || "").trim().toLowerCase()
}

/** Ported from renderCompareReport/renderContractSelector/renderCompareBody (index.html:4517-4636). */
export function CompareReportView({
  invoices,
  filters,
  compareSelection,
  onCompareSelectionChange,
  onDrill,
}: {
  invoices: Invoice[]
  filters: ReportFilters
  compareSelection: string[]
  onCompareSelectionChange: (sel: string[]) => void
  onDrill: (rows: Invoice[], title: string) => void
}) {
  const rows = useMemo(() => reportRows(invoices, filters), [invoices, filters])
  const allGroups = useMemo(() => groupRows(rows, "contract").sort((a, b) => b.incl - a.incl), [rows])

  const showNone = compareSelection.includes("__none__")
  const selected = compareSelection.filter((x) => x !== "__none__")
  const groups: ReportGroup[] = showNone
    ? []
    : selected.length
      ? allGroups.filter((g) => selected.some((s) => normContract(s) === normContract(g.key)))
      : allGroups

  const totalIncl = groups.reduce((s, g) => s + g.incl, 0)
  const tot = {
    count: groups.reduce((s, g) => s + g.count, 0),
    exclTax: groups.reduce((s, g) => s + g.exclTax, 0),
    incl: totalIncl,
    paid: groups.reduce((s, g) => s + g.paid, 0),
    outstanding: groups.reduce((s, g) => s + g.outstanding, 0),
    delayed: groups.reduce((s, g) => s + g.delayed, 0),
  }

  const n = allGroups.length
  const presets = [3, 5, 10].filter((x) => x < n)
  const isTop = (k: number) =>
    !showNone && selected.length === k && selected.every((s, i) => allGroups[i] && normContract(allGroups[i].key) === normContract(s))
  const countText = showNone ? "None selected" : selected.length ? `${selected.length} of ${n} selected` : `All ${n} included`

  function drillGroup(g: ReportGroup) {
    onDrill(rows.filter((r) => normContract(r.contractNo) === normContract(g.key)), `Contract: ${shortContract(g.key)}`)
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-lg border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Select contracts to compare</h3>
          <span className="text-xs text-muted-foreground">{countText}</span>
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          {presets.map((k) => (
            <button
              key={k}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${isTop(k) ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"}`}
              onClick={() => onCompareSelectionChange(allGroups.slice(0, k).map((g) => g.key))}
            >
              Top {k} by value
            </button>
          ))}
          <button
            className={`rounded-full border px-3 py-1 text-xs font-medium ${!showNone && selected.length === 0 ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"}`}
            onClick={() => onCompareSelectionChange([])}
          >
            All ({n})
          </button>
          <button
            className={`rounded-full border px-3 py-1 text-xs font-medium ${showNone ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"}`}
            onClick={() => onCompareSelectionChange(["__none__"])}
          >
            Clear
          </button>
        </div>
        <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {allGroups.map((g) => {
            const on = !showNone && (selected.length === 0 || selected.some((s) => normContract(s) === normContract(g.key)))
            return (
              <label key={g.key} className="flex items-center gap-2 rounded-md border p-2 text-xs">
                <Checkbox
                  checked={on}
                  onCheckedChange={(checked) => {
                    const base = selected.length ? selected : allGroups.map((x) => x.key)
                    const next = checked ? Array.from(new Set([...base, g.key])) : base.filter((k) => normContract(k) !== normContract(g.key))
                    onCompareSelectionChange(next.length === allGroups.length ? [] : next.length ? next : ["__none__"])
                  }}
                />
                <span className="flex-1 truncate" title={g.key}>
                  {shortContract(g.key)}
                </span>
                <span className="text-muted-foreground">{fmtMoney(g.incl)}</span>
              </label>
            )
          })}
        </div>
      </div>

      {!groups.length ? (
        <div className="rounded-lg border bg-card p-10 text-center text-muted-foreground">
          <h4 className="font-medium text-foreground">No contracts selected</h4>
          <p className="text-sm">Choose contracts above, or pick a Top-N preset, to build the comparison.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 rounded-lg border bg-card p-4 md:grid-cols-4">
            <div>
              <div className="text-xs text-muted-foreground">Contracts compared</div>
              <div className="text-lg font-semibold">{groups.length}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Combined value</div>
              <div className="text-lg font-semibold">{fmtMoney(totalIncl)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Combined paid</div>
              <div className="text-lg font-semibold text-green-700 dark:text-green-400">{fmtMoney(tot.paid)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Combined outstanding</div>
              <div className="text-lg font-semibold text-amber-600 dark:text-amber-400">{fmtMoney(tot.outstanding)}</div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Value by Contract</h3>
                <span className="text-xs text-muted-foreground">Click a bar for details</span>
              </div>
              <CompareValueChart groups={groups} onGroupClick={drillGroup} />
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Avg Turnaround by Contract</h3>
                <span className="text-xs text-muted-foreground">Click a bar for details</span>
              </div>
              <CompareTaChart groups={groups} onGroupClick={drillGroup} />
            </div>
          </div>

          <div className="rounded-lg border bg-card">
            <div className="border-b p-4">
              <h3 className="text-sm font-semibold">Contract Comparison</h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contract</TableHead>
                    <TableHead className="text-right">Inv.</TableHead>
                    <TableHead className="text-right">Excl. Tax</TableHead>
                    <TableHead className="text-right">Incl. Tax</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="text-right">Contract Val.</TableHead>
                    <TableHead className="text-right">Util.</TableHead>
                    <TableHead className="text-center">Avg TA</TableHead>
                    <TableHead className="text-right">Delayed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((g) => (
                    <TableRow key={g.key} className="cursor-pointer" onClick={() => drillGroup(g)}>
                      <TableCell className="max-w-[160px] truncate" title={g.key}>
                        {shortContract(g.key)}
                      </TableCell>
                      <TableCell className="text-right">{g.count}</TableCell>
                      <TableCell className="text-right font-mono">{fmtMoney(g.exclTax)}</TableCell>
                      <TableCell className="text-right font-mono">{fmtMoney(g.incl)}</TableCell>
                      <TableCell className="text-right font-mono text-green-700 dark:text-green-400">{fmtMoney(g.paid)}</TableCell>
                      <TableCell className={`text-right font-mono ${g.outstanding > 0 ? "text-amber-600 dark:text-amber-400" : "text-green-700 dark:text-green-400"}`}>
                        {fmtMoney(g.outstanding)}
                      </TableCell>
                      <TableCell className="text-right">—</TableCell>
                      <TableCell className="text-right">—</TableCell>
                      <TableCell className="text-center">{g.taAvg !== null ? `${Math.round(g.taAvg)}d` : "—"}</TableCell>
                      <TableCell className={`text-right ${g.delayed ? "text-red-600 dark:text-red-400" : ""}`}>{g.delayed}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell>Total ({groups.length})</TableCell>
                    <TableCell className="text-right">{tot.count}</TableCell>
                    <TableCell className="text-right font-mono">{fmtMoney(tot.exclTax)}</TableCell>
                    <TableCell className="text-right font-mono">{fmtMoney(tot.incl)}</TableCell>
                    <TableCell className="text-right font-mono">{fmtMoney(tot.paid)}</TableCell>
                    <TableCell className="text-right font-mono">{fmtMoney(tot.outstanding)}</TableCell>
                    <TableCell className="text-right">—</TableCell>
                    <TableCell className="text-right">—</TableCell>
                    <TableCell className="text-center">—</TableCell>
                    <TableCell className="text-right">{tot.delayed}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
