import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getSupabaseClient } from "@/lib/supabase"
import { fromWellCostCentreRow, toWellCostCentreRow, type WellCostCentre, type WellCostCentreRow } from "@/types/wellCost"
import { useActivityStore } from "@/store/useActivityStore"
import { logActivity } from "@/hooks/useActivityLog"
import { useAuth } from "@/hooks/useAuth"

export const WELL_COST_CENTRES_QUERY_KEY = ["wellCostCentres"] as const

async function fetchAllWellCostCentres(): Promise<WellCostCentre[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from("well_cost_centres").select("*")
  if (error) throw error
  return ((data ?? []) as WellCostCentreRow[]).map(fromWellCostCentreRow)
}

export function useWellCostCentresQuery() {
  return useQuery({ queryKey: WELL_COST_CENTRES_QUERY_KEY, queryFn: fetchAllWellCostCentres })
}

export function useUpsertWellCostCentre() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (item: WellCostCentre) => {
      const supabase = getSupabaseClient()
      const current = (queryClient.getQueryData(WELL_COST_CENTRES_QUERY_KEY) as WellCostCentre[] | undefined) ?? []
      const wasEdit = current.some((c) => c.id === item.id)
      const label = `${item.costCentre}${item.fundCentre ? ` / ${item.fundCentre}` : ""}`
      const undoId = useActivityStore
        .getState()
        .pushUndo(wasEdit ? `Edit of cost centre ${label}` : `Add of cost centre ${label}`, { wellCostCentres: current })

      const { error } = await supabase.from("well_cost_centres").upsert(toWellCostCentreRow(item), { onConflict: "id" })
      if (error) throw error

      await logActivity(
        queryClient,
        { name: user?.name || "Unknown", role: user?.role || "" },
        wasEdit ? "Edit" : "Add",
        `${wasEdit ? "Edited" : "Added"} cost centre ${label}`,
        { wellId: item.wellId, departmentId: item.departmentId, serviceCategoryId: item.serviceCategoryId, undoId }
      )
      return item
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WELL_COST_CENTRES_QUERY_KEY }),
  })
}

export function useDeleteWellCostCentre() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (item: WellCostCentre) => {
      const supabase = getSupabaseClient()
      const current = (queryClient.getQueryData(WELL_COST_CENTRES_QUERY_KEY) as WellCostCentre[] | undefined) ?? []
      const label = `${item.costCentre}${item.fundCentre ? ` / ${item.fundCentre}` : ""}`
      const undoId = useActivityStore.getState().pushUndo(`Delete of cost centre ${label}`, { wellCostCentres: current })

      const { error } = await supabase.from("well_cost_centres").delete().eq("id", item.id)
      if (error) throw error

      await logActivity(
        queryClient,
        { name: user?.name || "Unknown", role: user?.role || "" },
        "Delete",
        `Deleted cost centre ${label}`,
        { wellId: item.wellId, departmentId: item.departmentId, serviceCategoryId: item.serviceCategoryId, undoId }
      )
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WELL_COST_CENTRES_QUERY_KEY }),
  })
}
