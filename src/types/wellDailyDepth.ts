/** Measured depth (MD) and true vertical depth (TVD) for one well on one report date. One
 *  row per well per date — see supabase/well_daily_depths_setup.sql. */
export interface WellDailyDepth {
  wellId: string
  entryDate: string
  depthMd: number | ""
  depthTvd: number | ""
  /** "manual" for the field entry form, "import" for a DMR report. */
  source: "manual" | "import"
}

export type WellDailyDepthRow = Record<string, unknown>

export function toWellDailyDepthRow(d: WellDailyDepth): WellDailyDepthRow {
  return {
    well_id: d.wellId,
    entry_date: d.entryDate,
    depth_md: d.depthMd === "" ? null : Number(d.depthMd),
    depth_tvd: d.depthTvd === "" ? null : Number(d.depthTvd),
    source: d.source,
  }
}

export function fromWellDailyDepthRow(row: WellDailyDepthRow): WellDailyDepth {
  return {
    wellId: String(row.well_id),
    entryDate: String(row.entry_date),
    depthMd: row.depth_md === null || row.depth_md === undefined ? "" : Number(row.depth_md),
    depthTvd: row.depth_tvd === null || row.depth_tvd === undefined ? "" : Number(row.depth_tvd),
    source: row.source === "import" ? "import" : "manual",
  }
}
