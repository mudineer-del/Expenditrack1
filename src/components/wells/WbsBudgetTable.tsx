import { useMemo } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { fmtCurrency } from "@/lib/wellCost"
import { afeSlotKey, afeSlotLabel, lineAmountIn, wellAfesOrdered } from "@/lib/wellCostBudgets"
import type { WellAfe } from "@/types/wellAfe"

/** Budget for each WBS code on the well. Columns: Original, 1st, 2nd and 3rd Supplementary (always
 *  shown, filled in when those AFEs are imported), any further supplementaries or Final that exist,
 *  then the total AFE budget, then the actual expenditure booked against the code. */
export function WbsBudgetTable({
  wellId,
  afes,
  currency,
  actualByCode,
}: {
  wellId: string
  afes: WellAfe[]
  currency: string
  /** Actual expenditure per WBS code, summed over the cost centres that roll up to it. */
  actualByCode: Map<string, number>
}) {
  const ordered = useMemo(() => wellAfesOrdered(afes, wellId), [afes, wellId])

  // Fixed slots first (Original to 3rd Supplementary), then any other slot a well actually has.
  const slots = useMemo(() => {
    const present = new Set(ordered.map((a) => afeSlotKey(a.afeType)))
    const fixed = ["0", "1", "2", "3"]
    const extra = Array.from(present)
      .filter((k) => !fixed.includes(k))
      .sort((a, b) => {
        const rank = (k: string) => (k === "final" ? 1000 : k === "other" ? 500 : Number(k))
        return rank(a) - rank(b)
      })
    return [...fixed, ...extra]
  }, [ordered])

  // One row per WBS code on any AFE, with its amount in each slot.
  const rows = useMemo(() => {
    const byCode = new Map<string, { code: string; description: string; perSlot: Map<string, number>; total: number }>()
    for (const afe of ordered) {
      const slot = afeSlotKey(afe.afeType)
      for (const line of afe.lines) {
        const code = line.code.trim()
        if (!code) continue
        const row = byCode.get(code) ?? { code, description: "", perSlot: new Map<string, number>(), total: 0 }
        const amount = lineAmountIn(afe, line, currency)
        row.perSlot.set(slot, (row.perSlot.get(slot) ?? 0) + amount)
        row.total += amount
        if (line.description?.trim()) row.description = line.description.trim()
        byCode.set(code, row)
      }
    }
    return Array.from(byCode.values())
  }, [ordered, currency])

  if (ordered.length === 0 || rows.length === 0) return null

  // No actual spend yet means a blank cell, not a dollar zero.
  const actualCell = (value: number) => (value ? fmtCurrency(value, currency) : "")

  const slotTotal = (key: string) => rows.reduce((s, r) => s + (r.perSlot.get(key) ?? 0), 0)
  const grandTotal = rows.reduce((s, r) => s + r.total, 0)
  const actualTotal = rows.reduce((s, r) => s + (actualByCode.get(r.code) ?? 0), 0)

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm md:rounded-lg md:shadow-none">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold">Budget by WBS code</span>
        <span className="text-xs text-muted-foreground">The total AFE budget is the well budget</span>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>WBS code</TableHead>
              <TableHead>Description</TableHead>
              {slots.map((k) => (
                <TableHead key={k} className="text-center">
                  {afeSlotLabel(k)}
                </TableHead>
              ))}
              <TableHead className="text-right">Total AFE</TableHead>
              <TableHead className="actual-head text-right">Actual expenditure</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.code}>
                <TableCell className="font-mono text-sm">{r.code}</TableCell>
                <TableCell className="max-w-72 whitespace-normal text-muted-foreground">{r.description || "—"}</TableCell>
                {slots.map((k) => {
                  const value = r.perSlot.get(k)
                  return (
                    <TableCell key={k} className="text-center tabular-nums">
                      {value === undefined ? "—" : fmtCurrency(value, currency)}
                    </TableCell>
                  )
                })}
                <TableCell className="text-right font-semibold tabular-nums">{fmtCurrency(r.total, currency)}</TableCell>
                <TableCell className="actual-cell text-right tabular-nums">{actualCell(actualByCode.get(r.code) ?? 0)}</TableCell>
              </TableRow>
            ))}
            <TableRow className="font-semibold">
              <TableCell colSpan={2} className="text-right">
                Total
              </TableCell>
              {slots.map((k) => (
                <TableCell key={k} className="text-center tabular-nums">
                  {fmtCurrency(slotTotal(k), currency)}
                </TableCell>
              ))}
              <TableCell className="text-right tabular-nums">{fmtCurrency(grandTotal, currency)}</TableCell>
              <TableCell className="actual-cell text-right tabular-nums">{actualCell(actualTotal)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
