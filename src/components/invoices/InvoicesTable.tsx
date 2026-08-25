import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { Eye, Pencil, Trash2 } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { ContractorLogo } from "@/components/shared/ContractorLogo"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { fmtMoney, vendorColor } from "@/lib/dashboard"
import { getContractorLogo, type ContractorLogos } from "@/lib/contractorLogos"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { useDisplayStore } from "@/store/useDisplayStore"
import { useIsMobile } from "@/hooks/use-mobile"
import { InvoiceCard } from "@/components/invoices/InvoiceCard"
import type { Invoice } from "@/types/invoice"

function turnaround(r: Invoice): number | null {
  if (!r.receivingDate || !r.clearanceDate) return null
  const d1 = new Date(r.receivingDate)
  const d2 = new Date(r.clearanceDate)
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null
  return Math.round((d2.getTime() - d1.getTime()) / 86400000)
}

function TaBadge({ days }: { days: number | null }) {
  if (days === null) return <span className="text-muted-foreground">—</span>
  const cls =
    days <= 15
      ? "status-tone-cleared"
      : days <= 30
        ? "bg-primary/10 text-primary"
        : days <= 60
          ? "status-tone-under"
          : "status-tone-returned"
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", cls)}>{days}d</span>
}

const columnHelper = createColumnHelper<Invoice>()

export function InvoicesTable({
  rows,
  canBulk,
  canEdit,
  canDelete,
  contractorLogos,
  selected,
  onToggleSelect,
  onToggleSelectAll,
  onView,
  onEdit,
  onDelete,
}: {
  rows: Invoice[]
  canBulk: boolean
  canEdit: boolean
  canDelete: boolean
  contractorLogos: ContractorLogos
  selected: Set<string>
  onToggleSelect: (id: string) => void
  onToggleSelectAll: (checked: boolean) => void
  onView: (inv: Invoice) => void
  onEdit: (inv: Invoice) => void
  onDelete: (inv: Invoice) => void
}) {
  const isMobile = useIsMobile()
  const allSelected = canBulk && rows.length > 0 && rows.every((r) => selected.has(r.id))
  const someSelected = canBulk && rows.some((r) => selected.has(r.id))
  const tableBanded = useDisplayStore((s) => s.tableBanded)
  const tableHeaderShaded = useDisplayStore((s) => s.tableHeaderShaded)
  const tableGridLines = useDisplayStore((s) => s.tableGridLines)

  const columns = [
    columnHelper.display({
      id: "srNo",
      header: "Sr#",
      size: 60,
      cell: ({ row }) => row.original.srNo,
    }),
    columnHelper.display({
      id: "vendor",
      header: "Vendor",
      size: 160,
      cell: ({ row }) => {
        const r = row.original
        return (
          <div className="flex items-center gap-2">
            <ContractorLogo vendor={r.vendor || "Unknown"} logo={getContractorLogo(contractorLogos, r.vendor)} color={vendorColor(r.vendor)} size="sm" />
            <span className="font-medium">{r.vendor}</span>
          </div>
        )
      },
    }),
    columnHelper.display({
      id: "invoiceNo",
      header: "Invoice No.",
      size: 140,
      cell: ({ row }) => <span className="font-medium">{row.original.invoiceNo}</span>,
    }),
    columnHelper.display({
      id: "wellName",
      header: "Well Name",
      size: 140,
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.wellName || "—"}</span>,
    }),
    columnHelper.display({
      id: "service",
      header: "Service",
      size: 130,
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.service || "—"}</span>,
    }),
    columnHelper.display({
      id: "region",
      header: "Region",
      size: 90,
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.region || "—"}</span>,
    }),
    columnHelper.display({
      id: "invoiceDate",
      header: "Invoice Date",
      size: 110,
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.invoiceDate || "—"}</span>,
    }),
    columnHelper.display({
      id: "amountExclTax",
      header: "Excl. Tax",
      size: 110,
      cell: ({ row }) => <span className="tabular-nums">{fmtMoney(row.original.amountExclTax)}</span>,
    }),
    columnHelper.display({
      id: "amountInclTax",
      header: "Incl. Tax",
      size: 110,
      cell: ({ row }) => <span className="tabular-nums font-medium">{fmtMoney(row.original.amountInclTax)}</span>,
    }),
    columnHelper.display({
      id: "amountPaid",
      header: "Paid",
      size: 110,
      cell: ({ row }) => <span className="tabular-nums">{fmtMoney(row.original.amountPaid)}</span>,
    }),
    columnHelper.display({
      id: "status",
      header: "Status",
      size: 140,
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    }),
    columnHelper.display({
      id: "enteredBy",
      header: "Entered By",
      size: 130,
      cell: ({ row }) => {
        const r = row.original
        return (
          <span
            className="truncate text-muted-foreground"
            title={r.updatedByName && r.updatedByName !== r.createdByName ? `Last edited by ${r.updatedByName}` : undefined}
          >
            {r.createdByName || "—"}
          </span>
        )
      },
    }),
    columnHelper.display({
      id: "tat",
      header: "TAT",
      size: 70,
      cell: ({ row }) => <TaBadge days={turnaround(row.original)} />,
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      size: 100,
      enableResizing: false,
      cell: ({ row }) => {
        const r = row.original
        return (
          <div className="flex justify-end gap-1">
            <button className="rounded p-1 hover:bg-muted" title="View" onClick={() => onView(r)}>
              <Eye className="size-4" />
            </button>
            <button
              className="rounded p-1 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              title={canEdit ? "Edit" : "Only Editors and Admins can edit invoices"}
              disabled={!canEdit}
              onClick={() => onEdit(r)}
            >
              <Pencil className="size-4" />
            </button>
            <button
              className="rounded p-1 text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-40"
              title={canDelete ? "Delete" : "Only Admins can delete invoices"}
              disabled={!canDelete}
              onClick={() => onDelete(r)}
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        )
      },
    }),
  ]

  const table = useReactTable({
    data: rows,
    columns,
    columnResizeMode: "onChange",
    getCoreRowModel: getCoreRowModel(),
  })

  // Mobile card view
  if (isMobile) {
    return (
      <div className="space-y-3 pb-20">
        {rows.length ? (
          rows.map((invoice, i) => (
            // Staggered entrance, capped at the first dozen rows — beyond that the
            // cumulative delay would just make a long list feel sluggish to load.
            <div
              key={invoice.id}
              className="animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-backwards duration-300 ease-out motion-reduce:animate-none"
              style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}
            >
              <InvoiceCard
                invoice={invoice}
                contractorLogos={contractorLogos}
                isSelected={selected.has(invoice.id)}
                canEdit={canEdit}
                canDelete={canDelete}
                onView={onView}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            <p className="text-sm">No matching invoices. Try adjusting your filters or search terms.</p>
          </div>
        )}
      </div>
    )
  }

  return (
    // Bounded height on Table's own scroll container (not a second wrapper div around it —
    // nesting one would put a non-scrolling overflow-x-auto div between this and the sticky
    // header, silently defeating position: sticky) — a genuine scrolling ancestor for the
    // sticky header to stick against, since an unbounded-height auto-overflow div never
    // actually scrolls.
    <Table containerClassName="max-h-[65vh] overflow-y-auto rounded-md" style={{ width: table.getTotalSize() }}>
        {/* Sticky while scrolling a long list. Applied per-<th> rather than on <thead> itself
            — thead is more prone to browser layout quirks that silently defeat sticky, while
            individual header cells stick reliably. Each needs its own opaque background
            regardless of the tableHeaderShaded toggle, otherwise rows scrolling underneath
            show through. */}
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {canBulk && (
                <TableHead
                  style={{ width: 36 }}
                  className={cn("sticky top-0 z-10", tableHeaderShaded ? "bg-muted" : "bg-card", tableGridLines && "border-r")}
                >
                  <Checkbox
                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                    onCheckedChange={(v) => onToggleSelectAll(!!v)}
                  />
                </TableHead>
              )}
              {hg.headers.map((header) => (
                <TableHead
                  key={header.id}
                  style={{ width: header.getSize() }}
                  className={cn(
                    "sticky top-0 z-10 select-none",
                    tableHeaderShaded ? "bg-muted" : "bg-card",
                    tableGridLines && "border-r last:border-r-0"
                  )}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {header.column.getCanResize() && (
                    <div
                      onMouseDown={header.getResizeHandler()}
                      onTouchStart={header.getResizeHandler()}
                      className="absolute top-0 right-0 h-full w-1 cursor-col-resize touch-none select-none hover:bg-primary/40"
                    />
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={selected.has(row.original.id) ? "selected" : undefined}
                className={cn("cursor-pointer border-border/50", tableBanded && "even:bg-muted/30")}
                onClick={() => onView(row.original)}
              >
                {canBulk && (
                  <TableCell style={{ width: 36 }} className={cn(tableGridLines && "border-r")} onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={selected.has(row.original.id)} onCheckedChange={() => onToggleSelect(row.original.id)} />
                  </TableCell>
                )}
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    style={{ width: cell.column.getSize() }}
                    className={cn(tableGridLines && "border-r last:border-r-0")}
                    onClick={cell.column.id === "actions" ? (e) => e.stopPropagation() : undefined}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length + (canBulk ? 1 : 0)} className="h-32 text-center text-muted-foreground">
                No matching invoices. Try adjusting your filters or search terms.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
  )
}



