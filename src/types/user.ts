export type Role = "Admin" | "Editor" | "Viewer"

/** "pending" = signed up, not yet reviewed — sees a locked screen, no data.
 *  "active" = normal access, scoped by `departments`/`areas`. "disabled" =
 *  an Admin has locked the account back out again. See supabase/access_control_setup.sql. */
export type ProfileStatus = "pending" | "active" | "disabled"

export interface AppUser {
  id: string
  email: string
  name: string
  role: Role
  initials: string
  phone?: string
  dept?: string
  designation?: string
  twofa?: boolean
  avatarUrl?: string
  status: ProfileStatus
  /** Departments this user can read/write invoices & contracts for (RLS-enforced) — always [] for a fresh AppUser until resolveUser fills it in. Admins bypass this regardless of contents. */
  departments: string[]
  /** Sidebar sections/routes this user can open — Dashboard ("/") and Settings are always allowed regardless of this list. Admins bypass this regardless of contents. */
  areas: string[]
  /** False only when profile_departments/profile_areas queries themselves errored
   *  (those tables don't exist — supabase/access_control_setup.sql hasn't been run
   *  yet), as opposed to succeeding with zero rows (migration ran, this user
   *  genuinely has no grants). Client-side gates (AppSidebar, RequireArea,
   *  DepartmentSwitcher) treat `false` as "don't restrict" — the SQL migration is
   *  what makes department/area scoping authoritative, not this frontend code
   *  landing first. Never affects the invoices/contracts RLS itself, which is
   *  authoritative the instant the migration runs regardless of this flag. */
  accessControlInstalled: boolean
}

export type Action = "add" | "edit" | "delete" | "export"
export type Resource = "invoice" | "contract" | "well" | "wellCostEntry"
