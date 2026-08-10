import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { Eye, Pencil, Trash2 } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { fmtMoney, vendorColor } from "@/lib/dashboard"
import { StatusBadge } from "@/components/shared/StatusBadge"
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
      ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
      : days <= 30
        ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
        : days <= 60
          ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
          : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", cls)}>{days}d</span>
}

const columnHelper = createColumnHelper<Invoice>()

export function InvoicesTable({
  rows,
  canBulk,
  canEdit,
  canDelete,
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
  selected: Set<string>
  onToggleSelect: (id: string) => void
  onToggleSelectAll: (checked: boolean) => void
  onView: (inv: Invoice) => void
  onEdit: (inv: Invoice) => void
  onDelete: (inv: Invoice) => void
}) {
  const allSelected = canBulk && rows.length > 0 && rows.every((r) => selected.has(r.id))
  const someSelected = canBulk && rows.some((r) => selected.has(r.id))

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
            <span
              className="flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{ backgroundColor: vendorColor(r.vendor) }}
            >
              {(r.vendor || "?").slice(0, 2).toUpperCase()}
            </span>
            {r.vendor}
          </div>
        )
      },
    }),
    columnHelper.display({ id: "invoiceNo", header: "Invoice No.", size: 140, cell: ({ row }) => row.original.invoiceNo }),
    columnHelper.display({
      id: "wellName",
      header: "Well Name",
      size: 140,
      cell: ({ row }) => row.original.wellName || "—",
    }),
    columnHelper.display({ id: "service", header: "Service", size: 130, cell: ({ row }) => row.original.service || "—" }),
    columnHelper.display({ id: "region", header: "Region", size: 90, cell: ({ row }) => row.original.region || "—" }),
    columnHelper.display({ id: "invoiceDate", header: "Invoice Date", size: 110, cell: ({ row }) => row.original.invoiceDate || "—" }),
    columnHelper.display({
      id: "amountExclTax",
      header: "Excl. Tax",
      size: 110,
      cell: ({ row }) => <span className="font-mono">{fmtMoney(row.original.amountExclTax)}</span>,
    }),
    columnHelper.display({
      id: "amountInclTax",
      header: "Incl. Tax",
      size: 110,
      cell: ({ row }) => <span className="font-mono font-medium">{fmtMoney(row.original.amountInclTax)}</span>,
    }),
    columnHelper.display({
      id: "amountPaid",
      header: "Paid",
      size: 110,
      cell: ({ row }) => <span className="font-mono">{fmtMoney(row.original.amountPaid)}</span>,
    }),
    columnHelper.display({
      id: "status",
      header: "Status",
      size: 140,
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
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
            {canEdit && (
              <button className="rounded p-1 hover:bg-muted" title="Edit" onClick={() => onEdit(r)}>
                <Pencil className="size-4" />
              </button>
            )}
            {canDelete && (
              <button className="rounded p-1 text-destructive hover:bg-destructive/10" title="Delete" onClick={() => onDelete(r)}>
                <Trash2 className="size-4" />
              </button>
            )}
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

  return (
    <div className="overflow-x-auto">
      <Table style={{ width: table.getTotalSize() }}>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {canBulk && (
                <TableHead style={{ width: 36 }}>
                  <Checkbox
                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                    onCheckedChange={(v) => onToggleSelectAll(!!v)}
                  />
                </TableHead>
              )}
              {hg.headers.map((header) => (
                <TableHead
                  key={header.id}
                  style={{ width: header.getSize(), position: "relative" }}
                  className="select-none"
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
              <TableRow key={row.id} data-state={selected.has(row.original.id) ? "selected" : undefined}>
                {canBulk && (
                  <TableCell style={{ width: 36 }}>
                    <Checkbox checked={selected.has(row.original.id)} onCheckedChange={() => onToggleSelect(row.original.id)} />
                  </TableCell>
                )}
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} style={{ width: cell.column.getSize() }}>
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
    </div>
  )
}
