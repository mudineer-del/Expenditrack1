import { Pin, PinOff, RotateCcw, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useContractsQuery } from "@/hooks/useContracts"
import { vendorColor } from "@/lib/dashboard"
import { cn } from "@/lib/utils"
import { useLabelsStore, type AppLabels } from "@/store/useLabelsStore"
import { useProminentContractsStore } from "@/store/useProminentContractsStore"

const FIELDS: { key: keyof AppLabels; label: string; hint: string }[] = [
  { key: "sidebarTitle", label: "Sidebar title", hint: "Shown at the top of the sidebar (e.g. \"OGDCL\")." },
  { key: "sidebarSubtitle", label: "Sidebar subtitle", hint: "Shown under the sidebar title." },
  { key: "loginTitle", label: "Login screen title", hint: "Shown above the sign-in form." },
]

/**
 * Editable UI text — brings back the legacy app's "Titles & Labels" tab
 * (deliberately skipped in the initial port as low-value; see Phase 7 notes)
 * now that it's been asked for directly. Local-only per browser, same as the
 * rest of the Format preferences — not a shared, org-wide setting.
 */
export function LabelsTab() {
  const labels = useLabelsStore()

  return (
    <div className="grid gap-4">
      <div className="rounded-lg border bg-card p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Text Labels</h3>
            <p className="text-xs text-muted-foreground">Customize UI text shown throughout the app, on this device.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={labels.resetLabels}>
            <RotateCcw /> Reset to defaults
          </Button>
        </div>
        <div className="grid gap-4">
          {FIELDS.map((f) => (
            <div key={f.key} className="grid gap-1.5">
              <Label htmlFor={f.key}>{f.label}</Label>
              <Input id={f.key} value={labels[f.key]} onChange={(e) => labels.setLabel(f.key, e.target.value)} />
              <p className="text-xs text-muted-foreground">{f.hint}</p>
            </div>
          ))}
        </div>
      </div>

      <ProminentContractsSection />
    </div>
  )
}

/** Picks which contracts get pinned to the sidebar's "Active Contracts" widget, on this device. */
function ProminentContractsSection() {
  const contractsQuery = useContractsQuery()
  const contracts = contractsQuery.data ?? []
  const { ids, toggle } = useProminentContractsStore()

  const sorted = [...contracts].sort((a, b) => {
    const ap = ids.includes(a.id) ? 0 : 1
    const bp = ids.includes(b.id) ? 0 : 1
    if (ap !== bp) return ap - bp
    return (a.contractNo || "").localeCompare(b.contractNo || "")
  })

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-4">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <Star className="size-4" /> Prominent Contracts
        </h3>
        <p className="text-xs text-muted-foreground">
          Pin contracts to feature them at the top of the sidebar's Active Contracts widget, on this device.
        </p>
      </div>
      {contracts.length ? (
        <div className="grid gap-1.5">
          {sorted.map((c) => {
            const pinned = ids.includes(c.id)
            const primaryVendor = (c.vendor || "").split("/")[0].trim()
            const color = vendorColor(primaryVendor)
            return (
              <div
                key={c.id}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-md border px-3 py-2",
                  pinned ? "border-primary/40 bg-primary/5" : "bg-background"
                )}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{c.contractNo || "—"}</div>
                    <div className="truncate text-xs text-muted-foreground">{c.vendor || "—"}</div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant={pinned ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => toggle(c.id)}
                >
                  {pinned ? (
                    <>
                      <PinOff /> Unpin
                    </>
                  ) : (
                    <>
                      <Pin /> Feature
                    </>
                  )}
                </Button>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No contracts on file yet.</p>
      )}
    </div>
  )
}
