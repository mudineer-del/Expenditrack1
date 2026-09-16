import { CheckCircle2, Copy, Download, List, Plus, Trash2, Upload, Wallet } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { DuplicateFinderDialog } from "@/components/invoices/DuplicateFinderDialog"
import { ImportDialog } from "@/components/invoices/ImportDialog"
import { InvoiceDetailSheet } from "@/components/invoices/InvoiceDetailSheet"
import { InvoiceDrawer } from "@/components/invoices/InvoiceDrawer"
import { InvoiceFiltersBar } from "@/components/invoices/InvoiceFiltersBar"
import { InvoicesTable } from "@/components/invoices/InvoicesTable"
import { SelectionToolbar } from "@/components/shared/SelectionToolbar"
import { buildContractLabels, buildContractVendorMap } from "@/lib/contracts"
import { fmtMoney } from "@/lib/dashboard"
import { BLANK_FILTERS, filterAndSortInvoices, type SortState } from "@/lib/invoiceFilters"
import { exportInvoicesCsv, exportInvoicesXlsx, invoiceDupKey } from "@/lib/invoiceIO"
import { useContractorLogosQuery } from "@/lib/contractorLogos"
import { useReferenceLists } from "@/lib/referenceLists"
import { errorMessage } from "@/lib/utils"
import { useAppStore } from "@/store/useAppStore"
import { useAuth } from "@/hooks/useAuth"
import { useContractsQuery } from "@/hooks/useContracts"
import {
  useBulkUpsertInvoices,
  useDeleteInvoice,
  useDeleteInvoices,
  useInvoicesQuery,
  useUpsertInvoice,
} from "@/hooks/useInvoices"
import { invoiceYear, type Invoice } from "@/types/invoice"

const PAGE_SIZES = [25, 50, 75, 100]

type DrawerMode = "add" | "edit" | "view"

export default function InvoicesPage() {
  const { can } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const invoicesQuery = useInvoicesQuery()
  const contractsQuery = useContractsQuery()
  const { ref: refLists } = useReferenceLists()
  const contractorLogosQuery = useContractorLogosQuery()
  const upsertInvoice = useUpsertInvoice()
  const deleteInvoice = useDeleteInvoice()
  const deleteInvoices = useDeleteInvoices()
  const bulkUpsert = useBulkUpsertInvoices()

  const [filters, setFilters] = useState(BLANK_FILTERS)
  const [sort, setSort] = useState<SortState>({ key: "srNo", dir: "asc" })
  const [pageNum, setPageNum] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("add")
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null)
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [dupFinderOpen, setDupFinderOpen] = useState(false)
  const [dupWarning, setDupWarning] = useState<{ record: Invoice; existing: Invoice } | null>(null)

  const activeDept = useAppStore((s) => s.activeDept)
  const allInvoices = invoicesQuery.data ?? []
  const allContracts = contractsQuery.data ?? []
  // Scoped to the sidebar/dashboard's active department — same client-side filter pattern
  // used everywhere else in the app (dashVendor on the Dashboard).
  const invoices = useMemo(
    () => (activeDept === "ALL" ? allInvoices : allInvoices.filter((r) => r.department === activeDept)),
    [allInvoices, activeDept]
  )
  const contracts = useMemo(
    () => (activeDept === "ALL" ? allContracts : allContracts.filter((c) => c.department === activeDept)),
    [allContracts, activeDept]
  )

  const contractNumbers = useMemo(() => {
    const known = contracts.map((c) => c.contractNo)
    const fromData = Array.from(new Set(invoices.map((r) => (r.contractNo || "").trim()).filter(Boolean)))
    return Array.from(new Set([...known, ...fromData])).sort()
  }, [contracts, invoices])

  const contractLabels = useMemo(
    () => buildContractLabels(contractNumbers, contracts, invoices),
    [contractNumbers, contracts, invoices]
  )

  // contractNo -> vendor, so the invoice entry form can narrow the Contract No. dropdown
  // down to just the contracts that belong to whichever vendor is selected.
  const contractVendorMap = useMemo(() => buildContractVendorMap(contracts, invoices), [contracts, invoices])

  const yearOptions = useMemo(
    () => Array.from(new Set(invoices.map(invoiceYear).filter(Boolean))).sort(),
    [invoices]
  )

  const enteredByOptions = useMemo(
    () => Array.from(new Set(invoices.map((r) => r.createdByName).filter((n): n is string => !!n))).sort(),
    [invoices]
  )

  const filteredRows = useMemo(() => filterAndSortInvoices(invoices, filters, sort), [invoices, filters, sort])
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const clampedPage = Math.min(pageNum, totalPages)
  const startIdx = (clampedPage - 1) * pageSize
  const pageRows = filteredRows.slice(startIdx, startIdx + pageSize)

  const sumIncl = filteredRows.reduce((s, r) => s + (Number(r.amountInclTax) || 0), 0)
  const sumPaid = filteredRows.reduce((s, r) => s + (Number(r.amountPaid) || 0), 0)
  const clearedN = filteredRows.filter((r) => (r.status || "").toLowerCase().includes("cleared")).length
  const hasFilter = filters.q || filters.vendor || filters.service || filters.status || filters.region || filters.year || filters.qtr || filters.contract

  const canBulk = can("delete")

  function openAdd() {
    setDrawerMode("add")
    setEditingInvoice(null)
    setDrawerOpen(true)
  }
  function openView(inv: Invoice) {
    setDetailInvoice(inv)
  }
  function openEdit(inv: Invoice) {
    setDrawerMode("edit")
    setEditingInvoice(inv)
    setDrawerOpen(true)
  }

  // Deep-link support: Dashboard's Recent Invoices rows (and the command palette) navigate
  // here with { openInvoiceId } in router state to jump straight to that invoice; the
  // header's quick-add button navigates here with { openAdd: true } to open a blank one;
  // VendorDetailSheet's "View all invoices" navigates here with { vendorFilter } to land
  // pre-filtered to that contractor.
  useEffect(() => {
    const state = location.state as { openInvoiceId?: string; openAdd?: boolean; vendorFilter?: string } | null
    if (state?.openAdd) {
      openAdd()
      navigate(location.pathname, { replace: true, state: null })
      return
    }
    if (state?.vendorFilter) {
      setFilters((f) => ({ ...f, vendor: state.vendorFilter! }))
      navigate(location.pathname, { replace: true, state: null })
      return
    }
    const openInvoiceId = state?.openInvoiceId
    if (!openInvoiceId || !invoices.length) return
    const target = invoices.find((r) => r.id === openInvoiceId)
    if (target) openView(target)
    navigate(location.pathname, { replace: true, state: null })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, invoices])

  function saveInvoice(record: Invoice) {
    upsertInvoice.mutate(record, {
      onSuccess: () => {
        toast.success(editingInvoice ? "Invoice updated." : "Invoice added.")
        setDrawerOpen(false)
        setEditingInvoice(null)
      },
      onError: (e) => toast.error(errorMessage(e, "Could not save invoice.")),
    })
  }

  function handleSave(record: Invoice) {
    // Same vendor + invoice no. + amount as an invoice already on file (excluding the
    // record being edited itself) — surface it instead of silently writing another row.
    const key = invoiceDupKey(record)
    const existing = allInvoices.find((r) => r.id !== record.id && invoiceDupKey(r) === key)
    if (existing) {
      setDupWarning({ record, existing })
      return
    }
    saveInvoice(record)
  }

  function handleDuplicateConfirm() {
    if (!dupWarning) return
    saveInvoice(dupWarning.record)
    setDupWarning(null)
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return
    deleteInvoice.mutate(deleteTarget, {
      onSuccess: () => toast.success("Invoice deleted."),
      onError: (e) => toast.error(errorMessage(e, "Could not delete invoice.")),
    })
    setDeleteTarget(null)
  }

  function handleBulkDeleteConfirm() {
    const victims = invoices.filter((r) => selected.has(r.id))
    deleteInvoices.mutate(victims, {
      onSuccess: () => {
        toast.success(`Deleted ${victims.length} invoice${victims.length !== 1 ? "s" : ""}.`)
        setSelected(new Set())
      },
      onError: (e) => toast.error(errorMessage(e, "Could not delete invoices.")),
    })
    setBulkDeleteConfirm(false)
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  function toggleSelectAll(checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      pageRows.forEach((r) => (checked ? next.add(r.id) : next.delete(r.id)))
      return next
    })
  }

  function handleImport(newInvoices: Invoice[]) {
    bulkUpsert.mutate(newInvoices, {
      onSuccess: (count) => toast.success(`Imported/updated ${count} invoice${count !== 1 ? "s" : ""}.`),
      onError: (e) => toast.error(errorMessage(e, "Import failed.")),
    })
  }

  if (invoicesQuery.isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (invoicesQuery.isError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        Could not load invoices. Check your connection to Supabase in Settings → Cloud Sync.
      </div>
    )
  }

  return (
    // grid-cols-1 (not bare `grid`) matters here — see DashboardPage's identical fix:
    // a single implicit column with no explicit track sizes via `auto` (widest child's
    // max-content width), which can render wider than the viewport and silently push
    // every row inside it wider too. grid-cols-1 uses Tailwind's minmax(0,1fr) instead.
    <div className="grid grid-cols-1 gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <List className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-base font-semibold md:text-lg">{filteredRows.length.toLocaleString()}</div>
            <div className="truncate text-xs text-muted-foreground">{hasFilter ? "Filtered" : "Total"} invoices</div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-400">
            <Wallet className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-base font-semibold md:text-lg">{fmtMoney(sumIncl)}</div>
            <div className="truncate text-xs text-muted-foreground">Value (incl. tax)</div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md status-icon-cleared">
            <Wallet className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-base font-semibold md:text-lg">{fmtMoney(sumPaid)}</div>
            <div className="truncate text-xs text-muted-foreground">Amount paid</div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <CheckCircle2 className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-base font-semibold md:text-lg">{clearedN.toLocaleString()}</div>
            <div className="truncate text-xs text-muted-foreground">Cleared</div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <InvoiceFiltersBar
            filters={filters}
            onFiltersChange={(f) => {
              setFilters(f)
              setPageNum(1)
            }}
            sort={sort}
            onSortChange={setSort}
            refLists={refLists}
            contractNumbers={contractNumbers}
            contractLabels={contractLabels}
            yearOptions={yearOptions}
            enteredByOptions={enteredByOptions}
          />
          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportInvoicesCsv(filteredRows)}>CSV (.csv)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportInvoicesXlsx(filteredRows)}>Excel (.xlsx)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              size="sm"
              disabled={!can("add")}
              title={
                can("add")
                  ? "Import new invoices, or update existing ones with missing details"
                  : "Only Editors and Admins can import invoices"
              }
              onClick={() => setImportOpen(true)}
            >
              <Upload /> Import / Update
            </Button>
            <Button
              variant="outline"
              size="sm"
              title="Find invoices with the same vendor & invoice no."
              onClick={() => setDupFinderOpen(true)}
            >
              <Copy /> Find Duplicates
            </Button>
            <Button
              size="sm"
              disabled={!can("add")}
              title={can("add") ? "Add invoice" : "Only Editors and Admins can add invoices"}
              onClick={openAdd}
            >
              <Plus /> New Entry
            </Button>
          </div>
        </div>

        {canBulk && selected.size > 0 && (
          <div className="mb-3">
            <SelectionToolbar
              count={selected.size}
              label={`invoice${selected.size !== 1 ? "s" : ""} selected`}
              summary={`${fmtMoney(invoices.filter((r) => selected.has(r.id)).reduce((s, r) => s + (Number(r.amountInclTax) || 0), 0))} total`}
              onClear={() => setSelected(new Set())}
              action={
                <Button variant="destructive" size="sm" onClick={() => setBulkDeleteConfirm(true)}>
                  <Trash2 /> Delete selected
                </Button>
              }
            />
          </div>
        )}

        <InvoicesTable
          rows={pageRows}
          canBulk={canBulk}
          canEdit={can("edit")}
          canDelete={can("delete")}
          contractorLogos={contractorLogosQuery.data ?? {}}
          selected={selected}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
          onView={openView}
          onEdit={openEdit}
          onDelete={setDeleteTarget}
        />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>
            Showing {filteredRows.length ? startIdx + 1 : 0}–{Math.min(startIdx + pageSize, filteredRows.length)} of{" "}
            {filteredRows.length.toLocaleString()}
          </span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span>Rows per page</span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v))
                  setPageNum(1)
                }}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" disabled={clampedPage <= 1} onClick={() => setPageNum(clampedPage - 1)}>
                ‹
              </Button>
              <span className="px-2">
                {clampedPage} / {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={clampedPage >= totalPages} onClick={() => setPageNum(clampedPage + 1)}>
                ›
              </Button>
            </div>
          </div>
        </div>
      </div>

      <InvoiceDrawer
        open={drawerOpen}
        mode={drawerMode}
        invoice={editingInvoice}
        nextSrNo={Math.max(0, ...allInvoices.map((r) => Number(r.srNo) || 0)) + 1}
        refLists={refLists}
        defaultDept={activeDept !== "ALL" ? activeDept : refLists.departments[0]}
        contractNumbers={contractNumbers}
        contractLabels={contractLabels}
        contractVendorMap={contractVendorMap}
        canEdit={can("edit")}
        onOpenChange={setDrawerOpen}
        onSubmit={handleSave}
        onSwitchToEdit={() => setDrawerMode("edit")}
      />

      <InvoiceDetailSheet
        open={!!detailInvoice}
        invoice={detailInvoice}
        invoices={invoices}
        contractorLogos={contractorLogosQuery.data ?? {}}
        onOpenChange={(v) => !v && setDetailInvoice(null)}
        onEdit={() => {
          if (detailInvoice) openEdit(detailInvoice)
          setDetailInvoice(null)
        }}
      />

      <ImportDialog open={importOpen} onOpenChange={setImportOpen} existingInvoices={allInvoices} onImport={handleImport} />

      <DuplicateFinderDialog
        open={dupFinderOpen}
        onOpenChange={setDupFinderOpen}
        invoices={allInvoices}
        canDelete={can("delete")}
        onView={openView}
        onDelete={setDeleteTarget}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && `Invoice ${deleteTarget.invoiceNo || `#${deleteTarget.srNo}`} (${deleteTarget.vendor}) will be permanently deleted.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteConfirm} onOpenChange={setBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.size} invoices?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the selected invoices.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!dupWarning} onOpenChange={(v) => !v && setDupWarning(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Possible duplicate invoice</AlertDialogTitle>
            <AlertDialogDescription>
              {dupWarning &&
                `Invoice ${dupWarning.existing.invoiceNo || `#${dupWarning.existing.srNo}`} from ${dupWarning.existing.vendor} for ${fmtMoney(Number(dupWarning.existing.amountExclTax) || 0)} is already on file${
                  dupWarning.existing.createdByName ? ` (entered by ${dupWarning.existing.createdByName})` : ""
                }. Add this one anyway?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDupWarning(null)}>Ignore</AlertDialogCancel>
            <AlertDialogAction onClick={handleDuplicateConfirm}>Add Anyway</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

