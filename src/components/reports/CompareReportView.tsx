import { Check, Plus, Search, X } from "lucide-react"
import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { fmtMoney } from "@/lib/dashboard"
import { groupRows, reportRows, shortContract, type ReportFilters, type ReportGroup } from "@/lib/reports"
import { CompareTaChart, CompareValueChart } from "@/components/reports/CompareCharts"
import { SelectionToolbar } from "@/components/shared/SelectionToolbar"
import type { Invoice } from "@/types/invoice"

function normContract(s: string | null | undefined): string {
  return (s || "").trim().toLowerCase()
}

/** "+ Add contract" search popover: lets you build a comparison list one contract at a time, adding as many as you like before closing. */
function AddContractPopover({
  allGroups,
  isSelected,
  onAdd,
}: {
  allGroups: ReportGroup[]
  isSelected: (key: string) => boolean
  onAdd: (key: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const options = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? allGroups.filter((g) => shortContract(g.key).toLowerCase().includes(q)) : allGroups
  }, [allGroups, query])

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) setQuery("")
      }}
    >
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus /> Add contract
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 gap-0 p-0">
        <div className="p-2">
          <div className="relative">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              className="pl-8"
              placeholder="Search contracts…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto border-t">
          {options.length ? (
            options.map((g) => {
              const already = isSelected(g.key)
              const vendor = g.rows[0]?.vendor || ""
              return (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => !already && onAdd(g.key)}
                  disabled={already}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-muted disabled:cursor-default disabled:opacity-50"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate" title={g.key}>
                      {shortContract(g.key)}
                    </span>
                    {vendor && <span className="block truncate text-[10px] text-muted-foreground">{vendor}</span>}
                  </span>
                  {already ? (
                    <Check className="size-3.5 shrink-0 text-primary" />
                  ) : (
                    <span className="shrink-0 text-muted-foreground">{fmtMoney(g.incl)}</span>
                  )}
                </button>
              )
            })
          ) : (
            <div className="p-3 text-center text-xs text-muted-foreground">No contracts found</div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
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

  function isAdded(key: string): boolean {
    return !showNone && (selected.length === 0 || selected.some((s) => normContract(s) === normContract(key)))
  }

  /** Adding always starts (and builds) an explicit list, rather than the checkbox grid's "start from all, deselect" model. */
  function addContract(key: string) {
    const base = showNone ? [] : selected
    if (base.some((s) => normContract(s) === normContract(key))) return
    const next = [...base, key]
    onCompareSelectionChange(next.length === n ? [] : next)
  }

  function removeContract(key: string) {
    const base = selected.length ? selected : allGroups.map((g) => g.key)
    const next = base.filter((k) => normContract(k) !== normContract(key))
    onCompareSelectionChange(next.length === n ? [] : next.length ? next : ["__none__"])
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-lg border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Select contracts to compare</h3>
          <span className="text-xs text-muted-foreground">{countText}</span>
        </div>
        <div className="mb-3">
          <SelectionToolbar
            count={groups.length}
            label="contracts included"
            summary={showNone ? "Comparison is empty" : groups.length === n ? "All contracts" : "Custom selection"}
            onClear={() => onCompareSelectionChange(["__none__"])}
            action={
              <Button variant="outline" size="sm" onClick={() => onCompareSelectionChange([])}>
                Select all
              </Button>
            }
          />
        </div>
        {selected.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {selected.map((key) => (
              <Badge key={key} variant="secondary" className="gap-1 pr-1">
                <span className="max-w-[160px] truncate" title={key}>
                  {shortContract(key)}
                </span>
                <button
                  type="button"
                  className="rounded-full p-0.5 hover:bg-foreground/10"
                  title="Remove"
                  onClick={() => removeContract(key)}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        <div className="mb-3 flex flex-wrap gap-2">
          <AddContractPopover allGroups={allGroups} isSelected={isAdded} onAdd={addContract} />
          {presets.map((k) => (
            <Button
              key={k}
              variant={isTop(k) ? "secondary" : "outline"}
              size="sm"
              onClick={() => onCompareSelectionChange(allGroups.slice(0, k).map((g) => g.key))}
            >
              Top {k} by value
            </Button>
          ))}
          <Button
            variant={!showNone && selected.length === 0 ? "secondary" : "outline"}
            size="sm"
            onClick={() => onCompareSelectionChange([])}
          >
            All ({n})
          </Button>
          <Button
            variant={showNone ? "secondary" : "outline"}
            size="sm"
            onClick={() => onCompareSelectionChange(["__none__"])}
          >
            Clear
          </Button>
        </div>
        <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {allGroups.map((g) => {
            const on = isAdded(g.key)
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
            <button
              type="button"
              className="cursor-pointer rounded-md p-1 text-left transition-colors hover:bg-muted/60"
              onClick={() => onDrill(groups.flatMap((g) => g.rows), "Invoices — compared contracts")}
            >
              <div className="text-xs text-muted-foreground">Contracts compared</div>
              <div className="text-lg font-semibold">{groups.length}</div>
            </button>
            <button
              type="button"
              className="cursor-pointer rounded-md p-1 text-left transition-colors hover:bg-muted/60"
              onClick={() => onDrill(groups.flatMap((g) => g.rows), "Invoices — compared contracts")}
            >
              <div className="text-xs text-muted-foreground">Combined value</div>
              <div className="text-lg font-semibold">{fmtMoney(totalIncl)}</div>
            </button>
            <button
              type="button"
              className="cursor-pointer rounded-md p-1 text-left transition-colors hover:bg-muted/60"
              onClick={() => onDrill(groups.flatMap((g) => g.rows.filter((r) => (Number(r.amountPaid) || 0) > 0)), "Paid Invoices — compared contracts")}
            >
              <div className="text-xs text-muted-foreground">Combined paid</div>
              <div className="text-lg font-semibold text-status-cleared">{fmtMoney(tot.paid)}</div>
            </button>
            <button
              type="button"
              className="cursor-pointer rounded-md p-1 text-left transition-colors hover:bg-muted/60"
              onClick={() =>
                onDrill(
                  groups.flatMap((g) => g.rows.filter((r) => (Number(r.amountInclTax) || 0) - (Number(r.amountPaid) || 0) > 0)),
                  "Outstanding Invoices — compared contracts"
                )
              }
            >
              <div className="text-xs text-muted-foreground">Combined outstanding</div>
              <div className="text-lg font-semibold text-status-under">{fmtMoney(tot.outstanding)}</div>
            </button>
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
                      <TableCell className="text-right tabular-nums">{fmtMoney(g.exclTax)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtMoney(g.incl)}</TableCell>
                      <TableCell className="text-right tabular-nums text-status-cleared">{fmtMoney(g.paid)}</TableCell>
                      <TableCell className={`text-right tabular-nums ${g.outstanding > 0 ? "text-status-under" : "text-status-cleared"}`}>
                        {fmtMoney(g.outstanding)}
                      </TableCell>
                      <TableCell className="text-right">—</TableCell>
                      <TableCell className="text-right">—</TableCell>
                      <TableCell className="text-center">{g.taAvg !== null ? `${Math.round(g.taAvg)}d` : "—"}</TableCell>
                      <TableCell className={`text-right ${g.delayed ? "text-status-returned" : ""}`}>{g.delayed}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell>Total ({groups.length})</TableCell>
                    <TableCell className="text-right">{tot.count}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtMoney(tot.exclTax)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtMoney(tot.incl)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtMoney(tot.paid)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtMoney(tot.outstanding)}</TableCell>
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

