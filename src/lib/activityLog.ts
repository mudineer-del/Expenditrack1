import type { ActivityAction } from "@/store/useActivityStore"

export const ACTION_COLOR: Record<ActivityAction, string> = {
  Import: "#6d5fd6",
  Add: "var(--status-cleared)",
  Edit: "var(--status-under)",
  Delete: "var(--status-returned)",
  Undo: "var(--dataviz-6)",
  Restore: "var(--dataviz-5)",
}

export function fmtDateTime(ts: number, opts: { seconds?: boolean } = {}): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, "0")
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}${opts.seconds ? `:${pad(d.getSeconds())}` : ""}`
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${time}`
}

const META_LABELS: Record<string, string> = {
  invoiceNo: "Invoice No.",
  contractNo: "Contract No.",
  wellId: "Well",
  costCentreId: "Cost Centre",
  kind: "Kind",
  count: "Count",
  department: "Department",
  departmentId: "Department",
  serviceCategoryId: "Service Category",
}

/** Turns a camelCase meta key into a readable label — a small named override list for the
 *  common ones, falling back to a generic camelCase-to-Title-Case split for anything else
 *  so a future meta field never renders as raw camelCase. */
export function metaLabel(key: string): string {
  if (META_LABELS[key]) return META_LABELS[key]
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase())
}
