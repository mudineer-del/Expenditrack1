import { Archive, ArchiveRestore, Drill, Pencil, Plus, Search, Trash2 } from "lucide-react"
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
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
import { WellDrawer } from "@/components/wells/WellDrawer"
import { WELL_STATUS_OPTIONS, wellStatusTone, WELL_STATUS_TONE_CLASSES } from "@/lib/wellCost"
import { cn, errorMessage } from "@/lib/utils"
import { useAuth } from "@/hooks/useAuth"
import { useDeleteWell, useUpsertWell, useWellsQuery } from "@/hooks/useWells"
import type { Well } from "@/types/well"

const ARCHIVE_FILTER_OPTIONS = ["Active", "Archived", "All"] as const

export default function ManageWellsPage() {
  const { can } = useAuth()
  const navigate = useNavigate()
  const wellsQuery = useWellsQuery()
  const upsertWell = useUpsertWell()
  const deleteWell = useDeleteWell()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingWell, setEditingWell] = useState<Well | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Well | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("All")
  const [archiveFilter, setArchiveFilter] = useState<(typeof ARCHIVE_FILTER_OPTIONS)[number]>("Active")

  const wells = wellsQuery.data ?? []
  const filteredWells = useMemo(() => {
    const q = search.trim().toLowerCase()
    return wells
      .filter((w) => archiveFilter === "All" || (archiveFilter === "Archived" ? w.archived : !w.archived))
      .filter((w) => statusFilter === "All" || w.status === statusFilter)
      .filter((w) => !q || [w.name, w.code, w.field, w.operator].some((field) => (field || "").toLowerCase().includes(q)))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [wells, search, statusFilter, archiveFilter])

  function openAdd() {
    setEditingWell(null)
    setDrawerOpen(true)
  }
  function openEdit(w: Well) {
    setEditingWell(w)
    setDrawerOpen(true)
  }

  function handleSave(record: Well) {
    upsertWell.mutate(record, {
      onSuccess: () => {
        toast.success(editingWell ? "Well updated." : "Well added.")
        setDrawerOpen(false)
        setEditingWell(null)
      },
      onError: (e) => toast.error(errorMessage(e, "Could not save well.")),
    })
  }

  function handleArchiveToggle(w: Well) {
    upsertWell.mutate(
      { ...w, archived: !w.archived },
      {
        onSuccess: () => toast.success(w.archived ? "Well restored." : "Well archived."),
        onError: (e) => toast.error(errorMessage(e, "Could not update well.")),
      }
    )
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return
    deleteWell.mutate(deleteTarget, {
      onSuccess: () => toast.success("Well deleted."),
      onError: (e) => toast.error(errorMessage(e, "Could not delete well.")),
    })
    setDeleteTarget(null)
  }

  if (wellsQuery.isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4">
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  if (wellsQuery.isError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        <p>
          Could not load wells. Check your connection to Supabase in Settings → Cloud Sync, and that
          supabase/well_cost_setup.sql has been run.
        </p>
        <p className="mt-2 font-mono text-xs opacity-80">{errorMessage(wellsQuery.error)}</p>
      </div>
    )
  }

  const canEdit = can("edit", "well")
  const canDelete = can("delete", "well")

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm md:rounded-lg md:shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <h3 className="text-base font-bold md:text-sm md:font-semibold">Wells</h3>
          <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
            <div className="relative w-full max-w-xs">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Search name, code, field, operator…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All statuses</SelectItem>
                {WELL_STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={archiveFilter} onValueChange={(v) => setArchiveFilter(v as (typeof ARCHIVE_FILTER_OPTIONS)[number])}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ARCHIVE_FILTER_OPTIONS.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              disabled={!can("add", "well")}
              title={can("add", "well") ? "Add well" : "Only Admins can add wells"}
              onClick={openAdd}
            >
              <Plus /> Add New Well
            </Button>
          </div>
        </div>

        {filteredWells.length ? (
          <>
            {/* Card list below md, table at md+ — same responsive convention as Vendors & Contracts. */}
            <div className="divide-y divide-border/50 md:hidden">
              {filteredWells.map((w) => {
                const tone = wellStatusTone(w.status)
                return (
                  <div key={w.id} className="p-4" onClick={() => navigate("/well-cost/structure", { state: { wellId: w.id } })}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-[15px] font-semibold">{w.name}</div>
                        <div className="truncate text-[13px] text-muted-foreground">
                          {[w.code, w.field, w.operator].filter(Boolean).join(" · ") || "—"}
                        </div>
                      </div>
                      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", WELL_STATUS_TONE_CLASSES[tone])}>
                        {w.status || "—"}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{w.startDate ? `Start ${w.startDate}` : "No start date"}</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="rounded-full p-2 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                          title={canEdit ? "Edit" : "Only Admins can edit wells"}
                          disabled={!canEdit}
                          onClick={(e) => {
                            e.stopPropagation()
                            openEdit(w)
                          }}
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded-full p-2 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                          title={canEdit ? (w.archived ? "Restore" : "Archive") : "Only Admins can archive wells"}
                          disabled={!canEdit}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleArchiveToggle(w)
                          }}
                        >
                          {w.archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
                        </button>
                        <button
                          type="button"
                          className="rounded-full p-2 text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-40"
                          title={canDelete ? "Delete" : "Only Admins can delete wells"}
                          disabled={!canDelete}
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteTarget(w)
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

            <Table containerClassName="hidden md:block">
              <TableHeader>
                <TableRow>
                  <TableHead>Well</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Field</TableHead>
                  <TableHead>Operator</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWells.map((w) => {
                  const tone = wellStatusTone(w.status)
                  return (
                    <TableRow
                      key={w.id}
                      className="cursor-pointer"
                      onClick={() => navigate("/well-cost/structure", { state: { wellId: w.id } })}
                    >
                      <TableCell className={cn("font-medium", w.archived && "text-muted-foreground")}>{w.name}</TableCell>
                      <TableCell>{w.code || "—"}</TableCell>
                      <TableCell>{w.field || "—"}</TableCell>
                      <TableCell>{w.operator || "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", WELL_STATUS_TONE_CLASSES[tone])}>
                            {w.status || "—"}
                          </span>
                          {w.archived && <span className="text-xs text-muted-foreground">Archived</span>}
                        </div>
                      </TableCell>
                      <TableCell>{w.startDate || "—"}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            className="rounded-full p-2 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                            title={canEdit ? "Edit" : "Only Admins can edit wells"}
                            disabled={!canEdit}
                            onClick={(e) => {
                              e.stopPropagation()
                              openEdit(w)
                            }}
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            type="button"
                            className="rounded-full p-2 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                            title={canEdit ? (w.archived ? "Restore" : "Archive") : "Only Admins can archive wells"}
                            disabled={!canEdit}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleArchiveToggle(w)
                            }}
                          >
                            {w.archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
                          </button>
                          <button
                            type="button"
                            className="rounded-full p-2 text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-40"
                            title={canDelete ? "Delete" : "Only Admins can delete wells"}
                            disabled={!canDelete}
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteTarget(w)
                            }}
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
          </>
        ) : wells.length ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
            <Search className="size-8" />
            <h4 className="font-medium text-foreground">No matching wells</h4>
            <p className="text-sm">Try a different search, status, or archive filter.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
            <Drill className="size-8" />
            <h4 className="font-medium text-foreground">No wells yet</h4>
            <p className="text-sm">Add a new well to get started.</p>
          </div>
        )}
      </div>

      <WellDrawer open={drawerOpen} well={editingWell} onOpenChange={setDrawerOpen} onSubmit={handleSave} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this well?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget &&
                `${deleteTarget.name} and its entire cost structure (all cost/fund centre rows) will be permanently deleted.`}
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
