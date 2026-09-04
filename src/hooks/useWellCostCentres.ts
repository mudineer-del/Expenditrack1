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

/** Clones Cost/Fund Centre rows from one well onto another — the "Copy from Well" action
 *  on each service-category section (Drilling Fluids, Cementation, ...) on the Structure
 *  page, for starting a new well's cost structure from a similar one instead of re-typing
 *  every centre by hand. Pass `serviceCategoryId` to scope the copy to just that section's
 *  centres; omit it to copy the source well's entire structure. Departments themselves
 *  don't need copying: every well already gets a well_departments row for every global
 *  department at creation time (see provisionWellDepartments in useWells.ts) — only the
 *  per-well centre definitions (code, budget, vendor, ...) are actually well-specific.
 *  Transaction history is deliberately left behind; only the structure/budget template
 *  comes across. */
export function useCopyWellCostStructure() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async ({
      sourceWellId,
      targetWellId,
      serviceCategoryId,
    }: {
      sourceWellId: string
      targetWellId: string
      serviceCategoryId?: string
    }) => {
      const supabase = getSupabaseClient()
      const current = (queryClient.getQueryData(WELL_COST_CENTRES_QUERY_KEY) as WellCostCentre[] | undefined) ?? []
      const sourceItems = current.filter(
        (c) => c.wellId === sourceWellId && (!serviceCategoryId || c.serviceCategoryId === serviceCategoryId)
      )
      if (!sourceItems.length) return { count: 0 }

      const undoId = useActivityStore
        .getState()
        .pushUndo(`Copy of ${sourceItems.length} cost centre(s) into well`, { wellCostCentres: current })

      const newItems: WellCostCentre[] = sourceItems.map((c) => ({ ...c, id: crypto.randomUUID(), wellId: targetWellId }))
      const { error } = await supabase.from("well_cost_centres").insert(newItems.map(toWellCostCentreRow))
      if (error) throw error

      await logActivity(
        queryClient,
        { name: user?.name || "Unknown", role: user?.role || "" },
        "Add",
        `Copied ${newItems.length} cost / fund centre(s) from another well`,
        { wellId: targetWellId, undoId }
      )
      return { count: newItems.length }
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
