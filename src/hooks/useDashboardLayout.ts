import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getSupabaseClient } from "@/lib/supabase"
import type { SyncableDisplayPrefs } from "@/store/useDisplayStore"
import { useAuth } from "@/hooks/useAuth"

export const DASHBOARD_LAYOUT_QUERY_KEY = ["dashboardLayout"] as const

interface DashboardLayoutRow {
  prefs: SyncableDisplayPrefs
  updated_at: string
}

/** The signed-in user's own saved Dashboard layout (see supabase/dashboard_layouts_setup.sql)
 *  — null when they've never clicked "Save Layout" yet, in which case whatever's already in
 *  this browser's local storage (today's default behavior) is what shows. */
export function useDashboardLayoutQuery() {
  const { user } = useAuth()
  return useQuery({
    queryKey: [...DASHBOARD_LAYOUT_QUERY_KEY, user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<DashboardLayoutRow | null> => {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from("dashboard_layouts")
        .select("prefs, updated_at")
        .eq("user_id", user!.id)
        .maybeSingle()
      if (error) throw error
      return (data as DashboardLayoutRow | null) ?? null
    },
  })
}

/** Writes the current live layout (colors, chart types, per-slot config, table style — the
 *  whole Settings > Format surface) to the signed-in user's own row, so it follows them to
 *  any device/browser instead of staying stuck in this one's local storage. */
export function useSaveDashboardLayout() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (prefs: SyncableDisplayPrefs) => {
      if (!user?.id) throw new Error("Not signed in.")
      const supabase = getSupabaseClient()
      const { error } = await supabase
        .from("dashboard_layouts")
        .upsert({ user_id: user.id, prefs, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DASHBOARD_LAYOUT_QUERY_KEY }),
  })
}
