import type { AppUser, ProfileStatus, Role } from "@/types/user"

const STATUSES: ProfileStatus[] = ["pending", "active", "disabled"]

/** Row shape of the public.profiles table (see supabase/profiles_setup.sql). */
export interface ProfileRow {
  id: string
  email: string
  name: string
  role: string
  initials: string
  phone: string | null
  dept: string | null
  designation: string | null
  twofa: boolean
  avatar_url: string | null
  status: string
}

const ROLES: Role[] = ["Admin", "Editor", "Viewer"]

function initialsFrom(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

/** `departments`/`areas` aren't columns on this row — they live in the
 *  profile_departments/profile_areas join tables (see access_control_setup.sql)
 *  and are populated by the caller after a separate fetch. Defaulting to []
 *  here just keeps this function usable on its own. `accessControlInstalled`
 *  defaults to true (assume real grants) unless the caller explicitly says
 *  otherwise — see AppUser's own doc comment. */
export function fromProfileRow(
  row: ProfileRow,
  departments: string[] = [],
  areas: string[] = [],
  accessControlInstalled = true
): AppUser {
  const name = row.name || row.email
  return {
    id: row.id,
    email: row.email,
    name,
    role: ROLES.includes(row.role as Role) ? (row.role as Role) : "Viewer",
    initials: row.initials || initialsFrom(name),
    phone: row.phone ?? undefined,
    dept: row.dept ?? "Drilling Fluids",
    designation: row.designation ?? undefined,
    twofa: !!row.twofa,
    avatarUrl: row.avatar_url ?? undefined,
    status: STATUSES.includes(row.status as ProfileStatus) ? (row.status as ProfileStatus) : "active",
    departments,
    areas,
    accessControlInstalled,
  }
}
