import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { HIDEABLE_NAV_ITEMS } from "@/components/shell/AppSidebar"
import { errorMessage } from "@/lib/utils"
import { useReferenceLists } from "@/lib/referenceLists"
import { useApproveProfile, useUpdateProfileAreas, useUpdateProfileDepartments } from "@/hooks/useProfiles"
import type { AppUser, Role } from "@/types/user"

const ROLES: Role[] = ["Admin", "Editor", "Viewer"]

/**
 * Department + area grant checklist (supabase/access_control_setup.sql), shared by
 * the "approve a pending sign-up" and "edit an active user's access" flows in
 * UsersPage — same fields either way, "approve" just also sets role + flips
 * status to 'active'. Departments come from the same reference_lists picklist
 * the sidebar's DepartmentSwitcher manages; areas are HIDEABLE_NAV_ITEMS, the
 * same route-path list AppSidebar's own per-device customization already uses,
 * so this can never offer a grant the sidebar/router don't recognize.
 */
export function AccessGrantPanel({
  profile,
  mode,
  onDone,
  onCancel,
}: {
  profile: AppUser
  mode: "approve" | "edit"
  onDone: () => void
  onCancel: () => void
}) {
  const { ref } = useReferenceLists()
  const approve = useApproveProfile()
  const updateDepartments = useUpdateProfileDepartments()
  const updateAreas = useUpdateProfileAreas()
  const [role, setRole] = useState<Role>(profile.role)
  const [departments, setDepartments] = useState<string[]>(profile.departments)
  const [areas, setAreas] = useState<string[]>(profile.areas)

  const saving = approve.isPending || updateDepartments.isPending || updateAreas.isPending

  function toggleDept(d: string) {
    setDepartments((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]))
  }
  function toggleArea(a: string) {
    setAreas((cur) => (cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a]))
  }

  function handleSave() {
    if (mode === "approve") {
      approve.mutate(
        { id: profile.id, role, departments, areas },
        {
          onSuccess: () => {
            toast.success(`${profile.name} approved.`)
            onDone()
          },
          onError: (e) => toast.error(errorMessage(e, "Could not approve account.")),
        }
      )
      return
    }
    updateDepartments.mutate(
      { id: profile.id, departments },
      {
        onSuccess: () => {
          updateAreas.mutate(
            { id: profile.id, areas },
            {
              onSuccess: () => {
                toast.success(`${profile.name}'s access updated.`)
                onDone()
              },
              onError: (e) => toast.error(errorMessage(e, "Could not update areas.")),
            }
          )
        },
        onError: (e) => toast.error(errorMessage(e, "Could not update departments.")),
      }
    )
  }

  return (
    <div className="grid gap-4 rounded-lg border bg-muted/30 p-4">
      {mode === "approve" && (
        <div className="grid gap-1.5">
          <Label>Role</Label>
          <Select value={role} onValueChange={(v) => setRole(v as Role)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid gap-1.5">
        <Label>Departments</Label>
        <p className="text-xs text-muted-foreground">Which departments' invoices &amp; contracts this account can see.</p>
        {ref.departments.length ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
            {ref.departments.map((d) => (
              <label key={d} className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={departments.includes(d)} onChange={() => toggleDept(d)} className="size-3.5 accent-primary" />
                <span className="truncate">{d}</span>
              </label>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No departments defined yet.</p>
        )}
      </div>

      <div className="grid gap-1.5">
        <Label>Areas</Label>
        <p className="text-xs text-muted-foreground">
          Which sidebar sections this account can open. Dashboard and Settings are always available.
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
          {HIDEABLE_NAV_ITEMS.map((item) => (
            <label key={item.to} className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={areas.includes(item.to)} onChange={() => toggleArea(item.to)} className="size-3.5 accent-primary" />
              <span className="truncate">{item.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t pt-3">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : mode === "approve" ? "Approve" : "Save access"}
        </Button>
      </div>
    </div>
  )
}
