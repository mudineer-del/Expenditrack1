import { Undo2 } from "lucide-react"
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
import { useAuth } from "@/hooks/useAuth"
import { useUndo } from "@/hooks/useUndo"
import { useActivityStore, type ActivityAction } from "@/store/useActivityStore"

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
  const { can } = useAuth()
  const log = useActivityStore((s) => s.log)
  const undoStack = useActivityStore((s) => s.undoStack)
  const selectedLogIds = useActivityStore((s) => s.selectedLogIds)
  const toggleSelect = useActivityStore((s) => s.toggleSelect)
  const setSelection = useActivityStore((s) => s.setSelection)
  const clearSelection = useActivityStore((s) => s.clearSelection)
  const clearLog = useActivityStore((s) => s.clearLog)
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
    clearLog()
    toast.success("Activity log cleared.")
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
          {selectable && (
            <Button
              variant="outline"
              size="sm"
              disabled={!undoStackLength}
              title={lastUndoLabel ? `Undo: ${lastUndoLabel}` : "Nothing to undo"}
              onClick={undoLast}
            >
              <Undo2 /> Undo last
            </Button>
          )}
          {selectable && log.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClearLog}>
              Clear log
            </Button>
          )}
        </div>
      </div>

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
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/50 p-2.5 text-sm">
          <label className="flex items-center gap-2">
            <Checkbox
              checked={allSelected}
              onCheckedChange={(v) => setSelection(v ? new Set(undoableLog.map((e) => e.id)) : new Set())}
            />
            Select all undoable ({undoableLog.length})
          </label>
          {selectedLogIds.size > 0 && (
            <>
              <span>
                <b>{selectedLogIds.size}</b> selected
              </span>
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                Clear
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setConfirmOpen(true)}>
                <Undo2 /> Undo Selected
              </Button>
            </>
          )}
        </div>
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
