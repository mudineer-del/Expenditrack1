import { Building2, Check, Layers, Pencil, Plus, Trash2, X } from "lucide-react"
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
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { errorMessage } from "@/lib/utils"
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
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={activeDept === ALL_DEPARTMENTS}
              onClick={() => setActiveDept(ALL_DEPARTMENTS)}
              tooltip="All departments"
            >
              <Layers />
              <span>All departments</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {departments.map((d) =>
            editTarget === d ? (
              <SidebarMenuItem key={d}>
                <div className="flex h-8 items-center gap-1 rounded-md border border-sidebar-border bg-sidebar-accent px-2">
                  <Building2 className="size-4 shrink-0 text-sidebar-accent-foreground" />
                  <Input
                    autoFocus
                    className="h-7 min-w-0 flex-1 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.preventDefault(), submitEdit())
                      if (e.key === "Escape") setEditTarget(null)
                    }}
                  />
                  <button
                    type="button"
                    className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                    title="Save"
                    disabled={renameDepartment.isPending}
                    onClick={submitEdit}
                  >
                    <Check className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-destructive"
                    title="Cancel"
                    onClick={() => setEditTarget(null)}
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              </SidebarMenuItem>
            ) : (
              <SidebarMenuItem key={d} className="group/dept">
                <SidebarMenuButton
                  isActive={activeDept === d}
                  onClick={() => setActiveDept(d)}
                  className={isAdmin ? "pr-14" : undefined}
                  tooltip={d}
                >
                  <Building2 />
                  <span>{d}</span>
                </SidebarMenuButton>
                {isAdmin && (
                  <div className="absolute top-1 right-1 flex items-center gap-0.5 opacity-0 transition-opacity group-hover/dept:opacity-100 group-focus-within/dept:opacity-100">
                    <button
                      type="button"
                      title={`Rename ${d}`}
                      disabled={isSaving || renameDepartment.isPending}
                      onClick={() => startEdit(d)}
                      className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:opacity-30"
                    >
                      <Pencil className="size-3" />
                    </button>
                    <button
                      type="button"
                      title={`Remove ${d}`}
                      disabled={departments.length <= 1 || isSaving}
                      onClick={() => setRemoveTarget(d)}
                      className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-destructive disabled:opacity-30"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                )}
              </SidebarMenuItem>
            )
          )}

          {isAdmin &&
            (adding ? (
              <SidebarMenuItem>
                <div className="flex h-8 items-center gap-1 rounded-md border border-dashed border-sidebar-border bg-sidebar-accent/50 px-2">
                  <Plus className="size-4 shrink-0 text-sidebar-accent-foreground" />
                  <Input
                    autoFocus
                    className="h-7 min-w-0 flex-1 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
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
                    className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                    title="Save"
                    disabled={isSaving}
                    onClick={submitAdd}
                  >
                    <Check className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-destructive"
                    title="Cancel"
                    onClick={() => (setAdding(false), setNewName(""))}
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              </SidebarMenuItem>
            ) : (
              <SidebarMenuItem>
                <SidebarMenuButton size="sm" onClick={() => setAdding(true)} tooltip="Add department">
                  <Plus />
                  <span>Add department</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
        </SidebarMenu>
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
