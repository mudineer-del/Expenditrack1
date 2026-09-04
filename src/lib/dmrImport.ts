/** Bulk-imports daily cost figures out of daily report workbooks into WellCostTransaction
 *  entries. Two source formats are supported, auto-detected per file by which sheet it has:
 *
 *  1. "WBM" sheet (the DMR/mud-cost template vendors deliver one .xlsm/.xlsx per day) —
 *  carries THREE separate daily cost figures, not one: the "M-I Engineer / Daily cost /
 *  Cumulative Cost" block breaks the day's mud cost down by who it's billed to — the mud
 *  contractor's own line (immediately below that header, e.g. "SLB COST" — Schlumberger),
 *  an "OGDCL ..." line, and a "MIDGARD ..." line. An earlier version of this importer read
 *  only the "Daily Cost" sheet's single "Total Daily Cost" figure, which turned out to just
 *  be the mud contractor's own number — posting everything to one cost centre and silently
 *  dropping the OGDCL/second-contractor split. Verified against all 54 sample reports:
 *  contractor + OGDCL + second-contractor sums reconcile to the sheet's own "Cummulative
 *  Cost" cross-check row to the penny in 50/54 files (the other 4 just have that one
 *  cross-check cell itself left blank/0 in the source file — the three individual figures
 *  were still present and correct). Label-driven rather than fixed cell references, since
 *  the sheet's own column layout shifts slightly between files (hand-edited daily) — only
 *  the "Daily cost"/"Cumulative Cost" header cells and the row immediately below them
 *  (always the mud contractor's own line, whether or not it carries its own text label)
 *  stayed reliably in place.
 *
 *  2. "DATE WISE CONSUMPTION" sheet (the "DATE WISE CHEMICAL CONSUMPTION SHEET.xlsx" a
 *  different reporting template produces) — a single workbook covers a WHOLE MONTH, one row
 *  per chemical with a column per day-of-month, and two roll-up rows ("DAILY COST OGDCL
 *  CHEMICALS" / "DAILY COST SHLUMBERGER (MI SWACO)" — exact wording varies) giving that
 *  day's two-way split directly, so no per-chemical summing is needed. Only a two-way split
 *  (OGDCL / one mud contractor, no second contractor), unlike the WBM format's three. Since
 *  the field team re-saves this same file daily with that day's column freshly filled in,
 *  every file for a given month carries the FULL month-to-date grid — selecting more than
 *  one file for the same month is redundant, not additive; when duplicates are selected the
 *  existing "duplicate-in-batch" plan check (below) collapses them, keeping whichever file
 *  sorts first. To avoid relying on that, prefer selecting just each month's LAST dated
 *  file. A day whose cell is blank (not yet reported) is skipped; a day whose cell reads
 *  "0" is a real reported zero and is still skipped too, but only because the import
 *  dialog's own plan already drops every zero-amount row regardless of source format. */

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
  /** The day's drilling-operations/mud-treatment narrative, when the source format carries
   *  one (WBM sheet only — see extractRemarks()) — same text attached to all of that day's
   *  contractor rows, since it describes the day/activity, not one contractor's billing. */
  remarks: string
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

/** The WBM sheet carries two free-text narrative blocks, one row apart from their own
 *  labels in the same column ("REMARKS AND TREATMENT" — the mud engineer's chemical
 *  treatment log — and a separate "REMARKS" block — the rig's own operations/activity
 *  summary, e.g. "CONTINUED WORK ON STUCK STRING..."). Both are attached to every
 *  contractor row for that day (not just one), since they describe the day/activity as a
 *  whole rather than any single contractor's billing — this is what lets a later reader
 *  see WHY a day's cost was high, not just what it was. Neither block is guaranteed to be
 *  present in every report template, so an empty string means "not found," not an error. */
function extractRemarks(rows: unknown[][]): string {
  let treatment = ""
  let operations = ""
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r]
    for (let c = 0; c < row.length; c++) {
      const label = String(row[c] ?? "").trim().toUpperCase()
      if (label === "REMARKS AND TREATMENT") treatment = String(rows[r + 1]?.[c] ?? "").trim()
      else if (label === "REMARKS") operations = String(rows[r + 1]?.[c] ?? "").trim()
    }
  }
  const parts: string[] = []
  if (operations) parts.push(operations)
  if (treatment) parts.push(`Mud Treatment: ${treatment}`)
  return parts.join("\n\n")
}

const MONTH_NUMBERS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
}

/** Reads the whole-month grid out of a "DATE WISE CONSUMPTION" sheet — one row per
 *  chemical, a column per day-of-month, and two roll-up rows giving that day's OGDCL and
 *  contractor cost directly. See the file-level comment above for the shape. */
function extractMonthlyChemicalCosts(
  rows: unknown[][]
):
  | {
      wellLabel: string
      contractorLabel: string
      year: number
      monthNum: number
      monthLabel: string
      days: { entryDate: string; ogdcl: number | null; contractor: number | null }[]
    }
  | { error: string } {
  const titleRow = rows.find((row) => row.some((c) => /for the month of/i.test(String(c ?? ""))))
  if (!titleRow) return { error: 'Could not find the "FOR THE MONTH OF ..." title on this sheet.' }
  const titleText = titleRow.map((c) => String(c ?? "")).join(" ")
  const monthMatch = titleText.match(/for the month of\s+([a-z]+)-(\d{4})/i)
  const monthNum = monthMatch ? MONTH_NUMBERS[monthMatch[1].toLowerCase()] : undefined
  if (!monthMatch || !monthNum) return { error: 'Could not read the month/year out of this sheet\'s "FOR THE MONTH OF ..." title.' }
  const year = Number(monthMatch[2])
  const wellMatch = titleText.match(/at well\s+([a-z0-9-]+)/i)
  const wellLabel = wellMatch ? wellMatch[1] : ""

  let headerRow = -1
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r]
    const hasChemicals = row.some((c) => String(c ?? "").trim().toLowerCase() === "chemicals")
    const hasUnit = row.some((c) => String(c ?? "").trim().toLowerCase() === "unit")
    if (hasChemicals && hasUnit) {
      headerRow = r
      break
    }
  }
  if (headerRow < 0) return { error: "Could not find the CHEMICALS/Unit header row on this sheet." }

  const DAY_START_COL = 3 // S.No., CHEMICALS, Unit, then day 1..N
  const daysInMonth = new Date(year, monthNum, 0).getDate()

  let ogdclRow = -1
  let contractorRow = -1
  let contractorLabel = ""
  for (let r = headerRow + 1; r < rows.length; r++) {
    const label = String(rows[r]?.[1] ?? "").trim()
    if (!label) continue
    const up = label.toUpperCase()
    // Stop before the "TOTAL DAILY COST OF OGDCL + <contractor> (...)" combined row — it
    // contains both "DAILY COST" and "OGDCL" too, and would otherwise overwrite the real
    // OGDCL-only row above it since it's encountered later in the same scan.
    if (up.startsWith("TOTAL")) break
    if (!up.includes("DAILY COST")) continue
    if (up.includes("OGDCL")) ogdclRow = r
    else if (/SCHL?UMBERGER|SWAC?O/i.test(up)) {
      contractorRow = r
      contractorLabel = label
    }
  }
  if (ogdclRow < 0 && contractorRow < 0) {
    return { error: 'Could not find a "DAILY COST OGDCL ..." or contractor daily-cost roll-up row on this sheet.' }
  }

  const days: { entryDate: string; ogdcl: number | null; contractor: number | null }[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    const col = DAY_START_COL + d - 1
    const ogdclCell = ogdclRow >= 0 ? String(rows[ogdclRow]?.[col] ?? "").trim() : ""
    const contractorCell = contractorRow >= 0 ? String(rows[contractorRow]?.[col] ?? "").trim() : ""
    if (!ogdclCell && !contractorCell) continue
    days.push({
      entryDate: `${year}-${String(monthNum).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      ogdcl: ogdclCell ? parseAmount(ogdclCell) : null,
      contractor: contractorCell ? parseAmount(contractorCell) : null,
    })
  }
  return { wellLabel, contractorLabel, year, monthNum, monthLabel: monthMatch[1], days }
}

async function parseOneFile(file: File): Promise<{ rows: DmrImportRow[]; gaps: DmrGap[] } | DmrImportError> {
  try {
    const XLSX = await import("xlsx")
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: "array" })
    const wbmSheetName = wb.SheetNames.find((s) => /^wbm$/i.test(s)) ?? wb.SheetNames.find((s) => /wbm/i.test(s))

    if (wbmSheetName) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wbmSheetName], { header: 1, raw: false, defval: "" }) as unknown[][]
      const wellName = findLabelValue(rows, /well name/i) ?? ""

      const entryDate = dateFromFileName(file.name) ?? parseMonthDayYear(findLabelValue(rows, /^date\s*:?$/i) ?? "")
      if (!entryDate) return { fileName: file.name, error: "Could not determine a report date from the filename or the sheet." }

      const extracted = extractThreeWayCost(rows)
      if ("error" in extracted) return { fileName: file.name, error: extracted.error }
      const remarks = extractRemarks(rows)

      return {
        rows: extracted.rows.map((r) => ({
          fileName: file.name,
          entryDate,
          contractor: r.contractor,
          sourceLabel: r.sourceLabel,
          amount: r.amount,
          wellName,
          remarks,
        })),
        gaps: extracted.gaps.map((g) => ({
          fileName: file.name,
          entryDate,
          contractor: g.contractor,
          cumulativeOnFile: g.cumulativeOnFile,
        })),
      }
    }

    const monthlySheetName = wb.SheetNames.find((s) => /date\s*wise\s*consumption/i.test(s))
    if (monthlySheetName) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[monthlySheetName], { header: 1, raw: false, defval: "" }) as unknown[][]
      const extracted = extractMonthlyChemicalCosts(rows)
      if ("error" in extracted) return { fileName: file.name, error: extracted.error }

      // The field team re-saves this same monthly-grid file daily without always updating
      // its own "FOR THE MONTH OF ..." title when the calendar rolls into a new month — seen
      // for real in a batch of Kal-04 files where every file from day 11 through day 30 of
      // July still read "JUNE-2026", silently posting three weeks of July spend under June
      // dates (and double-counting it against the correctly-titled month-end file). Caught
      // here by cross-checking the title's claimed month against the filename's own date
      // (±2 days' grace for legitimate month-boundary saves) instead of trusting the title
      // blindly — a stale title fails the whole file rather than importing under a silently
      // wrong month.
      const fnDate = dateFromFileName(file.name)
      if (fnDate) {
        const fn = new Date(`${fnDate}T00:00:00Z`).getTime()
        const monthStart = Date.UTC(extracted.year, extracted.monthNum - 1, 1)
        const monthEnd = Date.UTC(extracted.year, extracted.monthNum, 0)
        const GRACE_MS = 2 * 24 * 60 * 60 * 1000
        if (fn < monthStart - GRACE_MS || fn > monthEnd + GRACE_MS) {
          return {
            fileName: file.name,
            error: `Sheet title says "FOR THE MONTH OF ${extracted.monthLabel}-${extracted.year}" but the filename date is ${fnDate} — looks like a stale title in this source file. Skipped rather than importing under the wrong month; fix the sheet's title before retrying.`,
          }
        }
      }

      const outRows: DmrImportRow[] = []
      for (const d of extracted.days) {
        if (d.ogdcl !== null) {
          outRows.push({ fileName: file.name, entryDate: d.entryDate, contractor: "OGDCL", sourceLabel: "OGDCL", amount: d.ogdcl, wellName: extracted.wellLabel, remarks: "" })
        }
        if (d.contractor !== null) {
          outRows.push({
            fileName: file.name,
            entryDate: d.entryDate,
            contractor: "MUD_CONTRACTOR",
            sourceLabel: extracted.contractorLabel,
            amount: d.contractor,
            wellName: extracted.wellLabel,
            remarks: "",
          })
        }
      }
      return { rows: outRows, gaps: [] }
    }

    return { fileName: file.name, error: 'No "WBM" or "DATE WISE CONSUMPTION" sheet found in this workbook.' }
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
