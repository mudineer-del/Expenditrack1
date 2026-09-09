/** One row of a well's drilling program — a free-form label ("Spud", "20in Casing",
 *  "17-1/2in Section TD", ...) with planned vs. actual date and depth, so Well Cost can
 *  show cost alongside when/how deep things actually happened instead of dollars alone.
 *  See supabase/well_milestones_setup.sql. */
export interface WellMilestone {
  id: string
  wellId: string
  label: string
  plannedDate: string
  actualDate: string
  plannedDepth: number | ""
  actualDepth: number | ""
  notes: string
  sortOrder: number
}

export type WellMilestoneRow = Record<string, unknown> & { id: string }

export function toWellMilestoneRow(m: WellMilestone): WellMilestoneRow {
  return {
    id: String(m.id),
    well_id: m.wellId,
    label: m.label || null,
    planned_date: m.plannedDate || null,
    actual_date: m.actualDate || null,
    planned_depth: m.plannedDepth === "" ? null : Number(m.plannedDepth),
    actual_depth: m.actualDepth === "" ? null : Number(m.actualDepth),
    notes: m.notes || null,
    sort_order: m.sortOrder || 0,
  }
}

export function fromWellMilestoneRow(row: WellMilestoneRow): WellMilestone {
  return {
    id: String(row.id),
    wellId: String(row.well_id),
    label: (row.label as string) || "",
    plannedDate: (row.planned_date as string) || "",
    actualDate: (row.actual_date as string) || "",
    plannedDepth: row.planned_depth === null || row.planned_depth === undefined ? "" : Number(row.planned_depth),
    actualDepth: row.actual_depth === null || row.actual_depth === undefined ? "" : Number(row.actual_depth),
    notes: (row.notes as string) || "",
    sortOrder: Number(row.sort_order) || 0,
  }
}

export function blankWellMilestone(wellId: string, sortOrder: number): WellMilestone {
  return {
    id: crypto.randomUUID(),
    wellId,
    label: "",
    plannedDate: "",
    actualDate: "",
    plannedDepth: "",
    actualDepth: "",
    notes: "",
    sortOrder,
  }
}
