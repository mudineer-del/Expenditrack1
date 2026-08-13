import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getSupabaseClient } from "@/lib/supabase"
import { fromContractRow, toContractRow, type Contract, type ContractRow } from "@/types/contract"
import { useActivityStore } from "@/store/useActivityStore"
import { logActivity } from "@/hooks/useActivityLog"
import { useAuth } from "@/hooks/useAuth"

export const CONTRACTS_QUERY_KEY = ["contracts"] as const

async function fetchAllContracts(): Promise<Contract[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from("contracts").select("*")
  if (error) throw error
  return ((data ?? []) as ContractRow[]).map(fromContractRow)
}

export function useContractsQuery() {
  return useQuery({ queryKey: CONTRACTS_QUERY_KEY, queryFn: fetchAllContracts })
}

export function useUpsertContract() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (contract: Contract) => {
      const supabase = getSupabaseClient()
      const current = (queryClient.getQueryData(CONTRACTS_QUERY_KEY) as Contract[] | undefined) ?? []
      const wasEdit = current.some((c) => c.id === contract.id)
      const undoId = useActivityStore
        .getState()
        .pushUndo(wasEdit ? `Edit of contract ${contract.contractNo}` : `Add of contract ${contract.contractNo}`, { contracts: current })

      const { error } = await supabase
        .from("contracts")
        .upsert(toContractRow(contract), { onConflict: "id" })
      if (error) throw error

      await logActivity(
        queryClient,
        { name: user?.name || "Unknown", role: user?.role || "" },
        wasEdit ? "Edit" : "Add",
        `${wasEdit ? "Edited" : "Added"} contract ${contract.contractNo}${contract.vendor ? ` (${contract.vendor})` : ""}`,
        { contractNo: contract.contractNo, vendor: contract.vendor, undoId }
      )
      return contract
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CONTRACTS_QUERY_KEY }),
  })
}

export function useDeleteContract() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (contract: Contract) => {
      const supabase = getSupabaseClient()
      const current = (queryClient.getQueryData(CONTRACTS_QUERY_KEY) as Contract[] | undefined) ?? []
      const undoId = useActivityStore.getState().pushUndo(`Delete of contract ${contract.contractNo}`, { contracts: current })

      const { error } = await supabase.from("contracts").delete().eq("id", contract.id)
      if (error) throw error

      await logActivity(
        queryClient,
        { name: user?.name || "Unknown", role: user?.role || "" },
        "Delete",
        `Deleted contract ${contract.contractNo}${contract.vendor ? ` (${contract.vendor})` : ""}`,
        { contractNo: contract.contractNo, vendor: contract.vendor, undoId }
      )
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CONTRACTS_QUERY_KEY }),
  })
}
