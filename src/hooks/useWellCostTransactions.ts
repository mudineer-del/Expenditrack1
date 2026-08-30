import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getSupabaseClient } from "@/lib/supabase"
import {
  fromWellCostTransactionRow,
  toWellCostTransactionRow,
  type WellCostTransaction,
  type WellCostTransactionRow,
} from "@/types/wellCost"
import { useActivityStore } from "@/store/useActivityStore"
import { logActivity } from "@/hooks/useActivityLog"
import { useAuth } from "@/hooks/useAuth"

export const WELL_COST_TRANSACTIONS_QUERY_KEY = ["wellCostTransactions"] as const

async function fetchAllWellCostTransactions(): Promise<WellCostTransaction[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from("well_cost_transactions").select("*")
  if (error) throw error
  return ((data ?? []) as WellCostTransactionRow[]).map(fromWellCostTransactionRow)
}

export function useWellCostTransactionsQuery() {
  return useQuery({ queryKey: WELL_COST_TRANSACTIONS_QUERY_KEY, queryFn: fetchAllWellCostTransactions })
}

/** Editors as well as Admins can log/edit entries (see can.ts's "wellCostEntry" note) —
 *  the one Well Cost mutation that isn't Admin-only, since this is the frequent,
 *  day-to-day part of the module rather than its budget/structure setup. */
export function useUpsertWellCostTransaction() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (t: WellCostTransaction) => {
      const supabase = getSupabaseClient()
      const current = (queryClient.getQueryData(WELL_COST_TRANSACTIONS_QUERY_KEY) as WellCostTransaction[] | undefined) ?? []
      const wasEdit = current.some((c) => c.id === t.id)
      const label = `${t.kind} entry of ${t.amount} on ${t.entryDate}`
      const undoId = useActivityStore
        .getState()
        .pushUndo(wasEdit ? `Edit of ${label}` : `Add of ${label}`, { wellCostTransactions: current })

      const { error } = await supabase.from("well_cost_transactions").upsert(toWellCostTransactionRow(t), { onConflict: "id" })
      if (error) throw error

      await logActivity(
        queryClient,
        { name: user?.name || "Unknown", role: user?.role || "" },
        wasEdit ? "Edit" : "Add",
        `${wasEdit ? "Edited" : "Logged"} ${label}`,
        { costCentreId: t.costCentreId, kind: t.kind, undoId }
      )
      return t
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WELL_COST_TRANSACTIONS_QUERY_KEY }),
  })
}

export function useDeleteWellCostTransaction() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (t: WellCostTransaction) => {
      const supabase = getSupabaseClient()
      const current = (queryClient.getQueryData(WELL_COST_TRANSACTIONS_QUERY_KEY) as WellCostTransaction[] | undefined) ?? []
      const label = `${t.kind} entry of ${t.amount} on ${t.entryDate}`
      const undoId = useActivityStore.getState().pushUndo(`Delete of ${label}`, { wellCostTransactions: current })

      const { error } = await supabase.from("well_cost_transactions").delete().eq("id", t.id)
      if (error) throw error

      await logActivity(
        queryClient,
        { name: user?.name || "Unknown", role: user?.role || "" },
        "Delete",
        `Deleted ${label}`,
        { costCentreId: t.costCentreId, kind: t.kind, undoId }
      )
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WELL_COST_TRANSACTIONS_QUERY_KEY }),
  })
}
