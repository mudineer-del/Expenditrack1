import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"

/** Shared selection summary/actions used by bulk tables, activity undo, and report pickers. */
export function SelectionToolbar({
  count,
  label,
  summary,
  leading,
  onClear,
  action,
}: {
  count: number
  label: string
  summary?: ReactNode
  leading?: ReactNode
  onClear: () => void
  action?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/50 p-2.5 text-sm">
      {leading}
      <span>
        <b>{count}</b> {label}
      </span>
      {summary && <span className="text-muted-foreground">{summary}</span>}
      <div className="flex-1" />
      <Button variant="ghost" size="sm" onClick={onClear}>
        Clear selection
      </Button>
      {action}
    </div>
  )
}
