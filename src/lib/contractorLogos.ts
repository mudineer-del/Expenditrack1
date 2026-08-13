import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getSupabaseClient } from "@/lib/supabase"

export type ContractorLogos = Record<string, string>

const LOGOS_KEY = "contractor_logos"
export const CONTRACTOR_LOGOS_QUERY_KEY = ["contractorLogos"] as const

export function contractorLogoKey(vendor: string): string {
  return vendor.trim().toLowerCase()
}

export function getContractorLogo(logos: ContractorLogos, vendor: string | null | undefined): string | undefined {
  if (!vendor) return undefined
  return logos[contractorLogoKey(vendor)]
}

async function fetchContractorLogos(): Promise<ContractorLogos> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("reference_lists")
    .select("values")
    .eq("key", LOGOS_KEY)
    .maybeSingle()
  if (error) throw error
  if (!data || !data.values || typeof data.values !== "object" || Array.isArray(data.values)) return {}
  const logos: ContractorLogos = {}
  Object.entries(data.values as Record<string, unknown>).forEach(([key, value]) => {
    if (typeof value === "string" && value.length > 0) logos[key] = value
  })
  return logos
}

export function useContractorLogosQuery() {
  return useQuery({ queryKey: CONTRACTOR_LOGOS_QUERY_KEY, queryFn: fetchContractorLogos })
}

export function useContractorLogos() {
  const queryClient = useQueryClient()
  const query = useContractorLogosQuery()
  const save = useMutation({
    mutationFn: async (logos: ContractorLogos) => {
      const supabase = getSupabaseClient()
      const { error } = await supabase.from("reference_lists").upsert({ key: LOGOS_KEY, values: logos }, { onConflict: "key" })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CONTRACTOR_LOGOS_QUERY_KEY }),
  })

  async function setLogo(vendor: string, dataUrl: string) {
    const logos = { ...(query.data ?? {}), [contractorLogoKey(vendor)]: dataUrl }
    await save.mutateAsync(logos)
  }

  async function removeLogo(vendor: string) {
    const logos = { ...(query.data ?? {}) }
    delete logos[contractorLogoKey(vendor)]
    await save.mutateAsync(logos)
  }

  return {
    logos: query.data ?? {},
    setLogo,
    removeLogo,
    isLoading: query.isLoading,
    isSaving: save.isPending,
    error: query.error ?? save.error,
  }
}
