import { FileSignature, Layers, Receipt, Undo2 } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { SelectionToolbar } from "@/components/shared/SelectionToolbar"
import { useActivityLogQuery, useClearActivityLog } from "@/hooks/useActivityLog"
import { useAuth } from "@/hooks/useAuth"
import { useUndo } from "@/hooks/useUndo"
import { useActivityStore, type ActivityAction, type ActivityEntry } from "@/store/useActivityStore"
import { useAppStore } from "@/store/useAppStore"

/** The action badge says what happened; this says to what — an entry's own
 *  meta already carries invoiceNo or contractNo, so no string-parsing needed. */
function EntryKindIcon({ entry }: { entry: ActivityEntry }) {
  if (entry.meta?.invoiceNo !== undefined) return <Receipt className="size-3.5 text-muted-foreground" aria-label="Invoice" />
  if (entry.meta?.contractNo !== undefined) return <FileSignature className="size-3.5 text-muted-foreground" aria-label="Contract" />
  return <Layers className="size-3.5 text-muted-foreground" aria-label="Bulk / system change" />
}

const ACTIONS: ActivityAction[] = ["Import", "Add", "Edit", "Delete", "Undo", "Restore"]

const ACTION_COLOR: Record<ActivityAction, string> = {
  Import: "#6d5fd6",
  Add: "#1c8a4b",
  Edit: "#c8781c",
  Delete: "#c23b3b",
  Undo: "#5b7086",
  Restore: "#155a82",
}

function fmtDateTime(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Ported from renderActivity/bindActivityPage/renderUndoConfirm (index.html:5165-5216, 6406-6445). */
export default function ActivityLogPage() {
  const { can, isAdmin } = useAuth()
  const activityLogQuery = useActivityLogQuery()
  const activeDept = useAppStore((s) => s.activeDept)
  // Entries logged before departments existed (or bulk import/delete, which spans more
  // than one record) carry no department in their meta — keep those visible under any
  // filter rather than silently hiding audit history.
  const log = useMemo(
    () =>
      (activityLogQuery.data ?? []).filter(
        (e) => activeDept === "ALL" || !e.meta?.department || e.meta.department === activeDept
      ),
    [activityLogQuery.data, activeDept]
  )
  const undoStack = useActivityStore((s) => s.undoStack)
  const selectedLogIds = useActivityStore((s) => s.selectedLogIds)
  const toggleSelect = useActivityStore((s) => s.toggleSelect)
  const setSelection = useActivityStore((s) => s.setSelection)
  const clearSelection = useActivityStore((s) => s.clearSelection)
  const clearLog = useClearActivityLog()
  const { undoStackLength, lastUndoLabel, undoLast, undoSelected } = useUndo()

  const [confirmOpen, setConfirmOpen] = useState(false)

  const selectable = can("add")

  const undoableIds = useMemo(() => new Set(undoStack.map((u) => u.id)), [undoStack])
  const undoableLog = useMemo(
    () => log.filter((e) => e.meta?.undoId && undoableIds.has(String(e.meta.undoId))),
    [log, undoableIds]
  )
  const allSelected = undoableLog.length > 0 && selectedLogIds.size === undoableLog.length

  const preview = useMemo(() => {
    if (!confirmOpen || !selectedLogIds.size) return null
    const undoIds = new Set<string>()
    log.forEach((e) => {
      if (selectedLogIds.has(e.id) && e.meta?.undoId) undoIds.add(String(e.meta.undoId))
    })
    let earliest = null as (typeof undoStack)[number] | null
    for (const entry of undoStack) {
      if (undoIds.has(entry.id)) {
        earliest = entry
        break
      }
    }
    if (!earliest) return { nothing: true as const }
    const idx = undoStack.findIndex((e) => e.id === earliest!.id)
    const discardedCount = undoStack.length - idx
    return { nothing: false as const, earliest, discardedCount }
  }, [confirmOpen, selectedLogIds, log, undoStack])

  function handleClearLog() {
    clearLog.mutate(undefined, {
      onSuccess: () => toast.success("Activity log cleared for everyone."),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not clear the activity log."),
    })
  }

  async function handleConfirmUndo() {
    await undoSelected(selectedLogIds)
    setConfirmOpen(false)
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Activity &amp; Change Log</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!selectable || !undoStackLength}
            title={!selectable ? "Only Editors and Admins can undo changes" : lastUndoLabel ? `Undo: ${lastUndoLabel}` : "Nothing to undo"}
            onClick={undoLast}
          >
            <Undo2 /> Undo last
          </Button>
          {isAdmin && log.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClearLog} disabled={clearLog.isPending}>
              Clear log
            </Button>
          )}
        </div>
      </div>

      {activityLogQuery.isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : activityLogQuery.isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          Could not load the activity log. Run <code>supabase/activity_log_setup.sql</code> in your Supabase
          project's SQL Editor if you haven't yet, then reload.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-4 rounded-lg border bg-card p-3 text-sm">
            {ACTIONS.map((a) => {
              const c = log.filter((e) => e.action === a).length
              return (
                <div key={a} className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ backgroundColor: ACTION_COLOR[a] }} />
                  <b>{c}</b> {a}
                  {c === 1 ? "" : "s"}
                </div>
              )
            })}
          </div>

          {selectable && undoableLog.length > 0 && (
            <SelectionToolbar
              count={selectedLogIds.size}
              label="changes selected"
              leading={
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(v) => setSelection(v ? new Set(undoableLog.map((e) => e.id)) : new Set())}
                  />
                  Select all undoable ({undoableLog.length})
                </label>
              }
              onClear={clearSelection}
              action={
                selectedLogIds.size > 0 ? (
                  <Button variant="destructive" size="sm" onClick={() => setConfirmOpen(true)}>
                    <Undo2 /> Undo selected
                  </Button>
                ) : undefined
              }
            />
          )}

          <div className="rounded-lg border bg-card">
            {log.length ? (
              <div className="divide-y">
                {log.map((e) => {
                  const isUndoable = selectable && e.meta?.undoId && undoableIds.has(String(e.meta.undoId))
                  return (
                    <div key={e.id} className="flex items-start gap-3 p-3">
                      {selectable && (
                        <div className="pt-0.5">
                          {isUndoable ? (
                            <Checkbox checked={selectedLogIds.has(e.id)} onCheckedChange={() => toggleSelect(e.id)} />
                          ) : (
                            <div className="size-4" />
                          )}
                        </div>
                      )}
                      <span
                        className="mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium text-white"
                        style={{ backgroundColor: ACTION_COLOR[e.action] }}
                      >
                        {e.action}
                      </span>
                      <span className="mt-1 shrink-0" title={e.meta?.invoiceNo !== undefined ? "Invoice" : e.meta?.contractNo !== undefined ? "Contract" : "Bulk / system change"}>
                        <EntryKindIcon entry={e} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm">{e.detail}</div>
                        <div className="text-xs text-muted-foreground">
                          {e.user}
                          {e.role ? ` · ${e.role}` : ""} · {fmtDateTime(e.ts)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="p-10 text-center text-muted-foreground">
                <h4 className="font-medium text-foreground">No activity yet</h4>
                <p className="text-sm">Imports, additions, edits and deletions will appear here.</p>
              </div>
            )}
          </div>
        </>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {preview && !preview.nothing
                ? `Undo ${preview.discardedCount > 1 ? `${preview.discardedCount} changes` : "this change"}?`
                : "Nothing to undo"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {preview && preview.nothing &&
                `None of the selected changes can still be undone — they may already have been reverted, or pushed off the undo history (only the last 20 changes are kept).`}
              {preview && !preview.nothing && preview.discardedCount > 1 &&
                `Undo can only rewind in order, so this will revert ${preview.discardedCount} changes in total — your selection plus ${preview.discardedCount - 1} more recent change${preview.discardedCount - 1 !== 1 ? "s" : ""} made afterward — back to just before: ${preview.earliest.label}.`}
              {preview && !preview.nothing && preview.discardedCount === 1 && `This will revert: ${preview.earliest.label}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {preview && !preview.nothing ? (
            <div className="flex justify-end gap-2">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmUndo}>
                Undo {preview.discardedCount > 1 ? preview.discardedCount : ""}
              </AlertDialogAction>
            </div>
          ) : (
            <div className="flex justify-end">
              <AlertDialogCancel>Close</AlertDialogCancel>
            </div>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
