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
  collapseImportedDuplicates,
  finalizeImportedRecord,
  findExistingForImport,
  importFieldLabel,
  invoiceDupKey,
  mapImportedRows,
  mergeMissingFields,
  parseImportFile,
  vendorInvoiceKey,
  type ImportedRecord,
  type ImportHeaderMapping,
} from "@/lib/invoiceIO"
import { errorMessage } from "@/lib/utils"
import type { Invoice } from "@/types/invoice"

/** Every column detected in the source file — its title, what it was read as (or "Not
 *  recognized" if nothing matched), and every value under it — so an Admin can review the
 *  actual content column by column before importing, instead of finding out something
 *  silently mapped wrong or got skipped afterward. */
function HeaderMapTable({ headerMap }: { headerMap: ImportHeaderMapping[] }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">
        Every column found in that file, with its content — check where each one is going before importing:
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {headerMap.map((h, i) => (
          <div key={`${h.raw}-${i}`} className="grid content-start gap-1.5 rounded-lg border p-2.5">
            <span className="truncate text-xs font-semibold" title={h.raw}>
              {h.raw}
            </span>
            {h.field ? (
              <Badge variant="secondary" className="justify-self-start">
                {importFieldLabel(h.field)}
              </Badge>
            ) : (
              <span className="flex items-center gap-1 text-[11px] text-status-under">
                <AlertTriangle className="size-3" /> Not recognized — ignored
              </span>
            )}
            <div className="max-h-32 overflow-y-auto rounded border bg-muted/30 p-1.5 text-[11px] leading-snug text-muted-foreground">
              {h.values.length ? (
                h.values.map((v, vi) => (
                  <div key={vi} className="truncate" title={v}>
                    {v}
                  </div>
                ))
              ) : (
                <span className="italic">No values</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

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
  const [headerMap, setHeaderMap] = useState<ImportHeaderMapping[]>([])
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const existingByKey = useMemo(() => {
    const map = new Map<string, Invoice>()
    for (const inv of existingInvoices) map.set(invoiceDupKey(inv), inv)
    return map
  }, [existingInvoices])

  const existingByVendorInvoice = useMemo(() => {
    const map = new Map<string, Invoice>()
    for (const inv of existingInvoices) map.set(vendorInvoiceKey(inv), inv)
    return map
  }, [existingInvoices])

  // A row never becomes a second copy of an invoice: rows repeated inside the file are
  // collapsed first, then each one either updates the matching existing invoice with
  // whatever it can newly fill in, or (nothing new to add) is skipped outright. Only rows
  // matching no existing invoice import as new.
  const plan = useMemo(() => {
    const { records: unique, collapsed } = collapseImportedDuplicates(records)
    const fresh: ImportedRecord[] = []
    const updatedById = new Map<string, { invoice: Invoice; filledFields: Array<keyof Invoice> }>()
    let unchangedCount = 0
    for (const r of unique) {
      const existing = findExistingForImport(r, existingByKey, existingByVendorInvoice)
      if (!existing) {
        fresh.push(r)
        continue
      }
      const prior = updatedById.get(existing.id)
      const merged = mergeMissingFields(prior?.invoice ?? existing, r)
      if (!merged.filledFields.length) {
        unchangedCount++
        continue
      }
      updatedById.set(existing.id, {
        invoice: merged.invoice,
        filledFields: [...(prior?.filledFields ?? []), ...merged.filledFields],
      })
    }
    return { fresh, updates: Array.from(updatedById.values()), unchangedCount, collapsed }
  }, [records, existingByKey, existingByVendorInvoice])

  function reset() {
    setFileName("")
    setRecords([])
    setHeaderMap([])
    setError("")
  }

  async function handleFile(file: File) {
    setError("")
    setFileName(file.name)
    try {
      const matrix = await parseImportFile(file)
      const { records: mapped, headerMap: mapping } = mapImportedRows(matrix)
      if (!mapped.length) {
        setError("No recognizable invoice rows found in this file.")
        setRecords([])
        setHeaderMap(mapping)
        return
      }
      setRecords(mapped)
      setHeaderMap(mapping)
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
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl">
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
            {headerMap.length > 0 && <HeaderMapTable headerMap={headerMap} />}
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
                  <li className="flex items-center gap-1.5 text-status-under">
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
                {plan.collapsed > 0 && (
                  <li className="flex items-center gap-1.5">
                    <AlertTriangle className="size-3.5" />
                    {plan.collapsed} row{plan.collapsed !== 1 ? "s" : ""} repeated an invoice already listed in
                    this file — merged into one instead of added twice.
                  </li>
                )}
              </ul>
            </div>
            {headerMap.length > 0 && <HeaderMapTable headerMap={headerMap} />}
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

