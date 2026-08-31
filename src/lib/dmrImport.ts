/** Bulk-imports daily cost figures out of "Wellsite Daily Cost" report workbooks (the
 *  DMR/mud-cost template vendors deliver one .xlsm/.xlsx per day) into WellCostTransaction
 *  entries.
 *
 *  Each report actually carries THREE separate daily cost figures, not one — the WBM
 *  sheet's "M-I Engineer / Daily cost / Cumulative Cost" block breaks the day's mud cost
 *  down by who it's billed to: the mud contractor's own line (immediately below that
 *  header, e.g. "SLB COST" — Schlumberger), an "OGDCL ..." line, and a "MIDGARD ..." line.
 *  An earlier version of this importer read only the "Daily Cost" sheet's single "Total
 *  Daily Cost" figure, which turned out to just be the mud contractor's own number —
 *  posting everything to one cost centre and silently dropping the OGDCL/second-contractor
 *  split. Verified against all 54 sample reports: contractor + OGDCL + second-contractor
 *  sums reconcile to the sheet's own "Cummulative Cost" cross-check row to the penny in
 *  50/54 files (the other 4 just have that one cross-check cell itself left blank/0 in the
 *  source file — the three individual figures were still present and correct).
 *
 *  Label-driven rather than fixed cell references, since the sheet's own column layout
 *  shifts slightly between files (hand-edited daily) — only the "Daily cost"/"Cumulative
 *  Cost" header cells and the row immediately below them (always the mud contractor's own
 *  line, whether or not it carries its own text label) stayed reliably in place. */

export type DmrContractor = "OGDCL" | "MUD_CONTRACTOR" | "SECOND_CONTRACTOR"

export interface DmrImportRow {
  fileName: string
  entryDate: string
  contractor: DmrContractor
  /** Whatever label the source row itself carried (e.g. "SLB COST", "MIDGARD", or "" when
   *  the mud-contractor row had no text label of its own) — shown in the import preview so
   *  a human can sanity-check the OGDCL_MUD_CONTRACTOR/SECOND_CONTRACTOR tagging. */
  sourceLabel: string
  amount: number
  wellName: string
}

export interface DmrImportError {
  fileName: string
  error: string
}

/** A contractor's row was properly labeled but its Daily cost cell was left blank that
 *  day — only the Cumulative cell had anything in it. Deliberately NOT backfilled from
 *  the Cumulative figure: spot-checking these across real reports found the Cumulative
 *  column itself going backwards day to day (e.g. one report's OGDCL cumulative was
 *  exactly the previous report's cumulative minus that day's own daily figure), so it
 *  isn't reliable enough to reconstruct a missing day's number from. Surfaced instead so
 *  a human can decide whether to chase the real figure down. */
export interface DmrGap {
  fileName: string
  entryDate: string
  contractor: DmrContractor
  /** Whatever the Cumulative cell showed that day, for context — not used as the amount. */
  cumulativeOnFile: string
}

function findLabelValue(rows: unknown[][], labelRegex: RegExp): string | null {
  for (const row of rows) {
    for (let i = 0; i < row.length; i++) {
      const cell = String(row[i] ?? "").trim()
      if (labelRegex.test(cell)) {
        for (let j = i + 1; j < row.length; j++) {
          const v = String(row[j] ?? "").trim()
          if (v !== "") return v
        }
      }
    }
  }
  return null
}

/** The report filename's own leading YYYY-MM-DD (this folder's naming convention) is more
 *  reliable than the sheet's internal "Date :" cell, which is a locale-formatted M/D/YY
 *  string with no reliable way to tell "8/7" (Aug 7) apart from a DD/MM reading (Jul 8) —
 *  the filename is already unambiguous. */
function dateFromFileName(fileName: string): string | null {
  const m = fileName.match(/(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null
}

function parseMonthDayYear(s: string): string | null {
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (!m) return null
  const month = Number(m[1])
  const day = Number(m[2])
  const year = m[3].length === 2 ? `20${m[3]}` : m[3]
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function parseAmount(s: string | undefined | null): number | null {
  if (s == null) return null
  const cleaned = String(s).replace(/[$,\s]/g, "")
  if (cleaned === "" || cleaned === "-") return 0
  const n = Number(cleaned)
  return isNaN(n) ? null : n
}

/** Finds the "M-I Engineer / ... / Daily cost / ... / Cumulative Cost" header row and
 *  reads the three contractor lines below it. The mud-contractor's own row is always
 *  immediately below the header (its text label is unreliable — sometimes blank/"0" —
 *  so it's identified by position, not text); OGDCL's and the second contractor's rows
 *  are identified by their own label text within the next several rows, since their
 *  relative order isn't consistent across files. */
interface ExtractedRow {
  contractor: DmrContractor
  sourceLabel: string
  amount: number
}
interface ExtractedGap {
  contractor: DmrContractor
  cumulativeOnFile: string
}

function extractThreeWayCost(rows: unknown[][]): { rows: ExtractedRow[]; gaps: ExtractedGap[] } | { error: string } {
  let headerRow = -1
  let dailyCol = -1
  let cumCol = -1
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r]
    let dc = -1
    let cc = -1
    for (let c = 0; c < row.length; c++) {
      const v = String(row[c] ?? "").trim().toLowerCase()
      if (v === "daily cost") dc = c
      if (v === "cumulative cost") cc = c
    }
    if (dc >= 0 && cc >= 0) {
      headerRow = r
      dailyCol = dc
      cumCol = cc
      break
    }
  }
  if (headerRow < 0) return { error: 'Could not find the "Daily cost / Cumulative Cost" breakdown on the WBM sheet.' }

  const gaps: ExtractedGap[] = []

  const mudContractorRow = rows[headerRow + 1]
  const mudDailyCell = String(mudContractorRow?.[dailyCol] ?? "").trim()
  const mudCumCell = String(mudContractorRow?.[cumCol] ?? "").trim()
  if (!mudDailyCell && mudCumCell) gaps.push({ contractor: "MUD_CONTRACTOR", cumulativeOnFile: mudCumCell })
  const mudAmount = mudDailyCell ? parseAmount(mudDailyCell) : 0
  if (mudAmount === null) return { error: "Could not read the mud contractor's daily cost figure." }
  // The cell immediately to the left of the amount (not just "first non-empty cell in
  // the row") — that row also carries the on-duty engineer's name/phone further left,
  // which isn't the contractor label.
  let mudLabel = ""
  for (let c = dailyCol - 1; c >= 0; c--) {
    const v = String(mudContractorRow?.[c] ?? "").trim()
    if (v) {
      mudLabel = v
      break
    }
  }

  // OGDCL's row is identified by its own label text; the second contractor's row is
  // whatever OTHER labeled, amount-bearing row shows up in this window that isn't OGDCL,
  // the cross-check "Cumulative" row, or the mud-contractor row already captured above —
  // deliberately not hardcoded to "Midgard" so this generalizes to any well's actual
  // second contractor name. Requires the amount cell itself to be non-blank (not just
  // "parses to a number", since a blank cell also parses to 0) — a stray leftover
  // character in an otherwise-empty row (seen in real samples) would otherwise read as a
  // spurious $0 "contractor" row and silently overwrite the real match found earlier.
  let ogdclAmount: number | null = null
  let secondAmount: number | null = null
  let secondLabel = ""
  for (let r = headerRow + 2; r < Math.min(rows.length, headerRow + 12); r++) {
    const row = rows[r]
    const rawLabel = row
      .slice(0, dailyCol)
      .map((c) => String(c ?? ""))
      .join(" ")
      .trim()
    if (rawLabel.length < 3) continue
    const label = rawLabel.toLowerCase()
    if (/cumm?ulative/.test(label)) continue
    const contractor: DmrContractor = /ogdcl/.test(label) ? "OGDCL" : "SECOND_CONTRACTOR"
    const amountCell = String(row[dailyCol] ?? "").trim()
    const cumCell = String(row[cumCol] ?? "").trim()
    if (!amountCell) {
      if (cumCell) gaps.push({ contractor, cumulativeOnFile: cumCell })
      continue
    }
    const amt = parseAmount(amountCell)
    if (amt === null) continue
    if (contractor === "OGDCL") ogdclAmount = amt
    else {
      secondAmount = amt
      secondLabel = rawLabel
    }
  }

  const result: ExtractedRow[] = [{ contractor: "MUD_CONTRACTOR", sourceLabel: mudLabel, amount: mudAmount }]
  if (ogdclAmount !== null) result.push({ contractor: "OGDCL", sourceLabel: "OGDCL", amount: ogdclAmount })
  if (secondAmount !== null) result.push({ contractor: "SECOND_CONTRACTOR", sourceLabel: secondLabel, amount: secondAmount })
  return { rows: result, gaps }
}

async function parseOneFile(file: File): Promise<{ rows: DmrImportRow[]; gaps: DmrGap[] } | DmrImportError> {
  try {
    const XLSX = await import("xlsx")
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: "array" })
    const sheetName = wb.SheetNames.find((s) => /^wbm$/i.test(s)) ?? wb.SheetNames.find((s) => /wbm/i.test(s))
    if (!sheetName) return { fileName: file.name, error: 'No "WBM" sheet found in this workbook.' }

    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, raw: false, defval: "" }) as unknown[][]
    const wellName = findLabelValue(rows, /well name/i) ?? ""

    const entryDate = dateFromFileName(file.name) ?? parseMonthDayYear(findLabelValue(rows, /^date\s*:?$/i) ?? "")
    if (!entryDate) return { fileName: file.name, error: "Could not determine a report date from the filename or the sheet." }

    const extracted = extractThreeWayCost(rows)
    if ("error" in extracted) return { fileName: file.name, error: extracted.error }

    return {
      rows: extracted.rows.map((r) => ({
        fileName: file.name,
        entryDate,
        contractor: r.contractor,
        sourceLabel: r.sourceLabel,
        amount: r.amount,
        wellName,
      })),
      gaps: extracted.gaps.map((g) => ({
        fileName: file.name,
        entryDate,
        contractor: g.contractor,
        cumulativeOnFile: g.cumulativeOnFile,
      })),
    }
  } catch (e) {
    return { fileName: file.name, error: e instanceof Error ? e.message : "Could not read this file." }
  }
}

export async function parseDmrFiles(files: File[]): Promise<{ rows: DmrImportRow[]; gaps: DmrGap[]; errors: DmrImportError[] }> {
  const results = await Promise.all(files.map(parseOneFile))
  const rows: DmrImportRow[] = []
  const gaps: DmrGap[] = []
  const errors: DmrImportError[] = []
  for (const r of results) {
    if ("error" in r) errors.push(r)
    else {
      rows.push(...r.rows)
      gaps.push(...r.gaps)
    }
  }
  return { rows, gaps, errors }
}
