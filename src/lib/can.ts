import type { Action, Resource, Role } from "@/types/user"

/**
 * Ported from the legacy app's can() (index.html:2276), extended with a
 * resource so contracts can be locked down independently of invoices.
 * Admin can do everything. Editor can add/edit/export invoices, but
 * contracts (which carry commercial terms) and wells (well records plus
 * their cost-centre/fund-centre budgets) are add/edit-restricted to
 * Admins — Editors can still view and export them. Viewer can only export.
 * "wellCostEntry" (a cost centre's daily actual/commitment log entries) is
 * deliberately NOT in that restricted list — Editors log/edit those day-to-day
 * postings same as invoices, even though they can't touch the well/cost-centre
 * structure itself. Deleting an entry still falls to the Admin-only default below.
 */
export function can(role: Role | undefined | null, action: Action, resource: Resource = "invoice"): boolean {
  if (role === "Admin") return true
  if ((resource === "contract" || resource === "well") && (action === "add" || action === "edit")) return false
  if (role === "Editor") return action === "add" || action === "edit" || action === "export"
  return action === "export"
}
