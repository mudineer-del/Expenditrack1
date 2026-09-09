import { RotateCcw, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ACTION_COLOR, fmtDateTime, metaLabel } from "@/lib/activityLog"
import { errorMessage } from "@/lib/utils"
import { useDeleteActivityLogEntry } from "@/hooks/useActivityLog"
import type { ActivityEntry } from "@/store/useActivityStore"

/** Every audit trail row's detail view — the full record of one logged change, plus (for
 *  entries still on the undo stack) an "Undo this change" action, and for Admins a
 *  "Delete entry" action that removes just this row from the shared audit trail. Deleting
 *  the log row is independent of undo: it only hides the audit record, it doesn't touch
 *  whatever data change it describes. */
export function ActivityLogEntryDialog({
  entry,
  onOpenChange,
  canUndo,
  isUndoable,
  canDelete,
  onUndo,
}: {
  entry: ActivityEntry | null
  onOpenChange: (open: boolean) => void
  /** Whether this signed-in user is allowed to undo at all (Editors/Admins). */
  canUndo: boolean
  /** Whether THIS entry specifically is still on the in-memory undo stack. */
  isUndoable: boolean
  canDelete: boolean
  /** Starts the shared undo-confirmation flow (see ActivityLogPage) for just this entry. */
  onUndo: (entry: ActivityEntry) => void
}) {
  const deleteEntry = useDeleteActivityLogEntry()
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  if (!entry) return null

  function handleDeleteConfirm() {
    if (!entry) return
    deleteEntry.mutate(entry.id, {
      onSuccess: () => {
        toast.success("Log entry deleted.")
        setDeleteConfirm(false)
        onOpenChange(false)
      },
      onError: (e) => toast.error(errorMessage(e, "Could not delete log entry.")),
    })
  }

  const metaEntries = Object.entries(entry.meta ?? {}).filter(([k]) => k !== "undoId")

  return (
    <>
      <Dialog open={!!entry} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium text-white"
                style={{ backgroundColor: ACTION_COLOR[entry.action] }}
              >
                {entry.action}
              </span>
              Activity Detail
            </DialogTitle>
            <DialogDescription className="sr-only">Full record of one logged change</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 text-sm">
            <p className="text-foreground">{entry.detail}</p>

            <div className="grid gap-1.5 rounded-lg border bg-muted/40 p-3 text-xs">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">By</span>
                <span className="truncate text-right font-medium">
                  {entry.user}
                  {entry.role ? ` · ${entry.role}` : ""}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">When</span>
                <span className="truncate text-right font-medium">{fmtDateTime(entry.ts, { seconds: true })}</span>
              </div>
              {metaEntries.map(([key, value]) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">{metaLabel(key)}</span>
                  <span className="truncate text-right font-medium" title={String(value)}>
                    {String(value)}
                  </span>
                </div>
              ))}
            </div>

            {isUndoable ? (
              <p className="text-xs text-muted-foreground">This change can still be undone.</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                No longer undoable — either already reverted, or pushed off the undo history (only the last 20 changes
                are kept).
              </p>
            )}
          </div>

          <DialogFooter className="sm:justify-between">
            <div className="flex gap-2">
              {canDelete && (
                <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(true)}>
                  <Trash2 /> Delete Entry
                </Button>
              )}
              {canUndo && isUndoable && (
                <Button variant="outline" size="sm" onClick={() => onUndo(entry)}>
                  <RotateCcw /> Undo This Change
                </Button>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this log entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes it from the shared audit trail permanently. It does not affect the underlying data change
              itself — use "Undo This Change" for that, while it's still available.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={deleteEntry.isPending}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
