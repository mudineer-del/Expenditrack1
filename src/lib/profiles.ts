import type { AppUser, Role } from "@/types/user"

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

export function fromProfileRow(row: ProfileRow): AppUser {
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
  }
}
