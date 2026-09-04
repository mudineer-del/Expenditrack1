export interface WellCostDepartment {
  id: string
  name: string
  sortOrder: number
}

export type WellCostDepartmentRow = Record<string, unknown> & { id: string }

export function fromWellCostDepartmentRow(row: WellCostDepartmentRow): WellCostDepartment {
  return {
    id: String(row.id),
    name: (row.name as string) || "",
    sortOrder: Number(row.sort_order) || 0,
  }
}

export interface WellCostServiceCategory {
  id: string
  departmentId: string
  name: string
  sortOrder: number
}

export type WellCostServiceCategoryRow = Record<string, unknown> & { id: string }

export function fromWellCostServiceCategoryRow(row: WellCostServiceCategoryRow): WellCostServiceCategory {
  return {
    id: String(row.id),
    departmentId: String(row.department_id),
    name: (row.name as string) || "",
    sortOrder: Number(row.sort_order) || 0,
  }
}

/** The auto-provisioned well<->department join — see supabase/well_cost_setup.sql. */
export interface WellDepartment {
  id: string
  wellId: string
  departmentId: string
}

export type WellDepartmentRow = Record<string, unknown> & { id: string }

export function fromWellDepartmentRow(row: WellDepartmentRow): WellDepartment {
  return {
    id: String(row.id),
    wellId: String(row.well_id),
    departmentId: String(row.department_id),
  }
}

/** Actual Cost and Commitments deliberately aren't fields here — they're derived by
 *  summing this cost centre's WellCostTransaction entries (see buildCostCentreTotals in
 *  lib/wellCost.ts), the day-by-day ledger of what was actually posted against it. */
export interface WellCostCentre {
  id: string
  wellId: string
  departmentId: string
  serviceCategoryId: string
  costCentre: string
  fundCentre: string
  description: string
  plannedBudget: number | ""
  currency: string
  vendor: string
  notes: string
}

export type WellCostCentreRow = Record<string, unknown> & { id: string }

export function toWellCostCentreRow(item: WellCostCentre): WellCostCentreRow {
  return {
    id: String(item.id),
    well_id: item.wellId,
    department_id: item.departmentId,
    service_category_id: item.serviceCategoryId,
    cost_centre: item.costCentre || null,
    fund_centre: item.fundCentre || null,
    description: item.description || null,
    planned_budget: item.plannedBudget === "" ? 0 : Number(item.plannedBudget) || 0,
    currency: item.currency || "USD",
    vendor: item.vendor || null,
    notes: item.notes || null,
  }
}

export function fromWellCostCentreRow(row: WellCostCentreRow): WellCostCentre {
  return {
    id: String(row.id),
    wellId: String(row.well_id),
    departmentId: String(row.department_id),
    serviceCategoryId: String(row.service_category_id),
    costCentre: (row.cost_centre as string) || "",
    fundCentre: (row.fund_centre as string) || "",
    description: (row.description as string) || "",
    plannedBudget: row.planned_budget === null || row.planned_budget === undefined ? "" : Number(row.planned_budget),
    currency: (row.currency as string) || "USD",
    vendor: (row.vendor as string) || "",
    notes: (row.notes as string) || "",
  }
}

export function blankWellCostCentre(wellId: string, departmentId: string, serviceCategoryId: string): WellCostCentre {
  return {
    id: crypto.randomUUID(),
    wellId,
    departmentId,
    serviceCategoryId,
    costCentre: "",
    fundCentre: "",
    description: "",
    plannedBudget: "",
    currency: "USD",
    vendor: "",
    notes: "",
  }
}

export type WellCostTransactionKind = "actual" | "commitment"

/** One dated posting against a cost centre — the day-by-day ledger entry. */
export interface WellCostTransaction {
  id: string
  costCentreId: string
  entryDate: string
  kind: WellCostTransactionKind
  amount: number | ""
  notes: string
  /** The drilling/operations narrative behind that day's cost (e.g. "stuck pipe — spotted
   *  lube pill") — auto-filled on import from the source report's own remarks (see
   *  dmrImport.ts's extractRemarks()), editable by hand otherwise. Kept separate from
   *  `notes` (which carries entry-provenance/manual notes) since it's operational context,
   *  not a note about the entry itself. */
  remarks: string
  createdByName: string
}

export type WellCostTransactionRow = Record<string, unknown> & { id: string }

export function toWellCostTransactionRow(t: WellCostTransaction): WellCostTransactionRow {
  return {
    id: String(t.id),
    cost_centre_id: t.costCentreId,
    entry_date: t.entryDate || null,
    kind: t.kind,
    amount: t.amount === "" ? 0 : Number(t.amount) || 0,
    notes: t.notes || null,
    remarks: t.remarks || null,
    created_by_name: t.createdByName || null,
  }
}

export function fromWellCostTransactionRow(row: WellCostTransactionRow): WellCostTransaction {
  return {
    id: String(row.id),
    costCentreId: String(row.cost_centre_id),
    entryDate: (row.entry_date as string) || "",
    kind: (row.kind as WellCostTransactionKind) || "actual",
    amount: row.amount === null || row.amount === undefined ? "" : Number(row.amount),
    notes: (row.notes as string) || "",
    remarks: (row.remarks as string) || "",
    createdByName: (row.created_by_name as string) || "",
  }
}

export function blankWellCostTransaction(costCentreId: string, kind: WellCostTransactionKind, createdByName: string): WellCostTransaction {
  return {
    id: crypto.randomUUID(),
    costCentreId,
    entryDate: new Date().toISOString().slice(0, 10),
    kind,
    amount: "",
    notes: "",
    remarks: "",
    createdByName,
  }
}
