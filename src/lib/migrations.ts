import { getSupabaseClient } from "@/lib/supabase"
import { storeGet, storeSet } from "@/lib/localCache"
import { toRow, type Invoice } from "@/types/invoice"

/**
 * One-time, idempotent data fixes ported from the legacy app's init()
 * (index.html:2059-2124). Each is gated by a localStorage flag so it only
 * ever runs once per browser. Only the generic shape-fixes are ported —
 * the legacy app's `migration_capitalCommitment2026` was a one-off business
 * data seed (merging in details from a specific 2025 capital-commitment
 * letter into a *local-only* contracts list) tied to a historical event
 * that predates this rewrite; the live Supabase `contracts` table should
 * already reflect it by now. Worth a quick manual check in the new
 * Vendors & Contracts page (Phase 4) rather than porting that one-off seed.
 */

interface Migration {
  key: string
  run: (invoices: Invoice[]) => { invoices: Invoice[]; changed: boolean }
}

const migrations: Migration[] = [
  {
    key: "migration_paidFromExcl",
    run: (invoices) => {
      let changed = false
      const next = invoices.map((inv) => {
        const paid = inv.amountPaid
        const isZeroOrBlank = paid === 0 || paid === null || paid === undefined || paid === ""
        if (isZeroOrBlank && typeof inv.amountExclTax === "number") {
          changed = true
          return { ...inv, amountPaid: inv.amountExclTax }
        }
        return inv
      })
      return { invoices: next, changed }
    },
  },
  {
    key: "migration_paidStatusCleared",
    run: (invoices) => {
      let changed = false
      const next = invoices.map((inv) => {
        const p = inv.amountPaid
        if (typeof p === "number" && p > 0) {
          const cur = typeof inv.status === "string" ? inv.status.trim() : inv.status
          if (cur === "Cleared with Deduction") return inv
          if (cur !== "Cleared") {
            changed = true
            return { ...inv, status: "Cleared" }
          }
        }
        return inv
      })
      return { invoices: next, changed }
    },
  },
  {
    key: "migration_reseqSrNo2026",
    run: (invoices) => {
      const seen = new Set<number | "">()
      let needsFix = false
      invoices.forEach((inv) => {
        const n = inv.srNo
        if (n === null || n === undefined || n === "" || seen.has(n)) needsFix = true
        seen.add(n)
      })
      if (!needsFix) {
        const n = invoices.length
        for (let i = 1; i <= n; ++i) {
          if (!seen.has(i)) {
            needsFix = true
            break
          }
        }
      }
      if (!needsFix) return { invoices, changed: false }
      const resequenced = invoices
        .slice()
        .sort((a, b) => {
          const an = Number(a.srNo)
          const bn = Number(b.srNo)
          const aOk = Number.isFinite(an)
          const bOk = Number.isFinite(bn)
          if (aOk && bOk && an !== bn) return an - bn
          if (aOk && !bOk) return -1
          if (!aOk && bOk) return 1
          return String(a.id).localeCompare(String(b.id))
        })
        .map((inv, i) => ({ ...inv, srNo: i + 1 }))
      return { invoices: resequenced, changed: true }
    },
  },
]

/** Runs any not-yet-applied migrations and pushes changed rows back to Supabase. */
export async function runInvoiceMigrations(invoices: Invoice[]): Promise<Invoice[]> {
  let current = invoices
  for (const m of migrations) {
    if (storeGet<boolean>(m.key)) continue
    const result = m.run(current)
    current = result.invoices
    if (result.changed) {
      const changedRows = current.filter((inv, i) => inv !== invoices[i])
      if (changedRows.length > 0) {
        const supabase = getSupabaseClient()
        const rows = changedRows.map(toRow)
        const chunk = 200
        for (let i = 0; i < rows.length; i += chunk) {
          const { error } = await supabase
            .from("invoices")
            .upsert(rows.slice(i, i + chunk), { onConflict: "id" })
          if (error) {
            console.error(`Migration ${m.key} failed to persist:`, error)
            break
          }
        }
      }
    }
    storeSet(m.key, true)
  }
  return current
}
