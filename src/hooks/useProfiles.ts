import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getSupabaseClient } from "@/lib/supabase"
import { fromProfileRow, type ProfileRow } from "@/lib/profiles"
import type { AppUser, ProfileStatus, Role } from "@/types/user"

export const PROFILES_QUERY_KEY = ["profiles"] as const

/** Every profile plus its department/area grants (supabase/access_control_setup.sql).
 *  RLS on profile_departments/profile_areas only lets an Admin's session see every
 *  row here, same as profiles itself — a non-admin querying gets back just their own,
 *  matching what useAuth() already resolves. If those two tables don't exist yet
 *  (access_control_setup.sql not run), the grant queries error and fall back to [],
 *  same tolerant-degradation convention as src/lib/referenceLists.ts. */
async function fetchAllProfiles(): Promise<AppUser[]> {
  const supabase = getSupabaseClient()
  const [profilesRes, deptRes, areaRes] = await Promise.all([
    supabase.from("profiles").select("*").order("name", { ascending: true }),
    supabase.from("profile_departments").select("profile_id, department"),
    supabase.from("profile_areas").select("profile_id, area"),
  ])
  if (profilesRes.error) throw profilesRes.error

  const deptsByProfile = new Map<string, string[]>()
  for (const row of deptRes.data ?? []) {
    const list = deptsByProfile.get(row.profile_id) ?? []
    list.push(row.department)
    deptsByProfile.set(row.profile_id, list)
  }
  const areasByProfile = new Map<string, string[]>()
  for (const row of areaRes.data ?? []) {
    const list = areasByProfile.get(row.profile_id) ?? []
    list.push(row.area)
    areasByProfile.set(row.profile_id, list)
  }
  const accessControlInstalled = !deptRes.error && !areaRes.error

  return ((profilesRes.data ?? []) as ProfileRow[]).map((row) =>
    fromProfileRow(row, deptsByProfile.get(row.id) ?? [], areasByProfile.get(row.id) ?? [], accessControlInstalled)
  )
}

/**
 * Admin-only account directory. RLS (see supabase/profiles_setup.sql) only lets an
 * Admin's session see every row here — a non-admin querying this gets back just
 * their own profile, same as useAuth() already provides.
 */
export function useProfilesQuery() {
  return useQuery({ queryKey: PROFILES_QUERY_KEY, queryFn: fetchAllProfiles })
}

/** Changing someone else's role. A DB trigger rejects this unless the caller is an Admin. */
export function useUpdateProfileRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: Role }) => {
      const supabase = getSupabaseClient()
      const { error } = await supabase.from("profiles").update({ role }).eq("id", id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PROFILES_QUERY_KEY }),
  })
}

/** Setting someone else's photo (the file itself already uploaded via uploadAvatarFile).
 *  RLS (see supabase/avatars_setup.sql + profiles_setup.sql) rejects the storage write and
 *  this update unless the caller is an Admin. */
export function useUpdateProfileAvatar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, avatarUrl }: { id: string; avatarUrl: string | null }) => {
      const supabase = getSupabaseClient()
      const { error } = await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PROFILES_QUERY_KEY }),
  })
}

/** Disable / re-enable an account. The same protect_profile_role trigger that
 *  guards `role` also guards `status` — rejects this unless the caller is an Admin. */
export function useUpdateProfileStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ProfileStatus }) => {
      const supabase = getSupabaseClient()
      const { error } = await supabase.from("profiles").update({ status }).eq("id", id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PROFILES_QUERY_KEY }),
  })
}

/** Replaces a profile's granted departments/areas wholesale — delete then re-insert
 *  the new set. Simpler and plenty fast at this scale than diffing against what's
 *  already there; RLS on both tables already restricts writes to Admins. */
async function replaceGrants(
  table: "profile_departments" | "profile_areas",
  column: "department" | "area",
  profileId: string,
  values: string[]
) {
  const supabase = getSupabaseClient()
  const del = await supabase.from(table).delete().eq("profile_id", profileId)
  if (del.error) throw del.error
  if (values.length === 0) return
  const rows = values.map((v) => ({ profile_id: profileId, [column]: v }))
  const ins = await supabase.from(table).insert(rows)
  if (ins.error) throw ins.error
}

/** Edits an already-active user's granted departments (Users page "Edit access"). */
export function useUpdateProfileDepartments() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, departments }: { id: string; departments: string[] }) =>
      replaceGrants("profile_departments", "department", id, departments),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PROFILES_QUERY_KEY }),
  })
}

/** Edits an already-active user's granted areas (Users page "Edit access"). */
export function useUpdateProfileAreas() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, areas }: { id: string; areas: string[] }) => replaceGrants("profile_areas", "area", id, areas),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PROFILES_QUERY_KEY }),
  })
}

/** Approves a pending sign-up in one go: writes role + department + area grants,
 *  then flips status to 'active' last — so if anything fails partway through, the
 *  account is left still 'pending' (locked out, safe) rather than active with an
 *  incomplete/wrong set of grants. */
export function useApproveProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      role,
      departments,
      areas,
    }: {
      id: string
      role: Role
      departments: string[]
      areas: string[]
    }) => {
      const supabase = getSupabaseClient()
      await replaceGrants("profile_departments", "department", id, departments)
      await replaceGrants("profile_areas", "area", id, areas)
      const { error } = await supabase.from("profiles").update({ role, status: "active" }).eq("id", id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PROFILES_QUERY_KEY }),
  })
}
