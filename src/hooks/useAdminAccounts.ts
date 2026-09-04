import { useMutation, useQueryClient } from "@tanstack/react-query"
import { getSupabaseClient } from "@/lib/supabase"
import { PROFILES_QUERY_KEY } from "@/hooks/useProfiles"

interface CreateAccountArgs {
  email: string
  name: string
  password: string
}

/**
 * Calls the `admin-create-user` Edge Function (see
 * supabase/functions/admin-create-user) rather than the client SDK directly —
 * creating another user's account requires the service_role key, which only
 * exists server-side inside that function, never in this bundle. The new
 * account lands 'pending', same as a self-signup — invalidating the profiles
 * query surfaces it in the Users page's "Pending Approval" list right away.
 */
export function useCreateAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ email, name, password }: CreateAccountArgs) => {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.functions.invoke<{ ok?: boolean; userId?: string; error?: string }>(
        "admin-create-user",
        { body: { email, name, password } }
      )
      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PROFILES_QUERY_KEY }),
  })
}

/**
 * Calls the `admin-delete-user` Edge Function (see
 * supabase/functions/admin-delete-user) — permanently deletes the account.
 * Irreversible; the caller is responsible for confirming with the admin first.
 */
export function useDeleteAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) => {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>("admin-delete-user", {
        body: { userId },
      })
      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PROFILES_QUERY_KEY }),
  })
}
