import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getSupabaseClient } from "@/lib/supabase"

export interface ReferenceLists {
  vendors: string[]
  services: string[]
  types: string[]
  regions: string[]
  statuses: string[]
  months: string[]
  quarters: string[]
  rigs: string[]
  wells: string[]
}

/**
 * Default dropdown option lists, ported from the legacy app's `REF` constant
 * (index.html:1152-1163). Used to seed the Supabase `reference_lists` table
 * on first run, and as a fallback while that table is loading or empty.
 */
export const DEFAULT_REF: ReferenceLists = {
  vendors: ["Gemstone", "Hilong", "Mid Gard", "Schlumbergers", "Sprint", "Step Oiltools"],
  services: [
    "Bioremediation", "DWM", "Mud_Services", "OBM Cuttings", "OBM Transportation",
    "Pit_Restoration", "Storage", "Transportation",
  ],
  types: [
    "Batch-07", "Batch-08", "Batch-09", "Batch-10", "Batch-11", "Batch-12", "Batch-13",
    "CDFR", "Dewatering", "Foreign Mud Chemicals", "In-situ", "Local Mud Chemicals",
    "Local Mud Chemicals/Foreign Mud Chemicals", "Mud Engineering", "Mud Tanks", "North",
    "OBM", "OBM Cuttings", "OBM Transportation", "Pit rehabilitation", "Pit_Restoration",
    "Product", "Services", "South", "Sprinkling",
  ],
  regions: ["Centre", "North", "South"],
  statuses: [
    "Budget Provisioned", "Budgeting", "Cleared", "Cleared with Deduction", "Invoice Returned",
    "Invoice Sent to OGDCL", "Payment No Received", "Payment Received", "Project Not created",
    "Returned", "Sent for Budgeting", "Under Process",
  ],
  months: [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ],
  quarters: ["Q1", "Q2", "Q3", "Q4"],
  rigs: [],
  wells: [],
}

const REF_KEYS = Object.keys(DEFAULT_REF) as (keyof ReferenceLists)[]

interface ReferenceListRow {
  key: string
  values: unknown
}

export const REFERENCE_LISTS_QUERY_KEY = ["referenceLists"] as const

/**
 * Best-effort seed of the shared table with the built-in defaults. Only an
 * Admin's write actually succeeds (RLS policy on reference_lists) — anyone
 * else's attempt silently no-ops and they keep seeing DEFAULT_REF client-side
 * until an Admin has opened the app at least once.
 */
async function seedReferenceLists(): Promise<void> {
  const supabase = getSupabaseClient()
  const rows = REF_KEYS.map((key) => ({ key, values: DEFAULT_REF[key] }))
  await supabase.from("reference_lists").upsert(rows, { onConflict: "key" })
}

async function fetchReferenceLists(): Promise<ReferenceLists> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from("reference_lists").select("*")
  if (error) throw error
  const rows = (data ?? []) as ReferenceListRow[]
  if (!rows.length) {
    try {
      await seedReferenceLists()
    } catch {
      // Non-Admins can't seed (RLS) — fine, fall through to client defaults.
    }
    return DEFAULT_REF
  }
  const merged: ReferenceLists = { ...DEFAULT_REF }
  rows.forEach((r) => {
    if (REF_KEYS.includes(r.key as keyof ReferenceLists) && Array.isArray(r.values)) {
      merged[r.key as keyof ReferenceLists] = r.values as string[]
    }
  })
  return merged
}

export function useReferenceListsQuery() {
  return useQuery({ queryKey: REFERENCE_LISTS_QUERY_KEY, queryFn: fetchReferenceLists })
}

/** Admin-only write, enforced by RLS as well as the can() gate in the UI. */
export function useSetReferenceList() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ key, values }: { key: keyof ReferenceLists; values: string[] }) => {
      const supabase = getSupabaseClient()
      const { error } = await supabase.from("reference_lists").upsert({ key, values }, { onConflict: "key" })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: REFERENCE_LISTS_QUERY_KEY }),
  })
}

export function addReferenceValue(ref: ReferenceLists, key: keyof ReferenceLists, value: string): ReferenceLists {
  const trimmed = value.trim()
  if (!trimmed) return ref
  const list = ref[key] || []
  if (list.some((x) => x.toLowerCase() === trimmed.toLowerCase())) return ref
  return { ...ref, [key]: [...list, trimmed] }
}

/**
 * Convenience read (+ admin-write) hook for pages that just need the current
 * lists. Kept as a thin wrapper over useReferenceListsQuery/useSetReferenceList
 * so existing call sites (`const { ref } = useReferenceLists()`) don't need
 * to change now that the lists are Supabase-synced instead of local-only.
 */
export function useReferenceLists() {
  const query = useReferenceListsQuery()
  const setList = useSetReferenceList()
  const ref = query.data ?? DEFAULT_REF

  function addValue(key: keyof ReferenceLists, value: string) {
    const next = addReferenceValue(ref, key, value)
    if (next[key] !== ref[key]) setList.mutate({ key, values: next[key] })
  }
  function removeValue(key: keyof ReferenceLists, value: string) {
    setList.mutate({ key, values: ref[key].filter((v) => v !== value) })
  }

  return { ref, addValue, removeValue, isLoading: query.isLoading, isSaving: setList.isPending }
}
