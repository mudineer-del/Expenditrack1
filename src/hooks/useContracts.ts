import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getSupabaseClient } from "@/lib/supabase"
import { fromContractRow, toContractRow, type Contract, type ContractRow } from "@/types/contract"

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
  return useMutation({
    mutationFn: async (contract: Contract) => {
      const supabase = getSupabaseClient()
      const { error } = await supabase
        .from("contracts")
        .upsert(toContractRow(contract), { onConflict: "id" })
      if (error) throw error
      return contract
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CONTRACTS_QUERY_KEY }),
  })
}

export function useDeleteContract() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabaseClient()
      const { error } = await supabase.from("contracts").delete().eq("id", id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CONTRACTS_QUERY_KEY }),
  })
}
