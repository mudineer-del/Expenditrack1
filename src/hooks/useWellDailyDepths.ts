import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getSupabaseClient } from "@/lib/supabase"
import { fromWellDailyDepthRow, toWellDailyDepthRow, type WellDailyDepth, type WellDailyDepthRow } from "@/types/wellDailyDepth"

export const WELL_DAILY_DEPTHS_QUERY_KEY = ["wellDailyDepths"] as const

const PAGE_SIZE = 1000

/** Paged like the transactions fetch — PostgREST caps a single request at 1000 rows. */
async function fetchAllWellDailyDepths(): Promise<WellDailyDepth[]> {
  const supabase = getSupabaseClient()
  const all: WellDailyDepthRow[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("well_daily_depths")
      .select("*")
      .order("well_id", { ascending: true })
      .order("entry_date", { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    const batch = (data ?? []) as WellDailyDepthRow[]
    all.push(...batch)
    if (batch.length < PAGE_SIZE) break
  }
  return all.map(fromWellDailyDepthRow)
}

export function useWellDailyDepthsQuery() {
  return useQuery({ queryKey: WELL_DAILY_DEPTHS_QUERY_KEY, queryFn: fetchAllWellDailyDepths })
}

/** One or many depth rows. Conflicts on (well, date), so a re-import or a field re-entry
 *  for the same day updates that day rather than adding a second row. */
export function useUpsertWellDailyDepths() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (rows: WellDailyDepth[]) => {
      if (!rows.length) return 0
      const supabase = getSupabaseClient()
      for (let i = 0; i < rows.length; i += 200) {
        const { error } = await supabase
          .from("well_daily_depths")
          .upsert(rows.slice(i, i + 200).map(toWellDailyDepthRow), { onConflict: "well_id,entry_date" })
        if (error) throw error
      }
      return rows.length
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WELL_DAILY_DEPTHS_QUERY_KEY }),
  })
}
