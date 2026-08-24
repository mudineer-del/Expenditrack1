import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { CompareReportView } from "@/components/reports/CompareReportView"
import { ContractReportView } from "@/components/reports/ContractReportView"
import { PeriodReportView } from "@/components/reports/PeriodReportView"
import { ReportDetailDrawer, type ReportDetail } from "@/components/reports/ReportDetailDrawer"
import { ReportFiltersBar } from "@/components/reports/ReportFiltersBar"
import { buildContractLabels } from "@/lib/contracts"
import {
  BLANK_REPORT_FILTERS,
  downloadCsv,
  groupRows,
  reportRows,
  reportRowsToCsv,
  shortContract,
  turnaroundDays,
  yearsInData,
  type ReportFilters,
  type ReportMode,
} from "@/lib/reports"
import { useReferenceLists } from "@/lib/referenceLists"
import { useAppStore } from "@/store/useAppStore"
import { useContractsQuery } from "@/hooks/useContracts"
import { useInvoicesQuery } from "@/hooks/useInvoices"

const MODE_TABS: { key: ReportMode; label: string }[] = [
  { key: "contract", label: "Contract report" },
  { key: "compare", label: "Compare contracts" },
  { key: "period", label: "Period analysis" },
]

/** Ported from renderReports and its 3 sub-modes (index.html:4375-4703). */
export default function ReportsPage() {
  const invoicesQuery = useInvoicesQuery()
  const contractsQuery = useContractsQuery()
  const { ref: refLists } = useReferenceLists()

  const [mode, setMode] = useState<ReportMode>("contract")
  const [filters, setFilters] = useState<ReportFilters>(BLANK_REPORT_FILTERS)
  const [compareSelection, setCompareSelection] = useState<string[]>([])
  const [detail, setDetail] = useState<ReportDetail | null>(null)

  const activeDept = useAppStore((s) => s.activeDept)
  const allInvoices = invoicesQuery.data ?? []
  const allContracts = contractsQuery.data ?? []
  // Scoped to the sidebar/dashboard's active department, same pattern as the Dashboard.
  const invoices = activeDept === "ALL" ? allInvoices : allInvoices.filter((r) => r.department === activeDept)
  const contracts = activeDept === "ALL" ? allContracts : allContracts.filter((c) => c.department === activeDept)

  const contractNumbers = Array.from(
    new Set([...contracts.map((c) => c.contractNo), ...invoices.map((r) => (r.contractNo || "").trim()).filter(Boolean)])
  ).sort()
  const contractLabels = buildContractLabels(contractNumbers, contracts, invoices)
  const yearOptions = yearsInData(invoices)
  // The "wells" reference list starts empty and is rarely (if ever) hand-populated by an
  // Admin, unlike vendors/services — so derive well options from actual invoice data
  // instead, same as contractNumbers/yearOptions above.
  const wellOptions = Array.from(new Set(invoices.map((r) => r.wellName).filter(Boolean))).sort()

  function openDrill(rows: typeof invoices, title: string) {
    setDetail({ title, rows })
  }

  function exportCsv() {
    if (mode === "contract") {
      const rows = reportRows(invoices, filters)
      const csv = reportRowsToCsv(
        ["Sr", "Invoice No", "Contractor", "Contract", "Well", "Invoice Date", "Clearance Date", "TA (days)", "Excl Tax", "Tax", "Incl Tax", "Paid", "Status"],
        rows.map((r) => [
          r.srNo, r.invoiceNo, r.vendor, r.contractNo, r.wellName, r.invoiceDate, r.clearanceDate,
          turnaroundDays(r) ?? "", r.amountExclTax || 0, r.tax || 0, r.amountInclTax || 0, r.amountPaid || 0, r.status,
        ])
      )
      downloadCsv(`contract-report-${filters.contract || "all"}.csv`, csv)
    } else if (mode === "compare") {
      const rows = reportRows(invoices, filters)
      const allGroups = groupRows(rows, "contract").sort((a, b) => b.incl - a.incl)
      const showNone = compareSelection.includes("__none__")
      const selected = compareSelection.filter((x) => x !== "__none__")
      const groups = showNone ? [] : selected.length ? allGroups.filter((g) => selected.includes(g.key)) : allGroups
      const csv = reportRowsToCsv(
        ["Contract", "Invoices", "Excl Tax", "Incl Tax", "Paid", "Outstanding", "Avg TA (days)", "Delayed"],
        groups.map((g) => [shortContract(g.key), g.count, g.exclTax, g.incl, g.paid, g.outstanding, g.taAvg !== null ? Math.round(g.taAvg) : "", g.delayed])
      )
      downloadCsv("contract-comparison.csv", csv)
    } else {
      const rows = reportRows(invoices, filters)
      const groups = groupRows(rows, filters.groupBy)
      const csv = reportRowsToCsv(
        [filters.groupBy, "Invoices", "Excl Tax", "Tax", "Incl Tax", "Paid", "Outstanding", "Avg TA (days)", "Delayed"],
        groups.map((g) => [g.key, g.count, g.exclTax, g.tax, g.incl, g.paid, g.outstanding, g.taAvg !== null ? Math.round(g.taAvg) : "", g.delayed])
      )
      downloadCsv(`period-report-${filters.groupBy}.csv`, csv)
    }
  }

  if (invoicesQuery.isLoading || contractsQuery.isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  if (invoicesQuery.isError || contractsQuery.isError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        Could not load reports. Check your connection to Supabase in Settings → Cloud Sync.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="rounded-lg border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">Financial Reporting</h3>
          <div className="flex max-w-full gap-1 overflow-x-auto rounded-lg border bg-muted/50 p-1">
            {MODE_TABS.map((t) => (
              <Button
                key={t.key}
                size="sm"
                variant={mode === t.key ? "default" : "ghost"}
                className="shrink-0"
                onClick={() => setMode(t.key)}
              >
                {t.label}
              </Button>
            ))}
          </div>
        </div>
        <ReportFiltersBar
          mode={mode}
          filters={filters}
          onFiltersChange={setFilters}
          refLists={refLists}
          contractNumbers={contractNumbers}
          contractLabels={contractLabels}
          yearOptions={yearOptions}
          wellOptions={wellOptions}
          onExportCsv={exportCsv}
        />
      </div>

      {mode === "contract" && <ContractReportView invoices={invoices} contracts={contracts} filters={filters} onDrill={openDrill} />}
      {mode === "compare" && (
        <CompareReportView
          invoices={invoices}
          filters={filters}
          compareSelection={compareSelection}
          onCompareSelectionChange={setCompareSelection}
          onDrill={openDrill}
        />
      )}
      {mode === "period" && <PeriodReportView invoices={invoices} filters={filters} onDrill={openDrill} />}

      <ReportDetailDrawer detail={detail} onOpenChange={(v) => !v && setDetail(null)} />
    </div>
  )
}
