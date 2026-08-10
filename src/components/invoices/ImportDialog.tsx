import { AlertTriangle, Upload } from "lucide-react"
import { useState } from "react"
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
import { Input } from "@/components/ui/input"
import {
  finalizeImportedRecord,
  invoiceDupKey,
  mapImportedRows,
  parseImportFile,
  type ImportedRecord,
} from "@/lib/invoiceIO"
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

  const existingKeys = new Set(existingInvoices.map(invoiceDupKey))
  const dupCount = records.filter((r) => existingKeys.has(invoiceDupKey(r))).length

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
      setError(e instanceof Error ? e.message : "Could not read this file.")
      setRecords([])
    }
  }

  function handleConfirm() {
    setBusy(true)
    const maxSr = existingInvoices.reduce((m, r) => Math.max(m, Number(r.srNo) || 0), 0)
    let srNoCounter = maxSr
    const nextSrNo = () => ++srNoCounter
    const finalized = records.map((r) => finalizeImportedRecord(r, nextSrNo))
    onImport(finalized)
    setBusy(false)
    reset()
    onOpenChange(false)
  }

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
          <DialogTitle>Import Invoices</DialogTitle>
          <DialogDescription>Import from a CSV or Excel (.xlsx/.xls) file.</DialogDescription>
        </DialogHeader>

        {!records.length ? (
          <div className="grid gap-3">
            <Input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
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
                <b>{fileName}</b> — {records.length} row{records.length !== 1 ? "s" : ""} recognized.
              </p>
              {dupCount > 0 && (
                <p className="mt-1 flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="size-4" /> {dupCount} row{dupCount !== 1 ? "s" : ""} match an existing invoice
                  (same vendor, invoice no., and amount) — importing will add them as new entries anyway.
                </p>
              )}
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
          <Button onClick={handleConfirm} disabled={!records.length || busy}>
            <Upload /> Import {records.length ? `${records.length} invoices` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
