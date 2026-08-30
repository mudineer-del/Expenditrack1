import { Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { fmtCurrency } from "@/lib/wellCost"
import { cn } from "@/lib/utils"
import type { WellCostCentre, WellCostTransaction } from "@/types/wellCost"

/** The day-by-day cost/commitment ledger for one cost centre — opened via the "History"
 *  action on its row in Well Cost Structure. Actual Cost and Commitments shown elsewhere
 *  in the app are always the sum of entries logged here (see buildCostCentreTotals in
 *  lib/wellCost.ts) — there's no other way to change those two figures. */
export function WellCostTransactionSheet({
  costCentre,
  entries,
  canAdd,
  canEdit,
  canDelete,
  onOpenChange,
  onAddEntry,
  onEditEntry,
  onDeleteEntry,
}: {
  costCentre: WellCostCentre | null
  entries: WellCostTransaction[]
  canAdd: boolean
  canEdit: boolean
  canDelete: boolean
  onOpenChange: (open: boolean) => void
  onAddEntry: () => void
  onEditEntry: (entry: WellCostTransaction) => void
  onDeleteEntry: (entry: WellCostTransaction) => void
}) {
  const sorted = entries.slice().sort((a, b) => b.entryDate.localeCompare(a.entryDate))
  const totalActual = entries.filter((e) => e.kind === "actual").reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const totalCommitment = entries.filter((e) => e.kind === "commitment").reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const currency = costCentre?.currency || "USD"

  return (
    <Sheet open={!!costCentre} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{costCentre?.costCentre}</SheetTitle>
          <SheetDescription>
            {costCentre?.description || "Daily cost / commitment log"} · Actual {fmtCurrency(totalActual, currency)} · Commitment{" "}
            {fmtCurrency(totalCommitment, currency)}
          </SheetDescription>
        </SheetHeader>
        <div className="flex items-center justify-between px-4 pb-3">
          <span className="text-xs text-muted-foreground">{entries.length} entr{entries.length === 1 ? "y" : "ies"}</span>
          <Button
            size="sm"
            disabled={!canAdd}
            title={canAdd ? "Log a cost entry" : "Only Admins/Editors can log entries"}
            onClick={onAddEntry}
          >
            <Plus /> Add Entry
          </Button>
        </div>
        <div className="overflow-x-auto px-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Logged by</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length ? (
                sorted.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap">{entry.entryDate}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          entry.kind === "actual" ? "status-tone-cleared" : "status-tone-under"
                        )}
                      >
                        {entry.kind === "actual" ? "Actual" : "Commitment"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{fmtCurrency(entry.amount, currency)}</TableCell>
                    <TableCell className="max-w-40 truncate text-muted-foreground">{entry.notes || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{entry.createdByName || "—"}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          className="rounded-full p-2 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                          title={canEdit ? "Edit" : "Only Admins/Editors can edit"}
                          disabled={!canEdit}
                          onClick={() => onEditEntry(entry)}
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded-full p-2 text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-40"
                          title={canDelete ? "Delete" : "Only Admins can delete"}
                          disabled={!canDelete}
                          onClick={() => onDeleteEntry(entry)}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No entries logged yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </SheetContent>
    </Sheet>
  )
}
