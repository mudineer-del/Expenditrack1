import { Download, Upload } from "lucide-react"
import { useRef, useState } from "react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { buildBackup, downloadBackup, parseBackupFile, type Backup } from "@/lib/backup"
import { saveStandaloneAppAsHtml } from "@/lib/singlefileExport"
import { useAuth } from "@/hooks/useAuth"
import { useRestoreBackup } from "@/hooks/useBackup"
import { useContractsQuery } from "@/hooks/useContracts"
import { useInvoicesQuery } from "@/hooks/useInvoices"
import { useReferenceLists } from "@/lib/referenceLists"
import { useActivityStore } from "@/store/useActivityStore"

/** Ported from the Data & Backup settings tab (index.html:5448-5493). */
export function BackupTab() {
  const { user } = useAuth()
  const invoicesQuery = useInvoicesQuery()
  const contractsQuery = useContractsQuery()
  const { ref: refLists } = useReferenceLists()
  const log = useActivityStore((s) => s.log)
  const restoreBackup = useRestoreBackup()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingRestore, setPendingRestore] = useState<Backup | null>(null)
  const [savingHtml, setSavingHtml] = useState(false)

  function handleDownloadBackup() {
    const backup = buildBackup(invoicesQuery.data ?? [], contractsQuery.data ?? [], refLists, log, user?.email || "unknown")
    downloadBackup(backup)
    toast.success(`Backup downloaded — ${backup.counts.invoices} invoices.`)
  }

  async function handleSaveHtml() {
    setSavingHtml(true)
    const r = await saveStandaloneAppAsHtml()
    setSavingHtml(false)
    if (r.ok) toast.success(`Saved standalone app copy${r.savedTo ? ` — ${r.savedTo}` : ""}.`)
    else toast.error(r.error || "Save to HTML failed.")
  }

  async function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    const text = await file.text()
    const backup = parseBackupFile(text)
    if (!backup) {
      toast.error("That file is not a valid tracker backup.")
      return
    }
    setPendingRestore(backup)
  }

  function confirmRestore() {
    if (!pendingRestore) return
    restoreBackup.mutate(pendingRestore, {
      onSuccess: () => toast.success(`Restored ${pendingRestore.data.invoices.length} invoices from backup.`),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Restore failed."),
    })
    setPendingRestore(null)
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-4 text-sm font-semibold">Backup &amp; Restore</h3>
        <div className="divide-y">
          <div className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <div className="font-medium">Download a full backup</div>
              <p className="text-sm text-muted-foreground">All invoices, contracts, reference lists and the activity log in one file.</p>
            </div>
            <Button onClick={handleDownloadBackup}>
              <Download /> Download backup
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <div className="font-medium">Save a standalone copy of the app</div>
              <p className="text-sm text-muted-foreground">
                A single self-contained HTML file that opens with no server or hosting needed — signs in and shows
                live data, same as the deployed site.
              </p>
            </div>
            <Button onClick={handleSaveHtml} disabled={savingHtml}>
              <Download /> {savingHtml ? "Saving…" : "Save to File"}
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <div className="font-medium">Restore from a backup</div>
              <p className="text-sm text-muted-foreground">
                Replaces all current invoices, contracts and reference lists with the contents of the backup file.
                You can undo this straight after.
              </p>
            </div>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload /> Choose backup file…
            </Button>
            <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleFileChosen} />
          </div>
        </div>
        <p className="mt-4 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
          Keep backups on OneDrive or a network drive so they are safe if this machine is lost.
        </p>
      </div>

      <AlertDialog open={!!pendingRestore} onOpenChange={(v) => !v && setPendingRestore(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this backup?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRestore &&
                `This will replace all current data with the backup from ${pendingRestore.exportedAt ? pendingRestore.exportedAt.slice(0, 10) : "an unknown date"} (${pendingRestore.data.invoices.length} invoices, ${pendingRestore.data.contracts.length} contracts). You can undo this from Activity Log afterward.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRestore}>Restore</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
