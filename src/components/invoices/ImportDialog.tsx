import { AlertTriangle, RefreshCw, Upload } from "lucide-react"
import { useMemo, useRef, useState } from "react"
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
import {
  finalizeImportedRecord,
  invoiceDupKey,
  mapImportedRows,
  mergeMissingFields,
  parseImportFile,
  type ImportedRecord,
} from "@/lib/invoiceIO"
import { errorMessage } from "@/lib/utils"
import type { Invoice } from "@/types/invoice"

export function ImportDialog({
  open,
  onOpenChange,
  existingInvoices,
  onImport,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingInvoices: Invoice[]
  onImport: (invoices: Invoice[]) => void
}) {
  const [fileName, setFileName] = useState("")
  const [records, setRecords] = useState<ImportedRecord[]>([])
  const [unmatched, setUnmatched] = useState<string[]>([])
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const existingByKey = useMemo(() => {
    const map = new Map<string, Invoice>()
    for (const inv of existingInvoices) map.set(invoiceDupKey(inv), inv)
    return map
  }, [existingInvoices])

  // Every matched row either fills in missing details on the existing invoice
  // (update) or already has everything the file offers (unchanged — skipped
  // outright rather than re-saved). Unmatched rows import as new invoices.
  const plan = useMemo(() => {
    const fresh: ImportedRecord[] = []
    const updates: Array<{ invoice: Invoice; filledFields: Array<keyof Invoice> }> = []
    let unchangedCount = 0
    for (const r of records) {
      const existing = existingByKey.get(invoiceDupKey(r))
      if (!existing) {
        fresh.push(r)
        continue
      }
      const merged = mergeMissingFields(existing, r)
      if (merged.filledFields.length) updates.push(merged)
      else unchangedCount++
    }
    return { fresh, updates, unchangedCount }
  }, [records, existingByKey])

  function reset() {
    setFileName("")
    setRecords([])
    setUnmatched([])
    setError("")
  }

  async function handleFile(file: File) {
    setError("")
    setFileName(file.name)
    try {
      const matrix = await parseImportFile(file)
      const { records: mapped, unmatched: unmatchedHeaders } = mapImportedRows(matrix)
      if (!mapped.length) {
        setError("No recognizable invoice rows found in this file.")
        setRecords([])
        return
      }
      setRecords(mapped)
      setUnmatched(unmatchedHeaders)
    } catch (e) {
      setError(errorMessage(e, "Could not read this file."))
      setRecords([])
    }
  }

  function handleConfirm() {
    setBusy(true)
    const maxSr = existingInvoices.reduce((m, r) => Math.max(m, Number(r.srNo) || 0), 0)
    let srNoCounter = maxSr
    const nextSrNo = () => ++srNoCounter
    const toSave: Invoice[] = [
      ...plan.fresh.map((r) => finalizeImportedRecord(r, nextSrNo)),
      ...plan.updates.map((u) => u.invoice),
    ]
    onImport(toSave)
    setBusy(false)
    reset()
    onOpenChange(false)
  }

  const total = records.length
  const nothingToDo = total > 0 && !plan.fresh.length && !plan.updates.length

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset()
        onOpenChange(v)
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import / Update Invoices</DialogTitle>
          <DialogDescription>
            Import from a CSV or Excel (.xlsx/.xls) file. Rows matching an existing invoice (same vendor,
            invoice no., and amount) fill in missing details instead of creating a duplicate.
          </DialogDescription>
        </DialogHeader>

        {!records.length ? (
          <div className="grid gap-3">
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="justify-self-start">
              <Upload /> Browse for file…
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ""
                if (file) handleFile(file)
              }}
            />
            {error && (
              <p className="flex items-center gap-1.5 text-sm text-destructive">
                <AlertTriangle className="size-4" /> {error}
              </p>
            )}
          </div>
        ) : (
          <div className="grid gap-3 text-sm">
            <div className="rounded-lg border bg-muted/40 p-3">
              <p>
                <b>{fileName}</b> — {total} row{total !== 1 ? "s" : ""} recognized.
              </p>
              <ul className="mt-1.5 grid gap-1 text-muted-foreground">
                {plan.fresh.length > 0 && (
                  <li className="flex items-center gap-1.5">
                    <Upload className="size-3.5 text-primary" />
                    {plan.fresh.length} new invoice{plan.fresh.length !== 1 ? "s" : ""} will be added.
                  </li>
                )}
                {plan.updates.length > 0 && (
                  <li className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                    <RefreshCw className="size-3.5" />
                    {plan.updates.length} existing invoice{plan.updates.length !== 1 ? "s" : ""} will be
                    updated with missing details (nothing already filled in gets overwritten).
                  </li>
                )}
                {plan.unchangedCount > 0 && (
                  <li className="flex items-center gap-1.5">
                    <AlertTriangle className="size-3.5" />
                    {plan.unchangedCount} row{plan.unchangedCount !== 1 ? "s" : ""} already match an existing
                    invoice with nothing new to add — skipped.
                  </li>
                )}
              </ul>
            </div>
            {unmatched.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                  Columns not recognized (ignored):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {unmatched.map((h) => (
                    <Badge key={h} variant="secondary">
                      {h}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={reset} className="justify-self-start">
              Choose a different file
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!records.length || busy || nothingToDo}>
            <Upload />
            {plan.fresh.length > 0 && plan.updates.length > 0
              ? `Import ${plan.fresh.length} & update ${plan.updates.length}`
              : plan.updates.length > 0
                ? `Update ${plan.updates.length} invoice${plan.updates.length !== 1 ? "s" : ""}`
                : plan.fresh.length > 0
                  ? `Import ${plan.fresh.length} invoice${plan.fresh.length !== 1 ? "s" : ""}`
                  : "Nothing to import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
