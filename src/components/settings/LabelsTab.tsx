import { ArrowLeftRight, Building2, Check, LockKeyhole, PanelLeft, Pencil, Pin, PinOff, RotateCcw, ShieldAlert, Star, Trash2, X } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { HIDEABLE_NAV_ITEMS } from "@/components/shell/AppSidebar"
import { useContractsQuery } from "@/hooks/useContracts"
import { useInvoicesQuery } from "@/hooks/useInvoices"
import { useRenameDepartment } from "@/hooks/useDepartments"
import { useAuth } from "@/hooks/useAuth"
import { vendorColor } from "@/lib/dashboard"
import { useReferenceLists } from "@/lib/referenceLists"
import { cn } from "@/lib/utils"
import { useLabelsStore, type AppLabels } from "@/store/useLabelsStore"
import { useProminentContractsStore } from "@/store/useProminentContractsStore"
import { useSidebarPrefsStore, type SidebarActiveColorMode, type SidebarDensity, type SidebarIconStyle } from "@/store/useSidebarPrefsStore"
import { useTickerStore, type TickerStyle } from "@/store/useTickerStore"

const TICKER_STYLES: { key: TickerStyle; label: string; hint: string }[] = [
  { key: "scroll", label: "Scroll", hint: "All active contracts scroll past continuously, like a stock ticker." },
  { key: "cycle", label: "Cycle", hint: "One contract at a time, auto-advancing every few seconds." },
]

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

      <SidebarCustomizationSection />
      <DepartmentManagementSection />
      <SpendingTickerSection />
      <ProminentContractsSection />
    </div>
  )
}

/** One row of mutually-exclusive option cards — same pattern SpendingTickerSection
 *  already uses, generalized so Sidebar Customization can reuse it three times. */
function PrefOptionRow<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: T
  onChange: (next: T) => void
  options: { value: T; label: string; hint: string }[]
}) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-medium">{label}</div>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-lg border p-3 text-left transition-colors",
              value === o.value ? "border-primary bg-primary/5" : "hover:bg-muted"
            )}
          >
            <div className="text-sm font-medium">{o.label}</div>
            <p className="mt-0.5 text-xs text-muted-foreground">{o.hint}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

/** Look/behavior controls for the main left sidebar (AppSidebar + DepartmentSwitcher) —
 *  icon style, active-row color mode, row density, and per-item visibility. Local to
 *  this device, same pattern as the other sections here. Built from AppSidebar's own
 *  NAV_GROUPS so the visibility checklist can never drift out of sync with the actual
 *  nav — Dashboard and Settings are excluded since AppSidebar always keeps them shown
 *  (the former as a landing spot, the latter as the only way back to this panel). */
function SidebarCustomizationSection() {
  const iconStyle = useSidebarPrefsStore((s) => s.iconStyle)
  const setIconStyle = useSidebarPrefsStore((s) => s.setIconStyle)
  const activeColorMode = useSidebarPrefsStore((s) => s.activeColorMode)
  const setActiveColorMode = useSidebarPrefsStore((s) => s.setActiveColorMode)
  const density = useSidebarPrefsStore((s) => s.density)
  const setDensity = useSidebarPrefsStore((s) => s.setDensity)
  const hiddenItems = useSidebarPrefsStore((s) => s.hiddenItems)
  const toggleItem = useSidebarPrefsStore((s) => s.toggleItem)
  const resetSidebarPrefs = useSidebarPrefsStore((s) => s.resetSidebarPrefs)

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <PanelLeft className="size-4" /> Sidebar Customization
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Adjust the main sidebar's look and which items it shows, on this device.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={resetSidebarPrefs}>
          <RotateCcw /> Reset to defaults
        </Button>
      </div>

      <div className="grid gap-4">
        <PrefOptionRow<SidebarIconStyle>
          label="Icon style"
          value={iconStyle}
          onChange={setIconStyle}
          options={[
            { value: "chip", label: "Chip", hint: "Colorful gradient badge behind each icon." },
            { value: "flat", label: "Flat", hint: "Plain icon tinted in its item's color, no badge." },
          ]}
        />
        <PrefOptionRow<SidebarActiveColorMode>
          label="Active item color"
          value={activeColorMode}
          onChange={setActiveColorMode}
          options={[
            { value: "theme", label: "Theme color", hint: "Every active row uses the app theme's accent color." },
            { value: "perItem", label: "Per-item color", hint: "Active row matches that item's own accent instead." },
          ]}
        />
        <PrefOptionRow<SidebarDensity>
          label="Row density"
          value={density}
          onChange={setDensity}
          options={[
            { value: "comfortable", label: "Comfortable", hint: "Larger rows — easier to scan and tap." },
            { value: "compact", label: "Compact", hint: "Smaller rows — more items fit without scrolling." },
          ]}
        />
      </div>

      <div className="mt-5 border-t pt-4">
        <h4 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Visible Items</h4>
        <div className="grid gap-4 sm:grid-cols-2">
          {Object.entries(
            HIDEABLE_NAV_ITEMS.reduce<Record<string, typeof HIDEABLE_NAV_ITEMS>>((groups, item) => {
              ;(groups[item.group] ??= []).push(item)
              return groups
            }, {})
          ).map(([groupLabel, items]) => (
            <div key={groupLabel}>
              <div className="mb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{groupLabel}</div>
              <div className="grid gap-0.5">
                {items.map((item) => {
                  const hidden = hiddenItems.includes(item.to)
                  return (
                    <label
                      key={item.to}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                    >
                      <input
                        type="checkbox"
                        checked={!hidden}
                        onChange={() => toggleItem(item.to)}
                        className="size-3.5 accent-primary"
                      />
                      <item.icon className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className={cn("truncate", hidden && "text-muted-foreground line-through")}>{item.label}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Safe department correction lives beside the app labels that surface those names.
 *  Rename migrates linked records; delete is intentionally blocked while any invoice or
 *  contract still references the department, preventing orphaned historical data. */
function DepartmentManagementSection() {
  const { isAdmin } = useAuth()
  const { ref, removeValue, isSaving } = useReferenceLists()
  const invoices = useInvoicesQuery().data ?? []
  const contracts = useContractsQuery().data ?? []
  const renameDepartment = useRenameDepartment()
  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const usage = (department: string) => ({
    invoices: invoices.filter((row) => row.department === department).length,
    contracts: contracts.filter((row) => row.department === department).length,
  })

  function beginRename(department: string) {
    setEditing(department)
    setEditValue(department)
  }

  function saveRename() {
    if (!editing || !isAdmin) return
    const next = editValue.trim()
    if (!next || next === editing) return setEditing(null)
    if (ref.departments.some((department) => department !== editing && department.toLowerCase() === next.toLowerCase())) {
      toast.error(`"${next}" already exists.`)
      return
    }
    renameDepartment.mutate(
      { from: editing, to: next },
      {
        onSuccess: () => {
          toast.success(`Department corrected to ${next}. Linked records were updated.`)
          setEditing(null)
        },
        onError: (error) => toast.error(error instanceof Error ? error.message : "Could not rename department."),
      },
    )
  }

  const targetUsage = deleteTarget ? usage(deleteTarget) : { invoices: 0, contracts: 0 }
  const targetHasData = targetUsage.invoices + targetUsage.contracts > 0

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold"><Building2 className="size-4" /> Department Management</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Correct department names safely. Renaming also updates linked invoices and contracts.</p>
        </div>
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide", isAdmin ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground")}>
          {isAdmin ? <ShieldAlert className="size-3" /> : <LockKeyhole className="size-3" />}
          {isAdmin ? "Admin controls" : "Admin required"}
        </span>
      </div>

      <div className="grid gap-2">
        {ref.departments.map((department) => {
          const counts = usage(department)
          const linked = counts.invoices + counts.contracts
          return (
            <div key={department} className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600"><Building2 className="size-4" /></div>
              {editing === department ? (
                <Input
                  autoFocus
                  value={editValue}
                  onChange={(event) => setEditValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") saveRename()
                    if (event.key === "Escape") setEditing(null)
                  }}
                  className="h-8 min-w-0 flex-1"
                />
              ) : (
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{department}</div>
                  <div className="text-xs text-muted-foreground">{counts.invoices} invoices · {counts.contracts} contracts</div>
                </div>
              )}

              {editing === department ? (
                <>
                  <Button size="icon" variant="ghost" className="size-8 text-emerald-600" onClick={saveRename} disabled={renameDepartment.isPending}><Check /></Button>
                  <Button size="icon" variant="ghost" className="size-8" onClick={() => setEditing(null)}><X /></Button>
                </>
              ) : (
                <>
                  <Button size="sm" variant="outline" onClick={() => beginRename(department)} disabled={!isAdmin || renameDepartment.isPending}><Pencil /> Correct</Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 text-destructive"
                    title={!isAdmin ? "Administrator access is required" : linked ? "Linked data must be reassigned or renamed first" : "Delete department"}
                    onClick={() => setDeleteTarget(department)}
                    disabled={!isAdmin || isSaving}
                  ><Trash2 /></Button>
                </>
              )}
            </div>
          )
        })}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{targetHasData ? "Department cannot be deleted" : "Delete this department?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (targetHasData
                ? `"${deleteTarget}" is used by ${targetUsage.invoices} invoices and ${targetUsage.contracts} contracts. Correct/rename the department or reassign those records before deletion.`
                : `"${deleteTarget}" is not used by any invoice or contract. An administrator may remove it from the shared department list.`)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{targetHasData ? "Close" : "Cancel"}</AlertDialogCancel>
            {!targetHasData && (
              <AlertDialogAction
                onClick={() => {
                  if (deleteTarget && isAdmin) {
                    removeValue("departments", deleteTarget)
                    toast.success(`${deleteTarget} deleted.`)
                  }
                  setDeleteTarget(null)
                }}
              >Delete Department</AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/** Picks how the Dashboard's spending-story ticker plays through active contracts, on this device. */
function SpendingTickerSection() {
  const style = useTickerStore((s) => s.style)
  const setStyle = useTickerStore((s) => s.setStyle)

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-4 flex items-center gap-1.5 text-sm font-semibold">
        <ArrowLeftRight className="size-4" /> Spending Ticker
      </h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {TICKER_STYLES.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setStyle(s.key)}
            className={cn(
              "rounded-lg border p-3 text-left transition-colors",
              style === s.key ? "border-primary bg-primary/5" : "hover:bg-muted"
            )}
          >
            <div className="text-sm font-medium">{s.label}</div>
            <p className="mt-0.5 text-xs text-muted-foreground">{s.hint}</p>
          </button>
        ))}
      </div>
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
