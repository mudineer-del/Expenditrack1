import { Check, Copy, Search } from "lucide-react"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { wellStatusTone, WELL_STATUS_TONE_CLASSES } from "@/lib/wellCost"
import type { Well } from "@/types/well"

interface CandidateWell {
  well: Well
  costCentreCount: number
}

/** Lets an Admin clone another well's Cost/Fund Centre setup (codes, budgets, vendors,
 *  notes) onto the currently selected well — for starting a new well's section from a
 *  similar one instead of re-typing every centre by hand. Opened from the "Copy from
 *  Well" button on each service-category section (Drilling Fluids, Cementation, ...) on
 *  the Structure page — `scopeLabel` names which section is being copied into, and
 *  `candidates` should already be scoped to that section's counts by the caller. */
export function CopyWellCostDialog({
  open,
  onOpenChange,
  targetWell,
  scopeLabel,
  candidates,
  submitting,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetWell: Well | null
  /** e.g. "Drilling Fluids" — shown in the dialog copy so it's clear this only copies that
   *  one section, not the well's whole structure. */
  scopeLabel: string
  candidates: CandidateWell[]
  submitting?: boolean
  onConfirm: (sourceWellId: string) => void
}) {
  const [query, setQuery] = useState("")
  const [sourceWellId, setSourceWellId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q ? candidates.filter((c) => [c.well.name, c.well.code].some((v) => (v || "").toLowerCase().includes(q))) : candidates
    return list.sort((a, b) => a.well.name.localeCompare(b.well.name))
  }, [candidates, query])

  const selected = candidates.find((c) => c.well.id === sourceWellId) ?? null

  function handleOpenChange(v: boolean) {
    if (!v) {
      setQuery("")
      setSourceWellId(null)
    }
    onOpenChange(v)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Copy Cost / Fund Centres</DialogTitle>
          <DialogDescription>
            Pick a well to copy its <span className="font-medium text-foreground">{scopeLabel}</span> Cost / Fund
            Centres — codes, budgets, vendors, and notes — into{" "}
            <span className="font-medium text-foreground">{targetWell?.name || "this well"}</span>'s own {scopeLabel}{" "}
            section. Existing entries here are left alone; this only adds new ones.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            className="pl-8"
            placeholder="Search wells…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="max-h-64 overflow-y-auto rounded-md border">
          {filtered.length ? (
            filtered.map(({ well, costCentreCount }) => {
              const tone = wellStatusTone(well.status)
              return (
                <button
                  key={well.id}
                  type="button"
                  onClick={() => setSourceWellId(well.id)}
                  className={cn(
                    "flex w-full items-center gap-2 border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted",
                    sourceWellId === well.id && "bg-muted"
                  )}
                >
                  <Check className={cn("size-3.5 shrink-0", sourceWellId === well.id ? "opacity-100" : "opacity-0")} />
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium">{well.name}</span>
                    {well.code && <span className="text-muted-foreground"> · {well.code}</span>}
                  </span>
                  <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium", WELL_STATUS_TONE_CLASSES[tone])}>
                    {well.status || "—"}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {costCentreCount} centre{costCentreCount === 1 ? "" : "s"}
                  </span>
                </button>
              )
            })
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {candidates.length ? `No wells match "${query}".` : `No other wells have ${scopeLabel} centres to copy yet.`}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            disabled={!selected || submitting}
            onClick={() => sourceWellId && onConfirm(sourceWellId)}
          >
            <Copy /> {submitting ? "Copying…" : selected ? `Copy ${selected.costCentreCount} Centre${selected.costCentreCount === 1 ? "" : "s"}` : "Copy"}
          </Button>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
