import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getSupabaseClient } from "@/lib/supabase"
import { fromWellAfeRow, toWellAfeRow, type WellAfe, type WellAfeRow } from "@/types/wellAfe"
import { useActivityStore } from "@/store/useActivityStore"
import { logActivity } from "@/hooks/useActivityLog"
import { useAuth } from "@/hooks/useAuth"

export const WELL_AFES_QUERY_KEY = ["wellAfes"] as const

async function fetchAllWellAfes(): Promise<WellAfe[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from("well_afes").select("*").order("afe_no", { ascending: true })
  if (error) throw error
  return ((data ?? []) as WellAfeRow[]).map(fromWellAfeRow)
}

export function useWellAfesQuery() {
  return useQuery({ queryKey: WELL_AFES_QUERY_KEY, queryFn: fetchAllWellAfes })
}

/** Same write tier as useUpsertWellMilestone: Editors and Admins can draft and update AFEs. */
export function useUpsertWellAfe() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (a: WellAfe) => {
      const supabase = getSupabaseClient()
      const current = (queryClient.getQueryData(WELL_AFES_QUERY_KEY) as WellAfe[] | undefined) ?? []
      const wasEdit = current.some((c) => c.id === a.id)
      const undoId = useActivityStore
        .getState()
        .pushUndo(wasEdit ? `Edit of AFE ${a.afeNo}` : `Add of AFE ${a.afeNo}`, { wellAfes: current })

      const { error } = await supabase.from("well_afes").upsert(toWellAfeRow(a), { onConflict: "id" })
      if (error) throw error

      await logActivity(
        queryClient,
        { name: user?.name || "Unknown", role: user?.role || "" },
        wasEdit ? "Edit" : "Add",
        `${wasEdit ? "Edited" : "Added"} AFE ${a.afeNo}`,
        { wellId: a.wellId, undoId }
      )
      return a
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WELL_AFES_QUERY_KEY }),
  })
}

export function useDeleteWellAfe() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (a: WellAfe) => {
      const supabase = getSupabaseClient()
      const current = (queryClient.getQueryData(WELL_AFES_QUERY_KEY) as WellAfe[] | undefined) ?? []
      const undoId = useActivityStore.getState().pushUndo(`Delete of AFE ${a.afeNo}`, { wellAfes: current })

      const { error } = await supabase.from("well_afes").delete().eq("id", a.id)
      if (error) throw error

      await logActivity(
        queryClient,
        { name: user?.name || "Unknown", role: user?.role || "" },
        "Delete",
        `Deleted AFE ${a.afeNo}`,
        { wellId: a.wellId, undoId }
      )
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WELL_AFES_QUERY_KEY }),
  })
}
