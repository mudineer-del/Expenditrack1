import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getSupabaseClient } from "@/lib/supabase"
import { fromProfileRow, type ProfileRow } from "@/lib/profiles"
import type { AppUser, Role } from "@/types/user"

export const PROFILES_QUERY_KEY = ["profiles"] as const

async function fetchAllProfiles(): Promise<AppUser[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from("profiles").select("*").order("name", { ascending: true })
  if (error) throw error
  return ((data ?? []) as ProfileRow[]).map(fromProfileRow)
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
