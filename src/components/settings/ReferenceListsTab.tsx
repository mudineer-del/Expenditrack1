import { Plus, X } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useReferenceLists, type ReferenceLists } from "@/lib/referenceLists"

const LISTS: { key: keyof ReferenceLists; title: string }[] = [
  { key: "vendors", title: "Vendors / Contractors" },
  { key: "services", title: "Services" },
  { key: "types", title: "Types" },
  { key: "regions", title: "Regions" },
  { key: "statuses", title: "Statuses" },
]

function ListCard({
  title,
  items,
  onAdd,
  onRemove,
}: {
  title: string
  items: string[]
  onAdd: (v: string) => void
  onRemove: (v: string) => void
}) {
  const [value, setValue] = useState("")
  function submit() {
    if (!value.trim()) return
    onAdd(value)
    setValue("")
  }
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <div className="flex items-center gap-1.5">
          <Input
            className="h-8 w-40"
            value={value}
            placeholder="New value…"
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), submit())}
          />
          <Button size="sm" variant="outline" onClick={submit}>
            <Plus /> Add
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.length ? (
          items.map((x) => (
            <span key={x} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
              {x}
              <button className="text-muted-foreground hover:text-destructive" title="Remove" onClick={() => onRemove(x)}>
                <X className="size-3" />
              </button>
            </span>
          ))
        ) : (
          <span className="text-xs text-muted-foreground">No items yet.</span>
        )}
      </div>
    </div>
  )
}

/** Ported from the Reference Lists settings tab (index.html:5567-5589), now
 *  Supabase-synced (Phase 7) instead of local-storage-only. */
export function ReferenceListsTab() {
  const { ref, addValue, removeValue } = useReferenceLists()

  return (
    <div className="grid gap-4">
      <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
        Manage the dropdown options used across invoice entry, contracts and filters. Changes apply for every
        signed-in user immediately.
      </div>
      {LISTS.map((l) => (
        <ListCard
          key={l.key}
          title={l.title}
          items={ref[l.key]}
          onAdd={(v) => addValue(l.key, v)}
          onRemove={(v) => removeValue(l.key, v)}
        />
      ))}
    </div>
  )
}
