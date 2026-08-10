import { useEffect, useState } from "react"
import { storeGet, storeSet } from "@/lib/localCache"

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
 * (index.html:1152-1163). Local-only for now (localStorage-backed, like the
 * legacy app) — Phase 7 promotes this to a Supabase-synced table so the
 * lists are shared across users/devices instead of per-browser.
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

const STORE_KEY = "refLists"

export function loadReferenceLists(): ReferenceLists {
  const stored = storeGet<Partial<ReferenceLists>>(STORE_KEY)
  return stored ? { ...DEFAULT_REF, ...stored } : DEFAULT_REF
}

export function saveReferenceLists(ref: ReferenceLists) {
  storeSet(STORE_KEY, ref)
}

export function addReferenceValue(ref: ReferenceLists, key: keyof ReferenceLists, value: string): ReferenceLists {
  const trimmed = value.trim()
  if (!trimmed) return ref
  const list = ref[key] || []
  if (list.some((x) => x.toLowerCase() === trimmed.toLowerCase())) return ref
  const next = { ...ref, [key]: [...list, trimmed] }
  saveReferenceLists(next)
  return next
}

/** Small local-storage-backed hook until Phase 7 wires this to Supabase. */
export function useReferenceLists() {
  const [ref, setRef] = useState<ReferenceLists>(loadReferenceLists)

  useEffect(() => {
    saveReferenceLists(ref)
  }, [ref])

  const addValue = (key: keyof ReferenceLists, value: string) => {
    setRef((prev) => addReferenceValue(prev, key, value))
  }

  return { ref, setRef, addValue }
}
