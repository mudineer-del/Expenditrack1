import { Check, ChevronsUpDown, Plus, Search } from "lucide-react"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { wellStatusTone, WELL_STATUS_TONE_CLASSES } from "@/lib/wellCost"
import { cn } from "@/lib/utils"
import type { Well } from "@/types/well"

/** "Well Cost > {well}" breadcrumb that opens into a searchable list — the app's existing
 *  searchable-picker pattern (see CommandPalette.tsx) rather than a plain <Select>, since a
 *  Select has no built-in filtering and this needs to stay usable at 100+ wells. */
export function WellSelector({
  wells,
  selectedWellId,
  onSelect,
  onAddNew,
}: {
  wells: Well[]
  selectedWellId: string | null
  onSelect: (wellId: string) => void
  onAddNew: () => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const selectedWell = wells.find((w) => w.id === selectedWellId) ?? null
  const active = wells.filter((w) => !w.archived)
  const archived = wells.filter((w) => w.archived)

  const filter = (list: Well[]) => {
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter((w) => [w.name, w.code, w.field].some((v) => (v || "").toLowerCase().includes(q)))
  }
  const filteredActive = useMemo(() => filter(active), [active, query])
  const filteredArchived = useMemo(() => filter(archived), [archived, query])

  function select(wellId: string) {
    onSelect(wellId)
    setOpen(false)
    setQuery("")
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-auto justify-between gap-2 py-2 text-left">
          <span className="flex min-w-0 items-center gap-1.5 text-sm">
            <span className="text-muted-foreground">Well Cost</span>
            <span className="text-muted-foreground">›</span>
            <span className="max-w-48 truncate font-semibold">{selectedWell ? selectedWell.name : "Select a well…"}</span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="border-b p-2">
          <div className="relative">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              className="pl-8"
              placeholder="Search name, code, field…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto p-1">
          {filteredActive.map((w) => (
            <WellOption key={w.id} well={w} selected={w.id === selectedWellId} onClick={() => select(w.id)} />
          ))}
          {filteredArchived.length > 0 && (
            <div className="mt-1 border-t pt-1">
              <div className="px-2 py-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Archived</div>
              {filteredArchived.map((w) => (
                <WellOption key={w.id} well={w} selected={w.id === selectedWellId} onClick={() => select(w.id)} />
              ))}
            </div>
          )}
          {!filteredActive.length && !filteredArchived.length && (
            <div className="p-4 text-center text-sm text-muted-foreground">No wells match "{query}".</div>
          )}
        </div>
        <div className="border-t p-1">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2"
            onClick={() => {
              setOpen(false)
              onAddNew()
            }}
          >
            <Plus className="size-4" /> Add New Well
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function WellOption({ well, selected, onClick }: { well: Well; selected: boolean; onClick: () => void }) {
  const tone = wellStatusTone(well.status)
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted",
        selected && "bg-muted"
      )}
    >
      <Check className={cn("size-3.5 shrink-0", selected ? "opacity-100" : "opacity-0")} />
      <span className="min-w-0 flex-1 truncate">
        {well.name}
        {well.code ? <span className="text-muted-foreground"> · {well.code}</span> : null}
      </span>
      <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium", WELL_STATUS_TONE_CLASSES[tone])}>
        {well.status || "—"}
      </span>
    </button>
  )
}
