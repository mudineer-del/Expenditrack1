import { useMutation } from "@tanstack/react-query"
import { getSupabaseClient } from "@/lib/supabase"

interface SetPasswordArgs {
  userId: string
  newPassword: string
}

/**
 * Calls the `admin-set-password` Edge Function (see
 * supabase/functions/admin-set-password) rather than the client SDK directly
 * — setting *another* user's password requires the service_role key, which
 * only exists server-side inside that function, never in this bundle.
 */
export function useSetUserPassword() {
  return useMutation({
    mutationFn: async ({ userId, newPassword }: SetPasswordArgs) => {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>(
        "admin-set-password",
        { body: { userId, newPassword } }
      )
      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)
      return data
    },
  })
}
