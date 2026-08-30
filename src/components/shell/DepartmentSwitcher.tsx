import { Building2, Check, ChevronsUpDown, Layers, Pencil, Trash2, X } from "lucide-react"
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
import { SidebarIcon } from "@/components/shell/NavIcon"
import { activeNavStyle, ALL_DEPARTMENTS_COLOR, departmentChipColor } from "@/lib/navColors"
import { errorMessage } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/useAuth"
import { useRenameDepartment } from "@/hooks/useDepartments"
import { useReferenceLists } from "@/lib/referenceLists"
import { useAppStore } from "@/store/useAppStore"
import { useSidebarPrefsStore } from "@/store/useSidebarPrefsStore"

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
  const { ref, removeValue, isSaving } = useReferenceLists()
  const renameDepartment = useRenameDepartment()
  const flatIcons = useSidebarPrefsStore((s) => s.iconStyle) === "flat"
  const perItemActiveColor = useSidebarPrefsStore((s) => s.activeColorMode) === "perItem"
  const activeDept = useAppStore((s) => s.activeDept)
  const setActiveDept = useAppStore((s) => s.setActiveDept)
  const [removeTarget, setRemoveTarget] = useState<string | null>(null)
  const [editTarget, setEditTarget] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [departmentListOpen, setDepartmentListOpen] = useState(false)

  const departments = ref.departments

  function selectDepartment(department: string) {
    setActiveDept(department)
    setDepartmentListOpen(false)
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
      <SidebarGroupLabel className="app-sidebar-group-label uppercase tracking-[0.12em]">Department</SidebarGroupLabel>
      <SidebarGroupContent className="group-data-[collapsible=icon]:hidden">
        <div
          className="app-department-picker group/dept-picker"
          onMouseEnter={() => setDepartmentListOpen(true)}
          onMouseLeave={() => setDepartmentListOpen(false)}
        >
          <button
            type="button"
            className="app-department-summary flex w-full cursor-pointer items-center gap-2 rounded-xl px-2 py-2"
            onClick={() => setDepartmentListOpen((open) => !open)}
            aria-expanded={departmentListOpen}
          >
            <SidebarIcon
              icon={activeDept === ALL_DEPARTMENTS ? Layers : Building2}
              color={activeDept === ALL_DEPARTMENTS ? ALL_DEPARTMENTS_COLOR : departmentChipColor(activeDept)}
              compact
              flat={flatIcons}
            />
            <span className="min-w-0 flex-1 truncate text-sm font-bold">
              {activeDept === ALL_DEPARTMENTS ? "All Departments" : activeDept}
            </span>
            <ChevronsUpDown className={cn("size-3.5 opacity-55 transition-transform duration-200", departmentListOpen && "rotate-180")} />
          </button>
        <div className={cn("app-department-options", departmentListOpen && "is-open")}>
        <SidebarMenu className="mt-1.5">
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={activeDept === ALL_DEPARTMENTS}
              onClick={() => selectDepartment(ALL_DEPARTMENTS)}
              size="default"
              tooltip="All Departments"
              className="app-department-item"
              style={perItemActiveColor && activeDept === ALL_DEPARTMENTS ? activeNavStyle(ALL_DEPARTMENTS_COLOR) : undefined}
            >
              {activeDept === ALL_DEPARTMENTS && (
                <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-white/85" />
              )}
              <SidebarIcon icon={Layers} color={ALL_DEPARTMENTS_COLOR} active={activeDept === ALL_DEPARTMENTS} flat={flatIcons} />
              <span>All Departments</span>
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
                  onClick={() => selectDepartment(d)}
                  size="default"
                  className={cn("app-department-item", isAdmin && "pr-14")}
                  tooltip={d}
                  style={perItemActiveColor && activeDept === d ? activeNavStyle(departmentChipColor(d)) : undefined}
                >
                  {activeDept === d && (
                    <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-white/85" />
                  )}
                  <SidebarIcon icon={Building2} color={departmentChipColor(d)} active={activeDept === d} flat={flatIcons} />
                  <span>{d}</span>
                </SidebarMenuButton>
                {isAdmin && (
                  <div className="absolute top-1/2 right-1 flex -translate-y-1/2 items-center gap-0.5 opacity-0 transition-opacity group-hover/dept:opacity-100 group-focus-within/dept:opacity-100">
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
        </SidebarMenu>
        </div>
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
