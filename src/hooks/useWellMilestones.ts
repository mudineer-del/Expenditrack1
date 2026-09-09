import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getSupabaseClient } from "@/lib/supabase"
import { fromWellMilestoneRow, toWellMilestoneRow, type WellMilestone, type WellMilestoneRow } from "@/types/wellMilestone"
import { useActivityStore } from "@/store/useActivityStore"
import { logActivity } from "@/hooks/useActivityLog"
import { useAuth } from "@/hooks/useAuth"

export const WELL_MILESTONES_QUERY_KEY = ["wellMilestones"] as const

async function fetchAllWellMilestones(): Promise<WellMilestone[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from("well_milestones").select("*")
  if (error) throw error
  return ((data ?? []) as WellMilestoneRow[]).map(fromWellMilestoneRow)
}

export function useWellMilestonesQuery() {
  return useQuery({ queryKey: WELL_MILESTONES_QUERY_KEY, queryFn: fetchAllWellMilestones })
}

/** Same write tier as useUpsertWellCostTransaction — Editors as well as Admins, since
 *  actual dates/depths get filled in as drilling progresses, day to day. */
export function useUpsertWellMilestone() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (m: WellMilestone) => {
      const supabase = getSupabaseClient()
      const current = (queryClient.getQueryData(WELL_MILESTONES_QUERY_KEY) as WellMilestone[] | undefined) ?? []
      const wasEdit = current.some((c) => c.id === m.id)
      const undoId = useActivityStore
        .getState()
        .pushUndo(wasEdit ? `Edit of well data row "${m.label}"` : `Add of well data row "${m.label}"`, { wellMilestones: current })

      const { error } = await supabase.from("well_milestones").upsert(toWellMilestoneRow(m), { onConflict: "id" })
      if (error) throw error

      await logActivity(
        queryClient,
        { name: user?.name || "Unknown", role: user?.role || "" },
        wasEdit ? "Edit" : "Add",
        `${wasEdit ? "Edited" : "Added"} well data row "${m.label}"`,
        { wellId: m.wellId, undoId }
      )
      return m
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WELL_MILESTONES_QUERY_KEY }),
  })
}

export function useDeleteWellMilestone() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (m: WellMilestone) => {
      const supabase = getSupabaseClient()
      const current = (queryClient.getQueryData(WELL_MILESTONES_QUERY_KEY) as WellMilestone[] | undefined) ?? []
      const undoId = useActivityStore.getState().pushUndo(`Delete of well data row "${m.label}"`, { wellMilestones: current })

      const { error } = await supabase.from("well_milestones").delete().eq("id", m.id)
      if (error) throw error

      await logActivity(
        queryClient,
        { name: user?.name || "Unknown", role: user?.role || "" },
        "Delete",
        `Deleted well data row "${m.label}"`,
        { wellId: m.wellId, undoId }
      )
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WELL_MILESTONES_QUERY_KEY }),
  })
}
