import type { AppUser } from "@/types/user"
import { downloadCsv, reportRowsToCsv } from "@/lib/reports"

/** Column headers for the Users page export, in the order they appear in the CSV. */
export const USER_EXPORT_HEADERS = [
  "Name",
  "Email",
  "Phone",
  "Department",
  "Designation",
  "Role",
  "Status",
  "Granted Departments",
  "Granted Areas",
]

/** Builds the users CSV (every profile, including pending and disabled accounts).
 *  Multi-value grants are joined with "; " so each user stays on one row. */
export function buildUsersCsv(users: AppUser[]): string {
  const rows = users.map((u) => [
    u.name,
    u.email,
    u.phone ?? "",
    u.dept ?? "",
    u.designation ?? "",
    u.role,
    u.status,
    u.departments.join("; "),
    u.areas.join("; "),
  ])
  // Leading BOM so Excel opens non-ASCII names correctly.
  return "﻿" + reportRowsToCsv(USER_EXPORT_HEADERS, rows)
}

/** Downloads the users CSV as OGDCL_users_<yyyy-mm-dd>.csv (same naming as invoice exports). */
export function exportUsersCsv(users: AppUser[]) {
  const stamp = new Date().toISOString().slice(0, 10)
  downloadCsv(`OGDCL_users_${stamp}.csv`, buildUsersCsv(users))
}
