import { Building2, Plus, Search } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ContractDetailSheet } from "@/components/contracts/ContractDetailSheet"
import { ContractDrawer } from "@/components/contracts/ContractDrawer"
import { ContractRow } from "@/components/contracts/ContractRow"
import { VendorCard } from "@/components/contracts/VendorCard"
import { avgLeadTime, vendorColor } from "@/lib/dashboard"
import { getContractorLogo, useContractorLogosQuery } from "@/lib/contractorLogos"
import { useReferenceLists } from "@/lib/referenceLists"
import { useAuth } from "@/hooks/useAuth"
import { useContractsQuery, useDeleteContract, useUpsertContract } from "@/hooks/useContracts"
import { useInvoicesQuery } from "@/hooks/useInvoices"
import { useAppStore } from "@/store/useAppStore"
import type { Contract } from "@/types/contract"

/** Ported from renderVendors (index.html:4144-4222). */
export default function VendorsContractsPage() {
  const { can } = useAuth()
  const invoicesQuery = useInvoicesQuery()
  const contractsQuery = useContractsQuery()
  const { ref: refLists } = useReferenceLists()
  const contractorLogosQuery = useContractorLogosQuery()
  const upsertContract = useUpsertContract()
  const deleteContract = useDeleteContract()
  const dashVendor = useAppStore((s) => s.dashVendor)
  const setDashVendor = useAppStore((s) => s.setDashVendor)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingContract, setEditingContract] = useState<Contract | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Contract | null>(null)
  const [contractSearch, setContractSearch] = useState("")
  const [viewingContract, setViewingContract] = useState<Contract | null>(null)

  const activeDept = useAppStore((s) => s.activeDept)
  const allInvoices = invoicesQuery.data ?? []
  const allContracts = contractsQuery.data ?? []
  // Scoped to the sidebar/dashboard's active department, same pattern as the Dashboard.
  const invoices = useMemo(
    () => (activeDept === "ALL" ? allInvoices : allInvoices.filter((r) => r.department === activeDept)),
    [allInvoices, activeDept]
  )
  const contracts = useMemo(
    () => (activeDept === "ALL" ? allContracts : allContracts.filter((c) => c.department === activeDept)),
    [allContracts, activeDept]
  )

  const vendorCards = useMemo(() => {
    const byVendor: Record<string, { count: number; total: number }> = {}
    invoices.forEach((r) => {
      const v = r.vendor || "Unknown"
      byVendor[v] = byVendor[v] || { count: 0, total: 0 }
      byVendor[v].count++
      byVendor[v].total += Number(r.amountInclTax) || 0
    })
    const grandTotal = Object.values(byVendor).reduce((s, d) => s + d.total, 0) || 1
    return refLists.vendors.map((v) => {
      const d = byVendor[v] || { count: 0, total: 0 }
      return {
        vendor: v,
        total: d.total,
        count: d.count,
        sharePct: (d.total / grandTotal) * 100,
        lead: avgLeadTime(invoices.filter((r) => r.vendor === v)),
      }
    })
  }, [invoices, refLists.vendors])

  const sortedContracts = useMemo(
    () => contracts.slice().sort((a, b) => a.contractNo.localeCompare(b.contractNo)),
    [contracts]
  )

  const filteredContracts = useMemo(() => {
    const q = contractSearch.trim().toLowerCase()
    if (!q) return sortedContracts
    return sortedContracts.filter((c) =>
      [c.contractNo, c.vendor, c.title, c.status].some((field) => (field || "").toLowerCase().includes(q))
    )
  }, [sortedContracts, contractSearch])

  function openAdd() {
    setEditingContract(null)
    setDrawerOpen(true)
  }
  function openEdit(c: Contract) {
    setEditingContract(c)
    setDrawerOpen(true)
  }

  function handleSave(record: Contract) {
    upsertContract.mutate(record, {
      onSuccess: () => {
        toast.success(editingContract ? "Contract updated." : "Contract added.")
        setDrawerOpen(false)
        setEditingContract(null)
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save contract."),
    })
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return
    deleteContract.mutate(deleteTarget, {
      onSuccess: () => toast.success("Contract deleted."),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not delete contract."),
    })
    setDeleteTarget(null)
  }

  if (invoicesQuery.isLoading || contractsQuery.isLoading) {
    return (
      <div className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  if (invoicesQuery.isError || contractsQuery.isError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        Could not load vendors/contracts. Check your connection to Supabase in Settings → Cloud Sync.
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      <div>
        <div className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Contractors</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {vendorCards.map((v) => (
            <VendorCard
              key={v.vendor}
              vendor={v.vendor}
              color={vendorColor(v.vendor)}
              logo={getContractorLogo(contractorLogosQuery.data ?? {}, v.vendor)}
              total={v.total}
              sharePct={v.sharePct}
              count={v.count}
              leadDays={v.lead}
              active={dashVendor === v.vendor}
              onClick={() => setDashVendor(dashVendor === v.vendor ? "ALL" : v.vendor)}
            />
          ))}
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <h3 className="text-sm font-semibold">Contracts</h3>
          <div className="flex flex-1 items-center justify-end gap-2">
            <div className="relative w-full max-w-xs">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Search contract no., contractor, title, status…"
                value={contractSearch}
                onChange={(e) => setContractSearch(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              disabled={!can("add")}
              title={can("add") ? "Add contract" : "Only Editors and Admins can add contracts"}
              onClick={openAdd}
            >
              <Plus /> New Contract
            </Button>
          </div>
        </div>
        {filteredContracts.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contract</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Spent</TableHead>
                <TableHead className="text-right">Invoices</TableHead>
                <TableHead className="text-right">Lead</TableHead>
                <TableHead>Utilization</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContracts.map((c) => (
                <ContractRow
                  key={c.id}
                  contract={c}
                  invoices={invoices}
                  canEdit={can("edit")}
                  canDelete={can("delete")}
                  logo={getContractorLogo(contractorLogosQuery.data ?? {}, c.vendor.split("/")[0].trim())}
                  onView={() => setViewingContract(c)}
                  onEdit={() => openEdit(c)}
                  onDelete={() => setDeleteTarget(c)}
                />
              ))}
            </TableBody>
          </Table>
        ) : sortedContracts.length ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
            <Search className="size-8" />
            <h4 className="font-medium text-foreground">No matching contracts</h4>
            <p className="text-sm">Try a different contract no., contractor, title, or status.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
            <Building2 className="size-8" />
            <h4 className="font-medium text-foreground">No contracts yet</h4>
            <p className="text-sm">Add a new contract to get started.</p>
          </div>
        )}
      </div>

      <ContractDrawer
        open={drawerOpen}
        contract={editingContract}
        refLists={refLists}
        defaultDept={activeDept !== "ALL" ? activeDept : refLists.departments[0]}
        onOpenChange={setDrawerOpen}
        onSubmit={handleSave}
      />

      <ContractDetailSheet
        open={!!viewingContract}
        contract={viewingContract}
        invoices={invoices}
        canEdit={can("edit")}
        logo={getContractorLogo(contractorLogosQuery.data ?? {}, viewingContract?.vendor.split("/")[0].trim() || "")}
        onOpenChange={(v) => !v && setViewingContract(null)}
        onEdit={() => {
          if (viewingContract) openEdit(viewingContract)
          setViewingContract(null)
        }}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this contract?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && `Contract ${deleteTarget.contractNo} (${deleteTarget.vendor || "—"}) will be permanently deleted.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
