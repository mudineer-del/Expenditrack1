// Read-only Supabase data export for the automated backup workflow
// (.github/workflows/backup.yml). Uses the service-role key so it can read
// every row regardless of RLS — never expose that key outside GitHub Actions
// secrets. Writes one JSON file with a raw dump of each table; deliberately
// NOT the same shape as src/lib/backup.ts's in-app Backup format (that one
// is coupled to the app's camelCase Invoice/Contract types and is meant for
// a human clicking "Download backup" in Settings) — a raw table-shaped dump
// is the more robust disaster-recovery artifact and doesn't drift if the
// app's internal mapping functions change.
import { createClient } from "@supabase/supabase-js"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const OUT_DIR = process.env.BACKUP_OUT_DIR || "./out"

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const PAGE_SIZE = 1000

/** Paginates through a table's full contents — invoices alone can exceed a
 *  single page, and this stays correct even as any table grows past 1000 rows. */
async function fetchAllRows(table, orderColumn = "id") {
  const all = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order(orderColumn, { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(`Fetching "${table}" failed: ${error.message}`)
    const batch = data ?? []
    all.push(...batch)
    if (batch.length < PAGE_SIZE) break
  }
  return all
}

async function main() {
  const [
    invoices,
    contracts,
    referenceLists,
    activityLog,
    wells,
    wellCostDepartments,
    wellCostServiceCategories,
    wellDepartments,
    wellCostCentres,
    wellCostTransactions,
  ] = await Promise.all([
    fetchAllRows("invoices", "sr_no"),
    fetchAllRows("contracts", "id"),
    fetchAllRows("reference_lists", "key"),
    fetchAllRows("activity_log", "ts"),
    fetchAllRows("wells", "id"),
    fetchAllRows("well_cost_departments", "id"),
    fetchAllRows("well_cost_service_categories", "id"),
    fetchAllRows("well_departments", "id"),
    fetchAllRows("well_cost_centres", "id"),
    fetchAllRows("well_cost_transactions", "id"),
  ])

  const exportedAt = new Date().toISOString()
  const tables = {
    invoices,
    contracts,
    referenceLists,
    activityLog,
    wells,
    wellCostDepartments,
    wellCostServiceCategories,
    wellDepartments,
    wellCostCentres,
    wellCostTransactions,
  }
  const backup = {
    app: "OGDCL Expenditure & Invoice Tracker",
    kind: "raw-table-dump",
    exportedAt,
    counts: Object.fromEntries(Object.entries(tables).map(([name, rows]) => [name, rows.length])),
    tables,
  }

  await mkdir(OUT_DIR, { recursive: true })
  const stamp = exportedAt.replace(/[:.]/g, "-")
  const outPath = path.join(OUT_DIR, `backup-${stamp}.json`)
  await writeFile(outPath, JSON.stringify(backup, null, 2))

  console.log(`Wrote ${outPath}`)
  console.log(
    `invoices=${invoices.length} contracts=${contracts.length} referenceLists=${referenceLists.length} activityLog=${activityLog.length}`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
