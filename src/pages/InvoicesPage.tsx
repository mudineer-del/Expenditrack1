import { CheckCircle2, Download, List, Plus, Trash2, Upload, Wallet } from "lucide-react"
import { useMemo, useState } from "react"
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
import { ImportDialog } from "@/components/invoices/ImportDialog"
import { InvoiceDrawer } from "@/components/invoices/InvoiceDrawer"
import { InvoiceFiltersBar } from "@/components/invoices/InvoiceFiltersBar"
import { InvoicesTable } from "@/components/invoices/InvoicesTable"
import { fmtMoney } from "@/lib/dashboard"
import { BLANK_FILTERS, filterAndSortInvoices, type SortState } from "@/lib/invoiceFilters"
import { exportInvoicesCsv, exportInvoicesXlsx } from "@/lib/invoiceIO"
import { useReferenceLists } from "@/lib/referenceLists"
import { useAuth } from "@/hooks/useAuth"
import { useContractsQuery } from "@/hooks/useContracts"
import {
  useBulkUpsertInvoices,
  useDeleteInvoice,
  useDeleteInvoices,
  useInvoicesQuery,
  useUpsertInvoice,
} from "@/hooks/useInvoices"
import type { Invoice } from "@/types/invoice"

const PAGE_SIZES = [25, 50, 75, 100]

type DrawerMode = "add" | "edit" | "view"

export default function InvoicesPage() {
  const { can } = useAuth()
  const invoicesQuery = useInvoicesQuery()
  const contractsQuery = useContractsQuery()
  const { ref: refLists } = useReferenceLists()
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

  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null)
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  const invoices = invoicesQuery.data ?? []
  const contracts = contractsQuery.data ?? []

  const contractNumbers = useMemo(() => {
    const known = contracts.map((c) => c.contractNo)
    const fromData = Array.from(new Set(invoices.map((r) => (r.contractNo || "").trim()).filter(Boolean)))
    return Array.from(new Set([...known, ...fromData])).sort()
  }, [contracts, invoices])

  const yearOptions = useMemo(
    () => Array.from(new Set(invoices.map((r) => r.year).filter(Boolean))).map(String).sort(),
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
    setDrawerMode("view")
    setEditingInvoice(inv)
    setDrawerOpen(true)
  }
  function openEdit(inv: Invoice) {
    setDrawerMode("edit")
    setEditingInvoice(inv)
    setDrawerOpen(true)
  }

  function handleSave(record: Invoice) {
    upsertInvoice.mutate(record, {
      onSuccess: () => {
        toast.success(editingInvoice ? "Invoice updated." : "Invoice added.")
        setDrawerOpen(false)
        setEditingInvoice(null)
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save invoice."),
    })
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return
    deleteInvoice.mutate(deleteTarget.id, {
      onSuccess: () => toast.success("Invoice deleted."),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not delete invoice."),
    })
    setDeleteTarget(null)
  }

  function handleBulkDeleteConfirm() {
    const ids = Array.from(selected)
    deleteInvoices.mutate(ids, {
      onSuccess: () => {
        toast.success(`Deleted ${ids.length} invoice${ids.length !== 1 ? "s" : ""}.`)
        setSelected(new Set())
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not delete invoices."),
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
      onSuccess: (count) => toast.success(`Imported ${count} invoice${count !== 1 ? "s" : ""}.`),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Import failed."),
    })
  }

  if (invoicesQuery.isLoading) {
    return (
      <div className="grid gap-4">
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
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
          <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <List className="size-4" />
          </span>
          <div>
            <div className="text-lg font-semibold">{filteredRows.length.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">{hasFilter ? "Filtered" : "Total"} invoices</div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
          <span className="flex size-9 items-center justify-center rounded-md bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-400">
            <Wallet className="size-4" />
          </span>
          <div>
            <div className="text-lg font-semibold">{fmtMoney(sumIncl)}</div>
            <div className="text-xs text-muted-foreground">Value (incl. tax)</div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
          <span className="flex size-9 items-center justify-center rounded-md bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400">
            <Wallet className="size-4" />
          </span>
          <div>
            <div className="text-lg font-semibold">{fmtMoney(sumPaid)}</div>
            <div className="text-xs text-muted-foreground">Amount paid</div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
          <span className="flex size-9 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <CheckCircle2 className="size-4" />
          </span>
          <div>
            <div className="text-lg font-semibold">{clearedN.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Cleared</div>
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
            yearOptions={yearOptions}
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
            {can("add") && (
              <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                <Upload /> Import
              </Button>
            )}
            {can("add") && (
              <Button size="sm" onClick={openAdd}>
                <Plus /> New Entry
              </Button>
            )}
          </div>
        </div>

        {canBulk && selected.size > 0 && (
          <div className="mb-3 flex items-center gap-3 rounded-lg border bg-muted/50 p-2.5 text-sm">
            <span>
              <b>{selected.size}</b> invoice{selected.size !== 1 ? "s" : ""} selected
            </span>
            <span className="text-muted-foreground">
              {fmtMoney(invoices.filter((r) => selected.has(r.id)).reduce((s, r) => s + (Number(r.amountInclTax) || 0), 0))} total
            </span>
            <div className="flex-1" />
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Clear selection
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setBulkDeleteConfirm(true)}>
              <Trash2 /> Delete Selected
            </Button>
          </div>
        )}

        <InvoicesTable
          rows={pageRows}
          canBulk={canBulk}
          canEdit={can("edit")}
          canDelete={can("delete")}
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
        refLists={refLists}
        contractNumbers={contractNumbers}
        canEdit={can("edit")}
        onOpenChange={setDrawerOpen}
        onSubmit={handleSave}
        onSwitchToEdit={() => setDrawerMode("edit")}
      />

      <ImportDialog open={importOpen} onOpenChange={setImportOpen} existingInvoices={invoices} onImport={handleImport} />

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
    </div>
  )
}
