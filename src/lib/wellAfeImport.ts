import { blankWellAfeLine, type WellAfeLine } from "@/types/wellAfe"

/** Header names accepted for each AFE cost-line column, in priority order: the first alias
 *  that appears in the file wins. Matching ignores case, spaces, and punctuation, so
 *  "Estimate (USD)" and "estimate_usd" both match "estimate usd". Current Budget comes
 *  before Original Budget on purpose: it includes supplementary and transfer amounts. */
const COLUMN_ALIASES = {
  code: ["code", "cost code", "wbs element", "wbs code"],
  description: ["description", "service", "service description", "wbs description", "scope"],
  estimate: ["estimate", "estimate usd", "current budget", "amount", "budget", "original budget", "orignal budget"],
  contingency: ["contingency", "contingency usd"],
} as const

function normalizeHeader(v: unknown): string {
  return String(v ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function toNumber(v: unknown): number | "" {
  if (v === null || v === undefined || v === "") return ""
  const n = Number(String(v).replace(/[,\s]/g, ""))
  return Number.isFinite(n) ? n : ""
}

/** Reads an HTML table (such as an SAP "Dynamic List Display" saved as .htm) into the same
 *  cell matrix a spreadsheet gives. Non-breaking spaces become plain spaces, so the
 *  padding the export puts around each value disappears. */
export function parseHtmlMatrix(html: string): unknown[][] {
  const doc = new DOMParser().parseFromString(html, "text/html")
  return Array.from(doc.querySelectorAll("tr")).map((tr) =>
    Array.from(tr.querySelectorAll("td, th")).map((cell) => (cell.textContent ?? "").replace(/ /g, " ").replace(/\s+/g, " ").trim())
  )
}

function findColumn(headers: string[], aliases: readonly string[]): number {
  for (const alias of aliases) {
    const i = headers.indexOf(alias)
    if (i >= 0) return i
  }
  return -1
}

/** Turns a matrix (first row a header) into AFE cost lines. Rows with no code, description,
 *  are skipped, which drops blank rows and total lines. Returns an error
 *  instead of lines when no header row names an estimate column. */
export function parseAfeLines(matrix: unknown[][]): { lines: WellAfeLine[]; error: string } {
  const headerIdx = matrix.findIndex((row) => findColumn(row.map(normalizeHeader), COLUMN_ALIASES.estimate) >= 0)
  if (headerIdx < 0) {
    return { lines: [], error: "No header row with an Estimate column. Expected columns: WBS Code, Description, Estimate, Contingency." }
  }

  const headers = matrix[headerIdx].map(normalizeHeader)
  const idx = {
    code: findColumn(headers, COLUMN_ALIASES.code),
    description: findColumn(headers, COLUMN_ALIASES.description),
    estimate: findColumn(headers, COLUMN_ALIASES.estimate),
    contingency: findColumn(headers, COLUMN_ALIASES.contingency),
  }

  const lines: WellAfeLine[] = []
  for (const row of matrix.slice(headerIdx + 1)) {
    const text = (i: number) => (i >= 0 ? String(row[i] ?? "").trim() : "")
    const code = text(idx.code)
    const description = text(idx.description)
    if (!code && !description) continue
    lines.push({
      ...blankWellAfeLine(),
      code,
      description,
      estimate: idx.estimate >= 0 ? toNumber(row[idx.estimate]) : "",
      contingency: idx.contingency >= 0 ? toNumber(row[idx.contingency]) : "",
    })
  }

  if (lines.length === 0) return { lines, error: "The file has a header row but no cost lines under it." }
  return { lines, error: "" }
}
