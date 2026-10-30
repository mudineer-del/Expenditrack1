export const AFE_TYPES = ["Initial", "Supplementary", "Final"] as const
export const AFE_STATUSES = ["Draft", "Pending", "Approved", "Closed"] as const
/** Currencies an AFE can be written in, and that its totals can be converted into. */
export const AFE_CURRENCIES = ["PKR", "USD", "EUR", "GBP", "AED", "SAR"] as const

/** One cost line on an AFE: a WBS code and description with its estimate and contingency.
 *  Stored inside the AFE row as jsonb (see supabase/well_afes_setup.sql). */
export interface WellAfeLine {
  id: string
  code: string
  description: string
  estimate: number | ""
  contingency: number | ""
}

/** An Authorization for Expenditure for one well. See supabase/well_afes_setup.sql. */
export interface WellAfe {
  id: string
  wellId: string
  afeNo: string
  afeType: string
  status: string
  preparedOn: string
  approvedOn: string
  approvalLimit: number | ""
  /** The currency the AFE's lines are written in. Defaults to PKR. */
  currency: string
  /** The currency the totals are converted into for reporting. */
  preferredCurrency: string
  /** Units of preferredCurrency per one unit of currency. */
  conversionRate: number | ""
  /** Whether the converted values are shown. Saved with the AFE, so they stay on until
   *  someone reverts them. */
  converted: boolean
  notes: string
  lines: WellAfeLine[]
}

export type WellAfeRow = Record<string, unknown> & { id: string }

export function toWellAfeRow(a: WellAfe): WellAfeRow {
  return {
    id: String(a.id),
    well_id: a.wellId,
    afe_no: a.afeNo,
    afe_type: a.afeType || "Initial",
    status: a.status || "Draft",
    prepared_on: a.preparedOn || null,
    approved_on: a.approvedOn || null,
    approval_limit: a.approvalLimit === "" ? null : Number(a.approvalLimit),
    currency: a.currency || "PKR",
    preferred_currency: a.preferredCurrency || "USD",
    conversion_rate: a.conversionRate === "" ? null : Number(a.conversionRate),
    converted: !!a.converted,
    notes: a.notes || null,
    lines: a.lines.map((l) => ({
      id: l.id,
      code: l.code,
      description: l.description,
      estimate: l.estimate === "" ? 0 : Number(l.estimate),
      contingency: l.contingency === "" ? 0 : Number(l.contingency),
    })),
  }
}

export function fromWellAfeRow(row: WellAfeRow): WellAfe {
  const lines = Array.isArray(row.lines) ? (row.lines as WellAfeLine[]) : []
  return {
    id: String(row.id),
    wellId: String(row.well_id),
    afeNo: (row.afe_no as string) || "",
    afeType: (row.afe_type as string) || "Initial",
    status: (row.status as string) || "Draft",
    preparedOn: (row.prepared_on as string) || "",
    approvedOn: (row.approved_on as string) || "",
    approvalLimit: row.approval_limit === null || row.approval_limit === undefined ? "" : Number(row.approval_limit),
    currency: (row.currency as string) || "PKR",
    preferredCurrency: (row.preferred_currency as string) || "USD",
    conversionRate: row.conversion_rate === null || row.conversion_rate === undefined ? "" : Number(row.conversion_rate),
    converted: !!row.converted,
    notes: (row.notes as string) || "",
    lines: lines.map((l) => ({
      id: String(l.id),
      code: l.code || "",
      description: l.description || "",
      estimate: l.estimate === undefined || l.estimate === null ? "" : Number(l.estimate),
      contingency: l.contingency === undefined || l.contingency === null ? "" : Number(l.contingency),
    })),
  }
}

export function blankWellAfeLine(): WellAfeLine {
  return { id: crypto.randomUUID(), code: "", description: "", estimate: "", contingency: "" }
}

export function blankWellAfe(wellId: string): WellAfe {
  return {
    id: crypto.randomUUID(),
    wellId,
    afeNo: "",
    afeType: "Initial",
    status: "Draft",
    preparedOn: "",
    approvedOn: "",
    approvalLimit: "",
    currency: "PKR",
    preferredCurrency: "USD",
    conversionRate: "",
    converted: false,
    notes: "",
    lines: [blankWellAfeLine()],
  }
}

/** Estimate plus contingency across every line of an AFE. */
export function wellAfeTotal(a: WellAfe): number {
  return a.lines.reduce((s, l) => s + (Number(l.estimate) || 0) + (Number(l.contingency) || 0), 0)
}

/** Units of the preferred currency per unit of the AFE currency. Same currency means 1,
 *  and a missing or zero rate means there is nothing to convert to. */
export function wellAfeRate(a: WellAfe): number {
  return a.currency === a.preferredCurrency ? 1 : Number(a.conversionRate) || 0
}
