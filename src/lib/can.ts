import type { Action, Role } from "@/types/user"

/**
 * Ported from the legacy app's can() (index.html:2276). Admin can do
 * everything; Editor can add/edit/export; Viewer can only export.
 */
export function can(role: Role | undefined | null, action: Action): boolean {
  if (role === "Admin") return true
  if (role === "Editor") return action === "add" || action === "edit" || action === "export"
  return action === "export"
}
