import { Eye, Pencil, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { WellMilestoneDrawer } from "@/components/wells/WellMilestoneDrawer"
import { cn } from "@/lib/utils"
import type { WellMilestone } from "@/types/wellMilestone"

interface DrawerState {
  open: boolean
  entry: WellMilestone | null
  readOnly: boolean
}
const BLANK_DRAWER: DrawerState = { open: false, entry: null, readOnly: false }

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / 86400000)
}

/** Small "actual vs. planned" delta, colored green when actual is on-time/ahead or
 *  shallower-as-planned, amber when it slipped — matches the same status-tone-* classes
 *  cost utilization uses elsewhere, so "behind" reads the same way across the module. */
function DeltaBadge({ delta, unit }: { delta: number; unit: string }) {
  if (delta === 0) return <span className="text-xs text-muted-foreground">On plan</span>
  const late = delta > 0
  return (
    <span className={cn("text-xs font-medium", late ? "status-tone-under rounded-full px-1.5 py-0.5" : "status-tone-cleared rounded-full px-1.5 py-0.5")}>
      {late ? "+" : ""}
      {delta}
      {unit}
    </span>
  )
}

/** Per-well drilling program — planned vs. actual date/depth for spud, casing points,
 *  section TDs, or anything else worth tracking, opened via the "Well Data" button on the
 *  Well Cost Summary card. Small-N reference data (typically under a dozen rows per well),
 *  so a dialog with an inline table is enough — no need for the daily-log page's own
 *  search/filter/pagination treatment. */
export function WellDataDialog({
  open,
  onOpenChange,
  wellId,
  wellName,
  milestones,
  canEdit,
  canDelete,
  onSave,
  onDelete,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  wellId: string
  wellName: string
  milestones: WellMilestone[]
  canEdit: boolean
  canDelete: boolean
  onSave: (m: WellMilestone) => void
  onDelete: (m: WellMilestone) => void
}) {
  const [drawer, setDrawer] = useState<DrawerState>(BLANK_DRAWER)
  const [deleteTarget, setDeleteTarget] = useState<WellMilestone | null>(null)

  const sorted = milestones.slice().sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label))
  const nextSortOrder = sorted.length ? Math.max(...sorted.map((m) => m.sortOrder)) + 1 : 0

  function openAdd() {
    setDrawer({ open: true, entry: null, readOnly: false })
  }
  function openView(m: WellMilestone) {
    setDrawer({ open: true, entry: m, readOnly: true })
  }
  function openEdit(m: WellMilestone) {
    setDrawer({ open: true, entry: m, readOnly: !canEdit })
  }
  function handleSave(record: WellMilestone) {
    onSave(record)
    setDrawer(BLANK_DRAWER)
  }
  function handleDeleteConfirm() {
    if (!deleteTarget) return
    onDelete(deleteTarget)
    setDeleteTarget(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-full overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Well Data — {wellName}</DialogTitle>
          <DialogDescription>
            Planned vs. actual dates and depths for spud, casing points, section TDs, or anything else worth tracking
            alongside cost.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end">
          <Button
            size="sm"
            disabled={!canEdit}
            title={canEdit ? "Add a well data row" : "Only Admins/Editors can add rows"}
            onClick={openAdd}
          >
            <Plus /> Add Row
          </Button>
        </div>

        {sorted.length ? (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Milestone</TableHead>
                  <TableHead>Planned Date</TableHead>
                  <TableHead>Actual Date</TableHead>
                  <TableHead className="text-right">Planned Depth</TableHead>
                  <TableHead className="text-right">Actual Depth</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((m) => {
                  const dateDelta = m.plannedDate && m.actualDate ? daysBetween(m.plannedDate, m.actualDate) : null
                  const depthDelta = m.plannedDepth !== "" && m.actualDepth !== "" ? Number(m.actualDepth) - Number(m.plannedDepth) : null
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="max-w-40 truncate font-medium">{m.label}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{m.plannedDate || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{m.actualDate || "—"}</span>
                          {dateDelta !== null && <DeltaBadge delta={dateDelta} unit="d" />}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {m.plannedDepth === "" ? "—" : `${m.plannedDepth} m`}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <div className="flex items-center justify-end gap-1.5">
                          <span>{m.actualDepth === "" ? "—" : `${m.actualDepth} m`}</span>
                          {depthDelta !== null && <DeltaBadge delta={depthDelta} unit="m" />}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <button type="button" className="rounded-full p-2 hover:bg-muted" title="View" onClick={() => openView(m)}>
                            <Eye className="size-4" />
                          </button>
                          <button
                            type="button"
                            className="rounded-full p-2 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                            title={canEdit ? "Edit" : "Only Admins/Editors can edit"}
                            disabled={!canEdit}
                            onClick={() => openEdit(m)}
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            type="button"
                            className="rounded-full p-2 text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-40"
                            title={canDelete ? "Delete" : "Only Admins can delete"}
                            disabled={!canDelete}
                            onClick={() => setDeleteTarget(m)}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-lg border p-8 text-center text-muted-foreground">
            <h4 className="font-medium text-foreground">No well data yet</h4>
            <p className="text-sm">Add spud date, casing points, or section TDs to track alongside cost.</p>
          </div>
        )}
      </DialogContent>

      <WellMilestoneDrawer
        open={drawer.open}
        entry={drawer.entry}
        wellId={wellId}
        nextSortOrder={nextSortOrder}
        readOnly={drawer.readOnly}
        onOpenChange={(v) => !v && setDrawer(BLANK_DRAWER)}
        onSubmit={handleSave}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this row?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && `"${deleteTarget.label}" will be permanently deleted from this well's data.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
