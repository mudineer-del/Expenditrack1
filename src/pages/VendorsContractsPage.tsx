import { Building2, Pencil, Plus, Search, Trash2 } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ContractDetailSheet } from "@/components/contracts/ContractDetailSheet"
import { ContractDrawer } from "@/components/contracts/ContractDrawer"
import { ContractRow } from "@/components/contracts/ContractRow"
import { ContractPortfolioCard } from "@/components/contracts/ContractPortfolioCard"
import { VendorCard } from "@/components/contracts/VendorCard"
import { VendorDetailSheet } from "@/components/contracts/VendorDetailSheet"
import { ContractorLogo } from "@/components/shared/ContractorLogo"
import { avgLeadTime, fmtMoney, vendorColor } from "@/lib/dashboard"
import { CONTRACT_TONE_CLASSES, contractExpenditure, contractStatusTone, invoicesForContract, utilizationColor } from "@/lib/contracts"
import { getContractorLogo, useContractorLogosQuery } from "@/lib/contractorLogos"
import { useReferenceLists } from "@/lib/referenceLists"
import { cn, errorMessage } from "@/lib/utils"
import { useAuth } from "@/hooks/useAuth"
import { useContractsQuery, useDeleteContract, useUpsertContract } from "@/hooks/useContracts"
import { useInvoicesQuery } from "@/hooks/useInvoices"
import { useAppStore } from "@/store/useAppStore"
import type { Contract } from "@/types/contract"

/** Ported from renderVendors (index.html:4144-4222). */
export default function VendorsContractsPage() {
  const { can } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
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
  const [viewingVendor, setViewingVendor] = useState<string | null>(null)

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

  // Deep-link support: the command palette navigates here with { openContractId } in
  // router state to jump straight to that contract's detail sheet.
  useEffect(() => {
    const openContractId = (location.state as { openContractId?: string } | null)?.openContractId
    if (!openContractId || !contracts.length) return
    const target = contracts.find((c) => c.id === openContractId)
    if (target) setViewingContract(target)
    navigate(location.pathname, { replace: true, state: null })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, contracts])

  const vendorCards = useMemo(() => {
    const byVendor: Record<string, { count: number; total: number }> = {}
    invoices.forEach((r) => {
      const v = r.vendor || "Unknown"
      byVendor[v] = byVendor[v] || { count: 0, total: 0 }
      byVendor[v].count++
      byVendor[v].total += Number(r.amountInclTax) || 0
    })
    // Only show a tile for a vendor that actually has an invoice or a contract in the
    // current department scope — the vendor picklist itself is global (shared across every
    // department), so without this a department with 2 real contractors would still show a
    // tile for every vendor ever added anywhere else.
    const vendorsWithContracts = new Set(contracts.map((c) => c.vendor).filter(Boolean))
    const grandTotal = Object.values(byVendor).reduce((s, d) => s + d.total, 0) || 1
    return refLists.vendors
      .filter((v) => byVendor[v] || vendorsWithContracts.has(v))
      .map((v) => {
        const d = byVendor[v] || { count: 0, total: 0 }
        return {
          vendor: v,
          total: d.total,
          count: d.count,
          sharePct: (d.total / grandTotal) * 100,
          lead: avgLeadTime(invoices.filter((r) => r.vendor === v)),
        }
      })
  }, [invoices, contracts, refLists.vendors])

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
      onError: (e) => toast.error(errorMessage(e, "Could not save contract.")),
    })
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return
    deleteContract.mutate(deleteTarget, {
      onSuccess: () => toast.success("Contract deleted."),
      onError: (e) => toast.error(errorMessage(e, "Could not delete contract.")),
    })
    setDeleteTarget(null)
  }

  if (invoicesQuery.isLoading || contractsQuery.isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
    // grid-cols-1 (not just `grid`) on the root and the vendor-card grid below
    // matters: with no explicit column count, the browser's default implicit
    // column sizes to `auto` (content's max-content width), which can render
    // wider than the container's own box — see DashboardPage.tsx for the full
    // writeup of this bug, found via live device testing there.
    <div className="grid grid-cols-1 gap-4">
      <div>
        <div className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Contractors</div>
        {vendorCards.length ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                onClick={() => {
                  setDashVendor(dashVendor === v.vendor ? "ALL" : v.vendor)
                  setViewingVendor(v.vendor)
                }}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-lg border p-10 text-center text-muted-foreground">
            <Building2 className="size-8" />
            <h4 className="font-medium text-foreground">No contractors yet in this department</h4>
            <p className="text-sm">Add an invoice or contract under this department to see it here.</p>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm md:rounded-lg md:shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <h3 className="text-base font-bold md:text-sm md:font-semibold">Contracts</h3>
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
              disabled={!can("add", "contract")}
              title={can("add", "contract") ? "Add contract" : "Only Admins can add contracts"}
              onClick={openAdd}
            >
              <Plus /> New Contract
            </Button>
          </div>
        </div>
        {filteredContracts.length ? (
          <>
            {/* Card list below md — an 8-column table forces horizontal scroll
                on a phone; same tap-to-view plus visible Edit/Delete affordances
                as the desktop row. Table (unchanged) takes over at md+. */}
            <div className="divide-y divide-border/50 md:hidden">
              {filteredContracts.map((c) => {
                const spent = contractExpenditure(invoices, c.contractNo)
                const cost = Number(c.value) || 0
                const pct = cost > 0 ? Math.min(100, (spent / cost) * 100) : 0
                const barColor = utilizationColor(pct)
                const primaryVendor = (c.vendor || "").split("/")[0].trim()
                const color = vendorColor(primaryVendor)
                const tone = contractStatusTone(c.status)
                const canEdit = can("edit", "contract")
                const canDelete = can("delete", "contract")
                return (
                  <div
                    key={c.id}
                    className="cursor-pointer p-4 transition-colors hover:bg-muted/50 active:bg-muted"
                    onClick={() => setViewingContract(c)}
                  >
                    <div className="flex items-start gap-3">
                      <ContractorLogo vendor={primaryVendor || c.vendor} logo={getContractorLogo(contractorLogosQuery.data ?? {}, primaryVendor)} color={color} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[15px] font-semibold">{c.contractNo}</div>
                        <div className="truncate text-[13px] text-muted-foreground">
                          {c.vendor || "—"}
                          {c.title ? ` · ${c.title}` : ""}
                        </div>
                      </div>
                      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", CONTRACT_TONE_CLASSES[tone])}>
                        {c.status || "—"}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[13px]">
                      <span className="text-muted-foreground">{cost > 0 ? `${fmtMoney(spent)} of ${fmtMoney(cost)}` : `${fmtMoney(spent)} spent`}</span>
                      <span className="font-semibold tabular-nums">{cost > 0 ? `${pct.toFixed(0)}%` : "—"}</span>
                    </div>
                    {cost > 0 && (
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full" style={{ width: `${pct.toFixed(1)}%`, backgroundColor: barColor }} />
                      </div>
                    )}
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {invoicesForContract(invoices, c.contractNo).length} invoice{invoicesForContract(invoices, c.contractNo).length !== 1 ? "s" : ""}
                        {(() => {
                          const lead = avgLeadTime(invoicesForContract(invoices, c.contractNo))
                          return lead !== null ? ` · ${lead}d avg lead` : ""
                        })()}
                      </span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="rounded-full p-2 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                          title={canEdit ? "Edit" : "Only Admins can edit contracts"}
                          disabled={!canEdit}
                          onClick={(e) => {
                            e.stopPropagation()
                            openEdit(c)
                          }}
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded-full p-2 text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-40"
                          title={canDelete ? "Delete" : "Only Admins can delete contracts"}
                          disabled={!canDelete}
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteTarget(c)
                          }}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="hidden grid-cols-1 gap-3 bg-gradient-to-b from-muted/20 to-transparent p-4 md:grid">{filteredContracts.map((c, index) => <ContractPortfolioCard key={c.id} contract={c} invoices={invoices} logo={getContractorLogo(contractorLogosQuery.data ?? {}, c.vendor.split("/")[0].trim())} index={index} canEdit={can("edit", "contract")} canDelete={can("delete", "contract")} onView={() => setViewingContract(c)} onEdit={() => openEdit(c)} onDelete={() => setDeleteTarget(c)} />)}</div><Table containerClassName="hidden">
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
                    canEdit={can("edit", "contract")}
                    canDelete={can("delete", "contract")}
                    logo={getContractorLogo(contractorLogosQuery.data ?? {}, c.vendor.split("/")[0].trim())}
                    onView={() => setViewingContract(c)}
                    onEdit={() => openEdit(c)}
                    onDelete={() => setDeleteTarget(c)}
                  />
                ))}
              </TableBody>
            </Table>
          </>
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
        canEdit={can("edit", "contract")}
        logo={getContractorLogo(contractorLogosQuery.data ?? {}, viewingContract?.vendor.split("/")[0].trim() || "")}
        onOpenChange={(v) => !v && setViewingContract(null)}
        onEdit={() => {
          if (viewingContract) openEdit(viewingContract)
          setViewingContract(null)
        }}
      />

      <VendorDetailSheet
        open={!!viewingVendor}
        vendor={viewingVendor}
        color={vendorColor(viewingVendor || "")}
        logo={getContractorLogo(contractorLogosQuery.data ?? {}, viewingVendor || "")}
        invoices={invoices}
        contracts={contracts}
        onOpenChange={(v) => !v && setViewingVendor(null)}
        onViewContract={(c) => {
          setViewingVendor(null)
          setViewingContract(c)
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


