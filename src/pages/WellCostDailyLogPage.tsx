import { ArrowLeft, Eye, FileClock, Pencil, Plus, Search, Trash2 } from "lucide-react"
import { useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { WellCostTransactionDrawer } from "@/components/wells/WellCostTransactionDrawer"
import { fmtCurrency } from "@/lib/wellCost"
import { cn, errorMessage } from "@/lib/utils"
import { useAuth } from "@/hooks/useAuth"
import { useWellCostCentresQuery } from "@/hooks/useWellCostCentres"
import {
  useDeleteWellCostTransaction,
  useUpsertWellCostTransaction,
  useWellCostTransactionsQuery,
} from "@/hooks/useWellCostTransactions"
import { useWellsQuery } from "@/hooks/useWells"
import type { WellCostTransaction, WellCostTransactionKind } from "@/types/wellCost"

const TYPE_FILTERS = ["All", "Actual", "Commitment"] as const

interface DrawerState {
  open: boolean
  entry: WellCostTransaction | null
  defaultKind: WellCostTransactionKind
  readOnly: boolean
}

const BLANK_DRAWER: DrawerState = { open: false, entry: null, defaultKind: "actual", readOnly: false }

/** The full daily cost/commitment log for one Cost/Fund Centre — its own page (not a
 *  slide-in panel), so it can show a proper searchable/filterable table with real row
 *  actions instead of being squeezed into a side card. Actual Cost and Commitments shown
 *  everywhere else in Well Cost are always the sum of the entries logged here. */
export default function WellCostDailyLogPage() {
  const { costCentreId } = useParams<{ costCentreId: string }>()
  const navigate = useNavigate()
  const { can, user } = useAuth()

  const wellsQuery = useWellsQuery()
  const costCentresQuery = useWellCostCentresQuery()
  const transactionsQuery = useWellCostTransactionsQuery()
  const upsertTransaction = useUpsertWellCostTransaction()
  const deleteTransaction = useDeleteWellCostTransaction()

  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<(typeof TYPE_FILTERS)[number]>("All")
  const [drawer, setDrawer] = useState<DrawerState>(BLANK_DRAWER)
  const [deleteTarget, setDeleteTarget] = useState<WellCostTransaction | null>(null)

  const costCentres = costCentresQuery.data ?? []
  const wells = wellsQuery.data ?? []
  const allTransactions = transactionsQuery.data ?? []

  const costCentre = costCentres.find((c) => c.id === costCentreId) ?? null
  const well = costCentre ? (wells.find((w) => w.id === costCentre.wellId) ?? null) : null

  const entries = useMemo(() => allTransactions.filter((t) => t.costCentreId === costCentreId), [allTransactions, costCentreId])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return entries
      .filter((e) => typeFilter === "All" || e.kind === typeFilter.toLowerCase())
      .filter((e) => !q || [e.notes, e.remarks, e.createdByName, e.entryDate].some((v) => (v || "").toLowerCase().includes(q)))
      .sort((a, b) => b.entryDate.localeCompare(a.entryDate))
  }, [entries, search, typeFilter])

  const totalActual = entries.filter((e) => e.kind === "actual").reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const totalCommitment = entries.filter((e) => e.kind === "commitment").reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const currency = costCentre?.currency || "USD"

  function goBack() {
    navigate("/well-cost/structure", well ? { state: { wellId: well.id } } : undefined)
  }

  function openAdd(kind: WellCostTransactionKind = "actual") {
    setDrawer({ open: true, entry: null, defaultKind: kind, readOnly: false })
  }
  function openView(entry: WellCostTransaction) {
    setDrawer({ open: true, entry, defaultKind: entry.kind, readOnly: true })
  }
  function openEdit(entry: WellCostTransaction) {
    setDrawer({ open: true, entry, defaultKind: entry.kind, readOnly: !can("edit", "wellCostEntry") })
  }

  function handleSave(record: WellCostTransaction) {
    upsertTransaction.mutate(record, {
      onSuccess: () => {
        toast.success(drawer.entry ? "Entry updated." : "Entry logged.")
        setDrawer(BLANK_DRAWER)
      },
      onError: (e) => toast.error(errorMessage(e, "Could not save entry.")),
    })
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return
    deleteTransaction.mutate(deleteTarget, {
      onSuccess: () => toast.success("Entry deleted."),
      onError: (e) => toast.error(errorMessage(e, "Could not delete entry.")),
    })
    setDeleteTarget(null)
  }

  const anyLoading = wellsQuery.isLoading || costCentresQuery.isLoading || transactionsQuery.isLoading
  const anyError = wellsQuery.isError || costCentresQuery.isError || transactionsQuery.isError

  if (anyLoading) {
    return (
      <div className="grid grid-cols-1 gap-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  if (anyError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        Could not load the cost log. Check your connection to Supabase in Settings → Cloud Sync.
      </div>
    )
  }

  if (!costCentre) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border p-10 text-center text-muted-foreground">
        <FileClock className="size-8" />
        <h4 className="font-medium text-foreground">Cost centre not found</h4>
        <p className="text-sm">It may have been deleted.</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={() => navigate("/well-cost/structure")}>
          <ArrowLeft /> Back to Well Cost Structure
        </Button>
      </div>
    )
  }

  const canAdd = can("add", "wellCostEntry")
  const canEdit = can("edit", "wellCostEntry")
  const canDelete = can("delete", "wellCostEntry")

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <button
            type="button"
            onClick={goBack}
            className="mb-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> Well Cost {well ? `› ${well.name}` : ""} › Structure
          </button>
          <h2 className="truncate text-lg font-semibold">{costCentre.costCentre} — Daily Cost Log</h2>
          <p className="truncate text-sm text-muted-foreground">
            {costCentre.description || "—"}
            {costCentre.fundCentre ? ` · Fund Centre ${costCentre.fundCentre}` : ""}
          </p>
        </div>
        <Button
          disabled={!canAdd}
          title={canAdd ? "Log a cost entry" : "Only Admins/Editors can log entries"}
          onClick={() => openAdd()}
        >
          <Plus /> Add Entry
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-3.5">
          <div className="text-xs text-muted-foreground">Total Actual</div>
          <div className="mt-0.5 truncate text-lg font-semibold tabular-nums">{fmtCurrency(totalActual, currency)}</div>
        </div>
        <div className="rounded-xl border bg-card p-3.5">
          <div className="text-xs text-muted-foreground">Total Commitment</div>
          <div className="mt-0.5 truncate text-lg font-semibold tabular-nums">{fmtCurrency(totalCommitment, currency)}</div>
        </div>
        <div className="rounded-xl border bg-card p-3.5">
          <div className="text-xs text-muted-foreground">Budget</div>
          <div className="mt-0.5 truncate text-lg font-semibold tabular-nums">{fmtCurrency(costCentre.plannedBudget, currency)}</div>
        </div>
        <div className="rounded-xl border bg-card p-3.5">
          <div className="text-xs text-muted-foreground">Entries</div>
          <div className="mt-0.5 truncate text-lg font-semibold tabular-nums">{entries.length}</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm md:rounded-lg md:shadow-none">
        <div className="flex flex-wrap items-center gap-2 border-b p-4">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search notes, remarks, logged by, date…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as (typeof TYPE_FILTERS)[number])}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_FILTERS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filtered.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Remarks</TableHead>
                <TableHead>Logged by</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap">{entry.entryDate}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        entry.kind === "actual" ? "status-tone-cleared" : "status-tone-under"
                      )}
                    >
                      {entry.kind === "actual" ? "Actual" : "Commitment"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{fmtCurrency(entry.amount, currency)}</TableCell>
                  <TableCell className="max-w-64 truncate text-muted-foreground">{entry.notes || "—"}</TableCell>
                  <TableCell className="max-w-64 truncate text-muted-foreground" title={entry.remarks || undefined}>
                    {entry.remarks ? entry.remarks.split("\n")[0] : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{entry.createdByName || "—"}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        className="rounded-full p-2 hover:bg-muted"
                        title="View"
                        onClick={() => openView(entry)}
                      >
                        <Eye className="size-4" />
                      </button>
                      <button
                        type="button"
                        className="rounded-full p-2 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                        title={canEdit ? "Edit" : "Only Admins/Editors can edit"}
                        disabled={!canEdit}
                        onClick={() => openEdit(entry)}
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        className="rounded-full p-2 text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-40"
                        title={canDelete ? "Delete" : "Only Admins can delete"}
                        disabled={!canDelete}
                        onClick={() => setDeleteTarget(entry)}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : entries.length ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
            <Search className="size-8" />
            <h4 className="font-medium text-foreground">No matching entries</h4>
            <p className="text-sm">Try a different search or type filter.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
            <FileClock className="size-8" />
            <h4 className="font-medium text-foreground">No entries logged yet</h4>
            <p className="text-sm">Add one, or import daily costs from Excel back on the Structure page.</p>
          </div>
        )}
      </div>

      {drawer.open && (
        <WellCostTransactionDrawer
          open={drawer.open}
          entry={drawer.entry}
          costCentreId={costCentreId || ""}
          defaultKind={drawer.defaultKind}
          createdByName={user?.name || ""}
          readOnly={drawer.readOnly}
          onOpenChange={(v) => !v && setDrawer(BLANK_DRAWER)}
          onSubmit={handleSave}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && `The ${deleteTarget.kind} entry of ${deleteTarget.amount} on ${deleteTarget.entryDate} will be permanently deleted.`}
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
