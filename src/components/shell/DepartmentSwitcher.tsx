import { Check, Layers, Pencil, Plus, Trash2, X } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel } from "@/components/ui/sidebar"
import { cn, errorMessage } from "@/lib/utils"
import { useAuth } from "@/hooks/useAuth"
import { useRenameDepartment } from "@/hooks/useDepartments"
import { useReferenceLists } from "@/lib/referenceLists"
import { useAppStore } from "@/store/useAppStore"

export const ALL_DEPARTMENTS = "ALL"

/**
 * Sidebar-level department switcher — the one piece of state (useAppStore's activeDept)
 * that also drives the Dashboard's top tabs, so picking a department here or up there
 * stays in sync everywhere. Every page (Dashboard, Invoices, Vendors & Contracts,
 * Reports, Activity Log) scopes its data to whichever department is active. Rendered as
 * a wrapped row of solid pill buttons (matching the Dashboard's own tab strip) rather
 * than a plain nav list, so the current department reads as a prominent, tappable choice.
 *
 * Departments themselves are just another entry in the existing reference_lists
 * mechanism (src/lib/referenceLists.ts) — same Supabase-synced, Admin-write-gated
 * picklist already used for vendors/services/types/etc. Add/delete are surfaced with
 * toasts on failure (e.g. an RLS policy gap — see supabase/departments_setup.sql)
 * instead of silently no-oping. Rename goes through useRenameDepartment instead, since
 * it also needs to update every invoice/contract already tagged with the old name.
 */
export function DepartmentSwitcher() {
  const { isAdmin } = useAuth()
  const { ref, addValue, removeValue, isSaving } = useReferenceLists()
  const renameDepartment = useRenameDepartment()
  const activeDept = useAppStore((s) => s.activeDept)
  const setActiveDept = useAppStore((s) => s.setActiveDept)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState("")
  const [removeTarget, setRemoveTarget] = useState<string | null>(null)
  const [editTarget, setEditTarget] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")

  const departments = ref.departments

  function submitAdd() {
    const name = newName.trim()
    if (!name) return
    if (departments.some((d) => d.toLowerCase() === name.toLowerCase())) {
      toast.error(`"${name}" is already a department.`)
      return
    }
    addValue("departments", name, {
      onSuccess: () => toast.success(`${name} added.`),
      onError: (e) => toast.error(errorMessage(e, "Could not add department — check Supabase permissions.")),
    })
    setNewName("")
    setAdding(false)
  }

  function confirmRemove() {
    if (!removeTarget) return
    const name = removeTarget
    removeValue("departments", name, {
      onSuccess: () => {
        if (activeDept === name) setActiveDept(ALL_DEPARTMENTS)
      },
      onError: (e) => toast.error(errorMessage(e, "Could not remove department.")),
    })
    setRemoveTarget(null)
  }

  function startEdit(d: string) {
    setEditTarget(d)
    setEditValue(d)
  }

  function submitEdit() {
    if (!editTarget) return
    const name = editValue.trim()
    if (!name || name === editTarget) {
      setEditTarget(null)
      return
    }
    if (departments.some((d) => d !== editTarget && d.toLowerCase() === name.toLowerCase())) {
      toast.error(`"${name}" is already a department.`)
      return
    }
    const from = editTarget
    renameDepartment.mutate(
      { from, to: name },
      {
        onSuccess: () => {
          toast.success(`Renamed to ${name}.`)
          if (activeDept === from) setActiveDept(name)
        },
        onError: (e) => toast.error(errorMessage(e, "Could not rename department.")),
      }
    )
    setEditTarget(null)
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="uppercase tracking-wide">Department</SidebarGroupLabel>
      <SidebarGroupContent className="group-data-[collapsible=icon]:hidden">
        <div className="flex flex-wrap gap-1.5 px-1">
          <button
            type="button"
            onClick={() => setActiveDept(ALL_DEPARTMENTS)}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-all",
              activeDept === ALL_DEPARTMENTS
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Layers className="size-3" />
            All
          </button>

          {departments.map((d) =>
            editTarget === d ? (
              <div key={d} className="flex h-7 items-center gap-1 rounded-full bg-muted pr-1 pl-2.5 ring-1 ring-border">
                <Input
                  autoFocus
                  className="h-full w-24 border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.preventDefault(), submitEdit())
                    if (e.key === "Escape") setEditTarget(null)
                  }}
                />
                <button
                  type="button"
                  className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                  title="Save"
                  disabled={renameDepartment.isPending}
                  onClick={submitEdit}
                >
                  <Check className="size-3.5" />
                </button>
                <button
                  type="button"
                  className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-background hover:text-destructive"
                  title="Cancel"
                  onClick={() => setEditTarget(null)}
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ) : (
              <div
                key={d}
                className={cn(
                  "inline-flex h-7 items-center overflow-hidden rounded-full text-xs font-medium transition-all",
                  activeDept === d ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <button type="button" onClick={() => setActiveDept(d)} className="h-full pl-3 pr-1.5">
                  {d}
                </button>
                {isAdmin && (
                  <span className="flex items-center gap-0.5 pr-1.5">
                    <button
                      type="button"
                      title={`Rename ${d}`}
                      disabled={isSaving || renameDepartment.isPending}
                      onClick={() => startEdit(d)}
                      className={cn(
                        "flex size-5 items-center justify-center rounded-full opacity-50 transition-all hover:opacity-100",
                        activeDept === d ? "hover:bg-primary-foreground/20" : "hover:bg-background hover:text-foreground"
                      )}
                    >
                      <Pencil className="size-3" />
                    </button>
                    <button
                      type="button"
                      title={`Remove ${d}`}
                      disabled={departments.length <= 1 || isSaving}
                      onClick={() => setRemoveTarget(d)}
                      className={cn(
                        "flex size-5 items-center justify-center rounded-full opacity-50 transition-all hover:opacity-100 disabled:opacity-20",
                        activeDept === d ? "hover:bg-primary-foreground/20" : "hover:bg-background hover:text-destructive"
                      )}
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </span>
                )}
              </div>
            )
          )}

          {isAdmin &&
            (adding ? (
              <div className="flex h-7 items-center gap-1 rounded-full bg-muted pr-1 pl-2.5 ring-1 ring-border">
                <Input
                  autoFocus
                  className="h-full w-24 border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
                  placeholder="New department…"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.preventDefault(), submitAdd())
                    if (e.key === "Escape") (setAdding(false), setNewName(""))
                  }}
                />
                <button
                  type="button"
                  className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                  title="Add"
                  disabled={isSaving}
                  onClick={submitAdd}
                >
                  <Check className="size-3.5" />
                </button>
                <button
                  type="button"
                  className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-background hover:text-destructive"
                  title="Cancel"
                  onClick={() => (setAdding(false), setNewName(""))}
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-xs font-medium text-muted-foreground/70 ring-1 ring-dashed ring-border transition-colors hover:text-foreground hover:ring-foreground/30"
              >
                <Plus className="size-3" />
                Add
              </button>
            ))}
        </div>
      </SidebarGroupContent>

      <AlertDialog open={!!removeTarget} onOpenChange={(v) => !v && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this department?</AlertDialogTitle>
            <AlertDialogDescription>
              {removeTarget &&
                `"${removeTarget}" will no longer be offered in the department switcher. Existing invoices and contracts that already use it keep it as-is — they'll still show up under "All Departments".`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarGroup>
  )
}
