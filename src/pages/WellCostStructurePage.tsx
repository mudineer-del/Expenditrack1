import { Drill, Eye, History, Pencil, Plus, Search, Trash2, Upload } from "lucide-react"
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CostSummaryCards, UtilizationBar } from "@/components/wells/CostSummary"
import { DmrImportDialog } from "@/components/wells/DmrImportDialog"
import { NameDialog } from "@/components/wells/NameDialog"
import { WellCostCentreDrawer } from "@/components/wells/WellCostCentreDrawer"
import { WellDrawer } from "@/components/wells/WellDrawer"
import { WellSelector } from "@/components/wells/WellSelector"
import { availableAmount, buildCostCentreTotals, fmtCurrency, groupByServiceCategory, rollup, ZERO_TOTALS } from "@/lib/wellCost"
import { errorMessage } from "@/lib/utils"
import { useAuth } from "@/hooks/useAuth"
import {
  useAddServiceCategory,
  useAddWellCostDepartment,
  useWellCostDepartmentsQuery,
  useWellCostServiceCategoriesQuery,
  useWellDepartmentsQuery,
} from "@/hooks/useWellCostCatalog"
import { useDeleteWellCostCentre, useUpsertWellCostCentre, useWellCostCentresQuery } from "@/hooks/useWellCostCentres"
import { useBulkUpsertWellCostTransactions, useWellCostTransactionsQuery } from "@/hooks/useWellCostTransactions"
import { useUpsertWell, useWellsQuery } from "@/hooks/useWells"
import type { Well } from "@/types/well"
import type { WellCostCentre, WellCostTransaction } from "@/types/wellCost"

interface CostCentreDrawerState {
  open: boolean
  item: WellCostCentre | null
  departmentId: string
  serviceCategoryId: string
  readOnly: boolean
}

const BLANK_DRAWER_STATE: CostCentreDrawerState = { open: false, item: null, departmentId: "", serviceCategoryId: "", readOnly: false }

/** The Well Cost workspace: pick a well, see its budget/actual/commitments/available roll
 *  up at the well level, then drill into one department tab at a time down to individual
 *  Cost/Fund Centre rows grouped by service category. */
export default function WellCostStructurePage() {
  const { can, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const wellsQuery = useWellsQuery()
  const costCentresQuery = useWellCostCentresQuery()
  const departmentsQuery = useWellCostDepartmentsQuery()
  const serviceCategoriesQuery = useWellCostServiceCategoriesQuery()
  const wellDepartmentsQuery = useWellDepartmentsQuery()
  const transactionsQuery = useWellCostTransactionsQuery()

  const upsertWell = useUpsertWell()
  const upsertCostCentre = useUpsertWellCostCentre()
  const deleteCostCentre = useDeleteWellCostCentre()
  const addDepartment = useAddWellCostDepartment()
  const addServiceCategory = useAddServiceCategory()
  const bulkImportTransactions = useBulkUpsertWellCostTransactions()

  const [selectedWellId, setSelectedWellId] = useState<string | null>(
    () => (location.state as { wellId?: string } | null)?.wellId ?? null
  )
  const [activeDeptId, setActiveDeptId] = useState<string>("")
  const [search, setSearch] = useState("")
  const [wellDrawerOpen, setWellDrawerOpen] = useState(false)
  const [deptDialogOpen, setDeptDialogOpen] = useState(false)
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false)
  const [centreDrawer, setCentreDrawer] = useState<CostCentreDrawerState>(BLANK_DRAWER_STATE)
  const [deleteTarget, setDeleteTarget] = useState<WellCostCentre | null>(null)
  const [importServiceCategoryId, setImportServiceCategoryId] = useState<string | null>(null)

  const wells = wellsQuery.data ?? []
  const costCentres = costCentresQuery.data ?? []
  const departments = departmentsQuery.data ?? []
  const serviceCategories = serviceCategoriesQuery.data ?? []
  const wellDepartments = wellDepartmentsQuery.data ?? []
  const transactions = transactionsQuery.data ?? []
  const costCentreTotals = useMemo(() => buildCostCentreTotals(transactions), [transactions])

  useEffect(() => {
    if (!selectedWellId && wells.length) setSelectedWellId(wells.find((w) => !w.archived)?.id ?? wells[0].id)
  }, [wells, selectedWellId])

  const selectedWell = wells.find((w) => w.id === selectedWellId) ?? null

  const tabs = useMemo(() => {
    if (!selectedWell) return []
    const deptIds = new Set(wellDepartments.filter((wd) => wd.wellId === selectedWell.id).map((wd) => wd.departmentId))
    return departments.filter((d) => deptIds.has(d.id)).sort((a, b) => a.sortOrder - b.sortOrder)
  }, [selectedWell, wellDepartments, departments])

  useEffect(() => {
    if (tabs.length && !tabs.some((t) => t.id === activeDeptId)) setActiveDeptId(tabs[0].id)
  }, [tabs, activeDeptId])

  const wellCostCentres = useMemo(
    () => (selectedWell ? costCentres.filter((c) => c.wellId === selectedWell.id) : []),
    [costCentres, selectedWell]
  )
  const wellRollup = useMemo(() => rollup(wellCostCentres, costCentreTotals), [wellCostCentres, costCentreTotals])

  function openAddWell() {
    setWellDrawerOpen(true)
  }
  function handleSaveWell(record: Well) {
    upsertWell.mutate(record, {
      onSuccess: () => {
        toast.success("Well added.")
        setWellDrawerOpen(false)
        setSelectedWellId(record.id)
      },
      onError: (e) => toast.error(errorMessage(e, "Could not save well.")),
    })
  }

  function handleAddDepartment(name: string) {
    addDepartment.mutate(name, {
      onSuccess: (dept) => {
        toast.success(`Department "${dept.name}" added.`)
        setDeptDialogOpen(false)
        setActiveDeptId(dept.id)
      },
      onError: (e) => toast.error(errorMessage(e, "Could not add department.")),
    })
  }

  function handleAddServiceCategory(name: string) {
    addServiceCategory.mutate(
      { departmentId: activeDeptId, name },
      {
        onSuccess: () => {
          toast.success(`Service description "${name}" added.`)
          setServiceDialogOpen(false)
        },
        onError: (e) => toast.error(errorMessage(e, "Could not add service description.")),
      }
    )
  }

  function openAddCostCentre(departmentId: string, serviceCategoryId: string) {
    setCentreDrawer({ open: true, item: null, departmentId, serviceCategoryId, readOnly: false })
  }
  function openEditCostCentre(item: WellCostCentre) {
    setCentreDrawer({ open: true, item, departmentId: item.departmentId, serviceCategoryId: item.serviceCategoryId, readOnly: !can("edit", "well") })
  }
  function openViewCostCentre(item: WellCostCentre) {
    setCentreDrawer({ open: true, item, departmentId: item.departmentId, serviceCategoryId: item.serviceCategoryId, readOnly: true })
  }

  function handleSaveCostCentre(record: WellCostCentre) {
    const dupe = wellCostCentres.some(
      (c) => c.id !== record.id && c.costCentre.trim().toLowerCase() === record.costCentre.trim().toLowerCase()
    )
    if (dupe) toast.warning(`Heads up: Cost Centre "${record.costCentre}" is already used elsewhere on this well.`)
    upsertCostCentre.mutate(record, {
      onSuccess: () => {
        toast.success(centreDrawer.item ? "Cost / Fund Centre updated." : "Cost / Fund Centre added.")
        setCentreDrawer(BLANK_DRAWER_STATE)
      },
      onError: (e) => toast.error(errorMessage(e, "Could not save cost / fund centre.")),
    })
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return
    deleteCostCentre.mutate(deleteTarget, {
      onSuccess: () => toast.success("Cost / Fund Centre deleted."),
      onError: (e) => toast.error(errorMessage(e, "Could not delete cost / fund centre.")),
    })
    setDeleteTarget(null)
  }

  function handleImportTransactions(rows: WellCostTransaction[]) {
    bulkImportTransactions.mutate(rows, {
      onSuccess: () => {
        toast.success(`Imported ${rows.length} cost entr${rows.length !== 1 ? "ies" : "y"}.`)
        setImportServiceCategoryId(null)
      },
      onError: (e) => toast.error(errorMessage(e, "Could not import entries.")),
    })
  }

  const anyLoading =
    wellsQuery.isLoading ||
    costCentresQuery.isLoading ||
    departmentsQuery.isLoading ||
    serviceCategoriesQuery.isLoading ||
    wellDepartmentsQuery.isLoading ||
    transactionsQuery.isLoading
  const anyError =
    wellsQuery.isError ||
    costCentresQuery.isError ||
    departmentsQuery.isError ||
    serviceCategoriesQuery.isError ||
    wellDepartmentsQuery.isError ||
    transactionsQuery.isError

  if (anyLoading) {
    return (
      <div className="grid grid-cols-1 gap-4">
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  if (anyError) {
    const firstError =
      wellsQuery.error ??
      costCentresQuery.error ??
      departmentsQuery.error ??
      serviceCategoriesQuery.error ??
      wellDepartmentsQuery.error ??
      transactionsQuery.error
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        <p>
          Could not load well cost data. Check your connection to Supabase in Settings → Cloud Sync, and that
          supabase/well_cost_setup.sql has been run.
        </p>
        {firstError && <p className="mt-2 font-mono text-xs opacity-80">{errorMessage(firstError)}</p>}
      </div>
    )
  }

  const canAdd = can("add", "well")
  const canEdit = can("edit", "well")
  const canDelete = can("delete", "well")
  const canLogEntry = can("add", "wellCostEntry")

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <WellSelector wells={wells} selectedWellId={selectedWellId} onSelect={setSelectedWellId} onAddNew={openAddWell} />
        {selectedWell && (
          <Button
            variant="outline"
            size="sm"
            disabled={!canAdd}
            title={canAdd ? "Add department" : "Only Admins can add departments"}
            onClick={() => setDeptDialogOpen(true)}
          >
            <Plus /> Add Department
          </Button>
        )}
      </div>

      {!wells.length ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border p-10 text-center text-muted-foreground">
          <Drill className="size-8" />
          <h4 className="font-medium text-foreground">No wells yet</h4>
          <p className="text-sm">Add a well to start building its cost structure.</p>
        </div>
      ) : selectedWell ? (
        <>
          <div className="rounded-2xl border bg-card p-4 shadow-sm md:rounded-lg md:shadow-none">
            <div className="mb-3 text-sm font-semibold">Well Cost Summary</div>
            <CostSummaryCards rollup={wellRollup} />
            <div className="mt-3">
              <UtilizationBar pct={wellRollup.utilizationPct} />
            </div>
          </div>

          {tabs.length ? (
            <Tabs value={activeDeptId || tabs[0].id} onValueChange={setActiveDeptId}>
              <TabsList>
                {tabs.map((d) => (
                  <TabsTrigger key={d.id} value={d.id}>
                    {d.name}
                  </TabsTrigger>
                ))}
              </TabsList>
              {tabs.map((dept) => {
                const deptItems = wellCostCentres.filter((c) => c.departmentId === dept.id)
                const deptRollup = rollup(deptItems, costCentreTotals)
                const deptServiceCategories = serviceCategories
                  .filter((s) => s.departmentId === dept.id)
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                const grouped = groupByServiceCategory(deptItems)
                const q = search.trim().toLowerCase()

                return (
                  <TabsContent key={dept.id} value={dept.id} className="flex flex-col gap-4">
                    <CostSummaryCards rollup={deptRollup} size="sm" />

                    <div className="relative max-w-sm">
                      <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        className="pl-8"
                        placeholder="Search cost centre, fund centre, description…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>

                    <div className="flex flex-col gap-3">
                      {deptServiceCategories.map((svc) => {
                        const allItems = grouped[svc.id] ?? []
                        const items = allItems.filter(
                          (i) => !q || [i.costCentre, i.fundCentre, i.description].some((v) => (v || "").toLowerCase().includes(q))
                        )
                        return (
                          <div key={svc.id} className="overflow-hidden rounded-2xl border bg-card shadow-sm md:rounded-lg md:shadow-none">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3.5">
                              <span className="text-sm font-semibold">{svc.name}</span>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={!canLogEntry || !allItems.length}
                                  title={
                                    !allItems.length
                                      ? "Add a cost / fund centre first"
                                      : canLogEntry
                                        ? "Import daily costs from Excel"
                                        : "Only Admins/Editors can import entries"
                                  }
                                  onClick={() => setImportServiceCategoryId(svc.id)}
                                >
                                  <Upload /> Import from Excel
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={!canAdd}
                                  title={canAdd ? "Add cost / fund centre" : "Only Admins can add cost / fund centres"}
                                  onClick={() => openAddCostCentre(dept.id, svc.id)}
                                >
                                  <Plus /> Add Cost / Fund Centre
                                </Button>
                              </div>
                            </div>
                            {importServiceCategoryId === svc.id && (
                              <DmrImportDialog
                                open={importServiceCategoryId === svc.id}
                                onOpenChange={(v) => !v && setImportServiceCategoryId(null)}
                                costCentres={allItems}
                                wellName={selectedWell?.name || ""}
                                existingEntries={transactions.filter((t) => allItems.some((c) => c.id === t.costCentreId))}
                                createdByName={user?.name || ""}
                                onImport={handleImportTransactions}
                              />
                            )}
                            {items.length ? (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Cost Centre</TableHead>
                                    <TableHead>Fund Centre</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Budget</TableHead>
                                    <TableHead className="text-right">Actual</TableHead>
                                    <TableHead className="text-right">Commitment</TableHead>
                                    <TableHead className="text-right">Available</TableHead>
                                    <TableHead></TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {items.map((item) => {
                                    const totals = costCentreTotals[item.id] ?? ZERO_TOTALS
                                    const available = availableAmount(Number(item.plannedBudget) || 0, totals)
                                    return (
                                      <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.costCentre}</TableCell>
                                        <TableCell>{item.fundCentre || "—"}</TableCell>
                                        <TableCell className="max-w-48 truncate text-muted-foreground">{item.description || "—"}</TableCell>
                                        <TableCell className="text-right tabular-nums">{fmtCurrency(item.plannedBudget, item.currency)}</TableCell>
                                        <TableCell className="text-right tabular-nums">{fmtCurrency(totals.actual, item.currency)}</TableCell>
                                        <TableCell className="text-right tabular-nums">{fmtCurrency(totals.commitment, item.currency)}</TableCell>
                                        <TableCell className="text-right tabular-nums">{fmtCurrency(available, item.currency)}</TableCell>
                                        <TableCell>
                                          <div className="flex justify-end gap-1">
                                            <button
                                              type="button"
                                              className="rounded-full p-2 hover:bg-muted"
                                              title="Daily cost / commitment log"
                                              onClick={() => navigate(`/well-cost/log/${item.id}`)}
                                            >
                                              <History className="size-4" />
                                            </button>
                                            <button
                                              type="button"
                                              className="rounded-full p-2 hover:bg-muted"
                                              title="View"
                                              onClick={() => openViewCostCentre(item)}
                                            >
                                              <Eye className="size-4" />
                                            </button>
                                            <button
                                              type="button"
                                              className="rounded-full p-2 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                                              title={canEdit ? "Edit" : "Only Admins can edit"}
                                              disabled={!canEdit}
                                              onClick={() => openEditCostCentre(item)}
                                            >
                                              <Pencil className="size-4" />
                                            </button>
                                            <button
                                              type="button"
                                              className="rounded-full p-2 text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-40"
                                              title={canDelete ? "Delete" : "Only Admins can delete"}
                                              disabled={!canDelete}
                                              onClick={() => setDeleteTarget(item)}
                                            >
                                              <Trash2 className="size-4" />
                                            </button>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    )
                                  })}
                                </TableBody>
                              </Table>
                            ) : (
                              <div className="p-6 text-center text-sm text-muted-foreground">
                                {q ? "No cost / fund centres match your search." : "No cost / fund centres yet."}
                              </div>
                            )}
                          </div>
                        )
                      })}

                      <Button
                        variant="outline"
                        className="self-start"
                        disabled={!canAdd}
                        title={canAdd ? "Add service description" : "Only Admins can add service descriptions"}
                        onClick={() => setServiceDialogOpen(true)}
                      >
                        <Plus /> Add Service Description
                      </Button>
                    </div>
                  </TabsContent>
                )
              })}
            </Tabs>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-lg border p-10 text-center text-muted-foreground">
              <Drill className="size-8" />
              <h4 className="font-medium text-foreground">No departments yet</h4>
              <p className="text-sm">Add a department to start this well's cost structure.</p>
            </div>
          )}
        </>
      ) : null}

      <WellDrawer open={wellDrawerOpen} well={null} onOpenChange={setWellDrawerOpen} onSubmit={handleSaveWell} />

      <NameDialog
        open={deptDialogOpen}
        title="Add Department"
        label="Department name"
        placeholder="e.g. Geology"
        submitting={addDepartment.isPending}
        onOpenChange={setDeptDialogOpen}
        onSubmit={handleAddDepartment}
      />

      <NameDialog
        open={serviceDialogOpen}
        title="Add Service Description"
        label="Service description"
        placeholder="e.g. Drilling Fluids"
        submitting={addServiceCategory.isPending}
        onOpenChange={setServiceDialogOpen}
        onSubmit={handleAddServiceCategory}
      />

      {centreDrawer.open && selectedWell && (
        <WellCostCentreDrawer
          open={centreDrawer.open}
          item={centreDrawer.item}
          wellId={selectedWell.id}
          departmentId={centreDrawer.departmentId}
          serviceCategoryId={centreDrawer.serviceCategoryId}
          readOnly={centreDrawer.readOnly}
          onOpenChange={(v) => !v && setCentreDrawer(BLANK_DRAWER_STATE)}
          onSubmit={handleSaveCostCentre}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this cost / fund centre?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && `${deleteTarget.costCentre}${deleteTarget.fundCentre ? ` / ${deleteTarget.fundCentre}` : ""} will be permanently deleted.`}
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
