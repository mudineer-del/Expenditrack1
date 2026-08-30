import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getSupabaseClient } from "@/lib/supabase"
import {
  fromWellCostDepartmentRow,
  fromWellCostServiceCategoryRow,
  fromWellDepartmentRow,
  type WellCostDepartment,
  type WellCostDepartmentRow,
  type WellCostServiceCategory,
  type WellCostServiceCategoryRow,
  type WellDepartment,
  type WellDepartmentRow,
} from "@/types/wellCost"
import { WELLS_QUERY_KEY } from "@/hooks/useWells"

/**
 * Catalog data (departments/service categories/the well<->department join) — admin-
 * extensible config that changes rarely, same category as reference_lists (see
 * lib/referenceLists.ts). Like that module's useSetReferenceList, these mutations skip
 * the activity log / undo stack: there's no existing precedent for logging picklist-style
 * config changes in this app, only record-level ones (invoices/contracts/wells/cost centres).
 */

export const WELL_COST_DEPARTMENTS_QUERY_KEY = ["wellCostDepartments"] as const
export const WELL_COST_SERVICE_CATEGORIES_QUERY_KEY = ["wellCostServiceCategories"] as const
export const WELL_DEPARTMENTS_QUERY_KEY = ["wellDepartments"] as const

async function fetchDepartments(): Promise<WellCostDepartment[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from("well_cost_departments").select("*").order("sort_order")
  if (error) throw error
  return ((data ?? []) as WellCostDepartmentRow[]).map(fromWellCostDepartmentRow)
}

export function useWellCostDepartmentsQuery() {
  return useQuery({ queryKey: WELL_COST_DEPARTMENTS_QUERY_KEY, queryFn: fetchDepartments })
}

async function fetchServiceCategories(): Promise<WellCostServiceCategory[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from("well_cost_service_categories").select("*").order("sort_order")
  if (error) throw error
  return ((data ?? []) as WellCostServiceCategoryRow[]).map(fromWellCostServiceCategoryRow)
}

export function useWellCostServiceCategoriesQuery() {
  return useQuery({ queryKey: WELL_COST_SERVICE_CATEGORIES_QUERY_KEY, queryFn: fetchServiceCategories })
}

async function fetchWellDepartments(): Promise<WellDepartment[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from("well_departments").select("*")
  if (error) throw error
  return ((data ?? []) as WellDepartmentRow[]).map(fromWellDepartmentRow)
}

export function useWellDepartmentsQuery() {
  return useQuery({ queryKey: WELL_DEPARTMENTS_QUERY_KEY, queryFn: fetchWellDepartments })
}

/** Adds a department to the global catalog, then backfills a well_departments row for
 *  every existing well so the new tab appears everywhere immediately — the same
 *  "uniform tabs" guarantee useWells.ts's provisionWellDepartments gives a brand-new well. */
export function useAddWellCostDepartment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const supabase = getSupabaseClient()
      const departments = (queryClient.getQueryData(WELL_COST_DEPARTMENTS_QUERY_KEY) as WellCostDepartment[] | undefined) ?? []
      const nextSortOrder = departments.reduce((max, d) => Math.max(max, d.sortOrder), -1) + 1

      const { data, error } = await supabase
        .from("well_cost_departments")
        .insert({ name: name.trim(), sort_order: nextSortOrder })
        .select()
        .single()
      if (error) throw error
      const department = fromWellCostDepartmentRow(data as WellCostDepartmentRow)

      const wells = (queryClient.getQueryData(WELLS_QUERY_KEY) as { id: string }[] | undefined) ?? []
      if (wells.length) {
        const rows = wells.map((w) => ({ well_id: w.id, department_id: department.id }))
        const { error: joinError } = await supabase.from("well_departments").upsert(rows, { onConflict: "well_id,department_id" })
        if (joinError) throw joinError
      }
      return department
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WELL_COST_DEPARTMENTS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: WELL_DEPARTMENTS_QUERY_KEY })
    },
  })
}

export function useAddServiceCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ departmentId, name }: { departmentId: string; name: string }) => {
      const supabase = getSupabaseClient()
      const categories = (queryClient.getQueryData(WELL_COST_SERVICE_CATEGORIES_QUERY_KEY) as WellCostServiceCategory[] | undefined) ?? []
      const nextSortOrder = categories.filter((c) => c.departmentId === departmentId).reduce((max, c) => Math.max(max, c.sortOrder), -1) + 1

      const { data, error } = await supabase
        .from("well_cost_service_categories")
        .insert({ department_id: departmentId, name: name.trim(), sort_order: nextSortOrder })
        .select()
        .single()
      if (error) throw error
      return fromWellCostServiceCategoryRow(data as WellCostServiceCategoryRow)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WELL_COST_SERVICE_CATEGORIES_QUERY_KEY }),
  })
}
