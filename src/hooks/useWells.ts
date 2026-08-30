import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getSupabaseClient } from "@/lib/supabase"
import { fromWellRow, toWellRow, type Well, type WellRow } from "@/types/well"
import { useActivityStore } from "@/store/useActivityStore"
import { logActivity } from "@/hooks/useActivityLog"
import { useAuth } from "@/hooks/useAuth"

export const WELLS_QUERY_KEY = ["wells"] as const

async function fetchAllWells(): Promise<Well[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from("wells").select("*")
  if (error) throw error
  return ((data ?? []) as WellRow[]).map(fromWellRow)
}

export function useWellsQuery() {
  return useQuery({ queryKey: WELLS_QUERY_KEY, queryFn: fetchAllWells })
}

/** Gives a brand-new well its own row in well_departments for every department that
 *  currently exists, so its department tabs (and independent cost structure) are there
 *  immediately — see supabase/well_cost_setup.sql. Best-effort: a failure here shouldn't
 *  fail the well creation itself, since the tabs would otherwise just show empty until an
 *  admin re-adds them (worst case), same tolerance as logActivity's own failure handling. */
async function provisionWellDepartments(wellId: string) {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.from("well_cost_departments").select("id")
    if (error) throw error
    const rows = ((data ?? []) as { id: string }[]).map((d) => ({ well_id: wellId, department_id: d.id }))
    if (rows.length) {
      const { error: insertError } = await supabase.from("well_departments").upsert(rows, { onConflict: "well_id,department_id" })
      if (insertError) throw insertError
    }
  } catch (e) {
    console.warn("Could not provision department tabs for new well:", e)
  }
}

export function useUpsertWell() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (well: Well) => {
      const supabase = getSupabaseClient()
      const current = (queryClient.getQueryData(WELLS_QUERY_KEY) as Well[] | undefined) ?? []
      const wasEdit = current.some((w) => w.id === well.id)
      const undoId = useActivityStore
        .getState()
        .pushUndo(wasEdit ? `Edit of well ${well.name}` : `Add of well ${well.name}`, { wells: current })

      const { error } = await supabase.from("wells").upsert(toWellRow(well), { onConflict: "id" })
      if (error) throw error
      if (!wasEdit) await provisionWellDepartments(well.id)

      await logActivity(
        queryClient,
        { name: user?.name || "Unknown", role: user?.role || "" },
        wasEdit ? "Edit" : "Add",
        `${wasEdit ? "Edited" : "Added"} well ${well.name}`,
        { wellName: well.name, undoId }
      )
      return well
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WELLS_QUERY_KEY }),
  })
}

export function useDeleteWell() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (well: Well) => {
      const supabase = getSupabaseClient()
      const current = (queryClient.getQueryData(WELLS_QUERY_KEY) as Well[] | undefined) ?? []
      const undoId = useActivityStore.getState().pushUndo(`Delete of well ${well.name}`, { wells: current })

      const { error } = await supabase.from("wells").delete().eq("id", well.id)
      if (error) throw error

      await logActivity(
        queryClient,
        { name: user?.name || "Unknown", role: user?.role || "" },
        "Delete",
        `Deleted well ${well.name}`,
        { wellName: well.name, undoId }
      )
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WELLS_QUERY_KEY }),
  })
}
