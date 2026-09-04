import { AlertTriangle, Upload } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { parseDmrFiles, type DmrContractor, type DmrGap, type DmrImportError, type DmrImportRow } from "@/lib/dmrImport"
import { fmtCurrency } from "@/lib/wellCost"
import { errorMessage } from "@/lib/utils"
import type { WellCostCentre, WellCostTransaction } from "@/types/wellCost"

const CONTRACTOR_LABELS: Record<DmrContractor, string> = {
  MUD_CONTRACTOR: "Mud Contractor",
  OGDCL: "OGDCL",
  SECOND_CONTRACTOR: "Second Contractor",
}
const CONTRACTORS: DmrContractor[] = ["OGDCL", "MUD_CONTRACTOR", "SECOND_CONTRACTOR"]
const SKIP = "__skip__"

type RowStatus = "new" | "duplicate-in-batch" | "already-logged" | "remarks-update" | "unmapped"
type PlanRow = DmrImportRow & { status: RowStatus }

const STOP_WORDS = new Set(["cost", "the", "and"])

/** Source labels and cost centre Vendor fields spell the same names inconsistently across
 *  reports ("Shlumberger" missing the first C, "SWACO" vs. "SAECO" for the same Schlumberger
 *  business unit) — normalized to one spelling on both sides before matching so those
 *  variants don't silently defeat the auto-suggestion below. */
function normalizeVendorWord(w: string): string {
  if (/^sc?hlumberger$/.test(w)) return "schlumberger"
  if (/^swaco$|^saeco$/.test(w)) return "saeco"
  return w
}

/** Turns a batch of parsed rows' free-text source labels (e.g. "HARIS IMTIAZ 03305349738
 *  MIDGARD COST") into keywords a cost centre's Vendor field might match, so the mapping
 *  can be pre-filled — always just a suggestion, never trusted silently (the picker below
 *  is what actually decides). */
function keywordsFrom(rows: DmrImportRow[], contractor: DmrContractor): string[] {
  const words = new Set<string>()
  for (const r of rows) {
    if (r.contractor !== contractor) continue
    for (const w of r.sourceLabel.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/)) {
      if (w.length >= 3 && !STOP_WORDS.has(w)) words.add(normalizeVendorWord(w))
    }
  }
  return Array.from(words)
}

function guessCostCentreId(costCentres: WellCostCentre[], keywords: string[]): string {
  if (!keywords.length) return ""
  const match = costCentres.find((c) => {
    const vendor = (c.vendor || "")
      .toLowerCase()
      .split(/[^a-z]+/)
      .map(normalizeVendorWord)
      .join(" ")
    return keywords.some((k) => vendor.includes(k))
  })
  return match?.id ?? ""
}

export function DmrImportDialog({
  open,
  onOpenChange,
  costCentres,
  wellName,
  wellCode,
  existingEntries,
  createdByName,
  onImport,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Candidate targets for the three contractor slots — every cost centre in the service
   *  category this import was launched from. */
  costCentres: WellCostCentre[]
  wellName: string
  /** The "DATE WISE CONSUMPTION" format's title only carries a short well code/label (e.g.
   *  "KAL-04"), not the well's full display name — checked as an alternative match so that
   *  format doesn't flag every file as a well mismatch. */
  wellCode?: string
  /** Entries already logged for any of `costCentres` (so a re-import doesn't double-post a
   *  day already logged). */
  existingEntries: WellCostTransaction[]
  createdByName: string
  onImport: (rows: WellCostTransaction[]) => void
}) {
  const [parsedRows, setParsedRows] = useState<DmrImportRow[]>([])
  const [gaps, setGaps] = useState<DmrGap[]>([])
  const [errors, setErrors] = useState<DmrImportError[]>([])
  const [busy, setBusy] = useState(false)
  const [fileCount, setFileCount] = useState(0)
  const [mapping, setMapping] = useState<Record<DmrContractor, string>>({ OGDCL: "", MUD_CONTRACTOR: "", SECOND_CONTRACTOR: "" })
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Pre-fill the mapping once from Vendor-field keyword matches, the first time a batch
  // parses — after that the user's own choices (including deliberately clearing one) win.
  useEffect(() => {
    if (!parsedRows.length) return
    setMapping((prev) => {
      if (prev.OGDCL || prev.MUD_CONTRACTOR || prev.SECOND_CONTRACTOR) return prev
      return {
        OGDCL: guessCostCentreId(costCentres, ["ogdcl"]),
        MUD_CONTRACTOR: guessCostCentreId(costCentres, keywordsFrom(parsedRows, "MUD_CONTRACTOR")),
        SECOND_CONTRACTOR: guessCostCentreId(costCentres, keywordsFrom(parsedRows, "SECOND_CONTRACTOR")),
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedRows])

  // Keyed by "costCentreId|entryDate" -> the existing entry, so a re-import can tell a
  // true duplicate (same day already logged, skip it) apart from a day that's already
  // logged but is missing the remarks a newer parse now carries — the source reports don't
  // change their own cost figures between passes, so this never touches amount/notes,
  // only backfills remarks that weren't captured the first time.
  const existingByKey = useMemo(() => {
    const m = new Map<string, WellCostTransaction>()
    for (const e of existingEntries) if (e.kind === "actual") m.set(`${e.costCentreId}|${e.entryDate}`, e)
    return m
  }, [existingEntries])

  const nonZeroRows = useMemo(() => parsedRows.filter((r) => r.amount > 0), [parsedRows])

  const plan = useMemo<PlanRow[]>(() => {
    const sorted = nonZeroRows.slice().sort((a, b) => a.entryDate.localeCompare(b.entryDate) || a.contractor.localeCompare(b.contractor))
    const seen = new Set<string>()
    return sorted.map((r) => {
      const batchKey = `${r.entryDate}|${r.contractor}`
      const targetId = mapping[r.contractor]
      let status: RowStatus
      if (seen.has(batchKey)) status = "duplicate-in-batch"
      else if (!targetId) status = "unmapped"
      else {
        const existing = existingByKey.get(`${targetId}|${r.entryDate}`)
        if (!existing) status = "new"
        else status = !existing.remarks && r.remarks ? "remarks-update" : "already-logged"
      }
      if (status !== "duplicate-in-batch") seen.add(batchKey)
      return { ...r, status }
    })
  }, [nonZeroRows, mapping, existingByKey])

  const importable = plan.filter((r) => r.status === "new" || r.status === "remarks-update")

  function reset() {
    setParsedRows([])
    setGaps([])
    setErrors([])
    setFileCount(0)
    setMapping({ OGDCL: "", MUD_CONTRACTOR: "", SECOND_CONTRACTOR: "" })
  }

  async function handleFiles(files: File[]) {
    setBusy(true)
    setFileCount(files.length)
    try {
      const { rows, gaps: parsedGaps, errors: parseErrors } = await parseDmrFiles(files)
      setParsedRows(rows)
      setGaps(parsedGaps)
      setErrors(parseErrors)
    } catch (e) {
      setErrors([{ fileName: "", error: errorMessage(e, "Could not read the selected files.") }])
    } finally {
      setBusy(false)
    }
  }

  function handleConfirm() {
    const toImport: WellCostTransaction[] = importable.map((r) => {
      if (r.status === "remarks-update") {
        // Same id/amount/notes/creator as the entry already on file — only remarks changes,
        // via the same upsert-by-id path useBulkUpsertWellCostTransactions already uses.
        const existing = existingByKey.get(`${mapping[r.contractor]}|${r.entryDate}`)!
        return { ...existing, remarks: r.remarks }
      }
      return {
        id: crypto.randomUUID(),
        costCentreId: mapping[r.contractor],
        entryDate: r.entryDate,
        kind: "actual",
        amount: r.amount,
        notes: `Imported from ${r.fileName} (${CONTRACTOR_LABELS[r.contractor]}${r.sourceLabel ? `: ${r.sourceLabel}` : ""})`,
        remarks: r.remarks,
        createdByName,
      }
    })
    onImport(toImport)
    reset()
  }

  const mismatchedFiles = parsedRows.filter((r) => {
    if (!r.wellName) return false
    const label = r.wellName.trim().toLowerCase()
    if (label === wellName.trim().toLowerCase()) return false
    if (wellCode && label === wellCode.trim().toLowerCase()) return false
    return true
  })
  const mappedCount = CONTRACTORS.filter((c) => mapping[c]).length
  const newCount = plan.filter((r) => r.status === "new").length
  const remarksUpdateCount = plan.filter((r) => r.status === "remarks-update").length

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset()
        onOpenChange(v)
      }}
    >
      <DialogContent className="max-h-[85vh] w-full overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import Daily Costs from Excel</DialogTitle>
          <DialogDescription>
            Select daily report workbook(s) (.xlsx/.xlsm) — either a "WBM" per-day report (three cost figures per
            day: the mud contractor's own line, OGDCL's, and a second contractor's) or a "DATE WISE CONSUMPTION"
            monthly chemical sheet (two figures per day: OGDCL and the mud contractor). Logged as separate Actual
            entries against whichever cost centre you map each one to below.
          </DialogDescription>
        </DialogHeader>

        {!parsedRows.length && !errors.length ? (
          <div className="grid gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
              className="justify-self-start"
            >
              <Upload /> {busy ? "Reading files…" : "Browse for files…"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xlsm"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? [])
                e.target.value = ""
                if (files.length) handleFiles(files)
              }}
            />
          </div>
        ) : (
          <div className="grid gap-4 text-sm">
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Which cost centre is each figure billed to?
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {CONTRACTORS.map((c) => (
                  <div key={c} className="grid gap-1.5">
                    <Label>{CONTRACTOR_LABELS[c]}</Label>
                    <Select
                      value={mapping[c] || SKIP}
                      onValueChange={(v) => setMapping((prev) => ({ ...prev, [c]: v === SKIP ? "" : v }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={SKIP}>Skip this contractor</SelectItem>
                        {costCentres.map((cc) => (
                          <SelectItem key={cc.id} value={cc.id}>
                            {cc.costCentre}
                            {cc.vendor ? ` — ${cc.vendor}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              {mappedCount === 0 && (
                <p className="mt-1.5 flex items-center gap-1.5 text-status-under">
                  <AlertTriangle className="size-3.5" /> Nothing is mapped yet — pick a cost centre for at least one
                  contractor to import anything.
                </p>
              )}
            </div>

            <div className="rounded-lg border bg-muted/40 p-3">
              <p>
                {fileCount} file{fileCount !== 1 ? "s" : ""} read — {newCount} new entr{newCount !== 1 ? "ies" : "y"}
                {remarksUpdateCount > 0 && <> and {remarksUpdateCount} remarks-only update{remarksUpdateCount !== 1 ? "s" : ""}</>}{" "}
                will be logged.
              </p>
              {mismatchedFiles.length > 0 && (
                <p className="mt-1.5 flex items-center gap-1.5 text-status-under">
                  <AlertTriangle className="size-3.5" /> {mismatchedFiles.length} file{mismatchedFiles.length !== 1 ? "s" : ""}{" "}
                  reference a different well name than "{wellName}" — double-check before importing.
                </p>
              )}
            </div>

            {gaps.length > 0 && (
              <div className="rounded-lg border border-status-under/30 bg-status-under/5 p-3">
                <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-status-under">
                  <AlertTriangle className="size-3.5" /> {gaps.length} day{gaps.length !== 1 ? "s" : ""} had no Daily figure recorded
                  for a contractor — not imported (not guessed from the file's own Cumulative column, which isn't reliable
                  enough to reconstruct a missing day from):
                </p>
                <div className="max-h-32 overflow-y-auto">
                  <ul className="grid gap-0.5 text-xs text-muted-foreground">
                    {gaps
                      .slice()
                      .sort((a, b) => a.entryDate.localeCompare(b.entryDate))
                      .map((g) => (
                        <li key={`${g.fileName}-${g.contractor}`}>
                          {g.entryDate} — {CONTRACTOR_LABELS[g.contractor]} (file showed cumulative {g.cumulativeOnFile})
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            )}

            {errors.length > 0 && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <p className="mb-1 text-xs font-medium text-destructive">{errors.length} file(s) could not be read:</p>
                <ul className="grid gap-0.5 text-xs text-destructive">
                  {errors.map((e) => (
                    <li key={e.fileName}>
                      {e.fileName}: {e.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {plan.length > 0 && (
              <div className="max-h-64 overflow-y-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Contractor</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plan.map((r) => {
                      const target = costCentres.find((c) => c.id === mapping[r.contractor])
                      return (
                        <TableRow key={`${r.fileName}-${r.contractor}`}>
                          <TableCell>{r.entryDate}</TableCell>
                          <TableCell>
                            {CONTRACTOR_LABELS[r.contractor]}
                            {target && <span className="text-muted-foreground"> → {target.costCentre}</span>}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{fmtCurrency(r.amount, target?.currency || "USD")}</TableCell>
                          <TableCell>
                            {r.status === "new" && <Badge variant="secondary">New</Badge>}
                            {r.status === "remarks-update" && <Badge variant="secondary">Remarks will be added</Badge>}
                            {r.status === "duplicate-in-batch" && <Badge variant="outline">Duplicate report — skipped</Badge>}
                            {r.status === "already-logged" && <Badge variant="outline">Already logged — skipped</Badge>}
                            {r.status === "unmapped" && <Badge variant="outline">Not mapped — skipped</Badge>}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            <Button variant="outline" size="sm" onClick={reset} className="justify-self-start">
              Choose different files
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!importable.length}>
            <Upload /> {importable.length ? `Import ${importable.length} entr${importable.length !== 1 ? "ies" : "y"}` : "Nothing to import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
