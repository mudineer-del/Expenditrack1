import type { ActivityEntry } from "@/store/useActivityStore"
import type { Contract } from "@/types/contract"
import type { Invoice } from "@/types/invoice"
import { DEFAULT_REF, type ReferenceLists } from "@/lib/referenceLists"

/** Ported from buildBackup/downloadBackup (index.html:1707-1739). Drops the
 *  legacy `users`/`appLabels`/`appTheme` fields — there's no separate users
 *  table (role lives in Supabase Auth metadata), and the labels/theme
 *  customization UI was deliberately not ported (see Phase 7 notes). */
export const BACKUP_VERSION = 1

export interface Backup {
  app: string
  backupVersion: number
  exportedAt: string
  exportedBy: string
  counts: { invoices: number; contracts: number }
  data: {
    invoices: Invoice[]
    contracts: Contract[]
    refLists: ReferenceLists
    activityLog: ActivityEntry[]
  }
}

export function buildBackup(
  invoices: Invoice[],
  contracts: Contract[],
  refLists: ReferenceLists,
  activityLog: ActivityEntry[],
  exportedBy: string
): Backup {
  return {
    app: "OGDCL Expenditure & Invoice Tracker",
    backupVersion: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    exportedBy,
    counts: { invoices: invoices.length, contracts: contracts.length },
    data: { invoices, contracts, refLists, activityLog },
  }
}

export function downloadBackup(backup: Backup): void {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  const d = new Date()
  const stamp =
    d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0") +
    "-" + String(d.getHours()).padStart(2, "0") + String(d.getMinutes()).padStart(2, "0")
  a.href = url
  a.download = `OGDCL_Tracker_Backup_${stamp}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function parseBackupFile(text: string): Backup | null {
  try {
    const b = JSON.parse(text) as Partial<Backup>
    if (!b?.data || !Array.isArray(b.data.invoices)) return null
    return {
      app: b.app || "",
      backupVersion: b.backupVersion || 1,
      exportedAt: b.exportedAt || "",
      exportedBy: b.exportedBy || "",
      counts: b.counts || { invoices: b.data.invoices.length, contracts: b.data.contracts?.length || 0 },
      data: {
        invoices: b.data.invoices,
        contracts: Array.isArray(b.data.contracts) ? b.data.contracts : [],
        refLists: b.data.refLists ? { ...DEFAULT_REF, ...b.data.refLists } : DEFAULT_REF,
        activityLog: Array.isArray(b.data.activityLog) ? b.data.activityLog : [],
      },
    }
  } catch {
    return null
  }
}
