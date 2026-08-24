import { Eye, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ContractorLogo } from "@/components/shared/ContractorLogo"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { fmtMoney, vendorColor } from "@/lib/dashboard"
import { getContractorLogo, type ContractorLogos } from "@/lib/contractorLogos"
import type { Invoice } from "@/types/invoice"
import { cn } from "@/lib/utils"

function turnaround(r: Invoice): number | null {
  if (!r.receivingDate || !r.clearanceDate) return null
  const d1 = new Date(r.receivingDate)
  const d2 = new Date(r.clearanceDate)
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null
  return Math.round((d2.getTime() - d1.getTime()) / 86400000)
}

interface InvoiceCardProps {
  invoice: Invoice
  contractorLogos: ContractorLogos
  isSelected?: boolean
  canEdit?: boolean
  canDelete?: boolean
  onSelect?: (invoice: Invoice) => void
  onView: (invoice: Invoice) => void
  onEdit: (invoice: Invoice) => void
  onDelete: (invoice: Invoice) => void
}

export function InvoiceCard({
  invoice,
  contractorLogos,
  isSelected = false,
  canEdit = false,
  canDelete = false,
  onView,
  onEdit,
  onDelete,
}: InvoiceCardProps) {
  const tat = turnaround(invoice)
  const tatColor =
    tat === null
      ? "text-muted-foreground"
      : tat <= 15
        ? "text-status-cleared"
        : tat <= 30
          ? "text-primary"
          : tat <= 60
            ? "text-status-under"
            : "text-status-returned"

  const accent = vendorColor(invoice.vendor)

  return (
    <Card
      className={cn(
        "relative cursor-pointer overflow-hidden transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] active:duration-100",
        isSelected && "ring-2 ring-primary"
      )}
      style={{ borderColor: `color-mix(in oklch, ${accent} 20%, var(--border))` }}
      onClick={() => onView(invoice)}
    >
      <span className="absolute top-0 left-0 h-full w-1" style={{ backgroundColor: accent }} />
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <ContractorLogo
                vendor={invoice.vendor || "Unknown"}
                logo={getContractorLogo(contractorLogos, invoice.vendor)}
                color={vendorColor(invoice.vendor)}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold truncate">{invoice.vendor || "Unknown"}</p>
                <p className="text-xs text-muted-foreground truncate">{invoice.invoiceNo}</p>
              </div>
            </div>
            <StatusBadge status={invoice.status} />
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Well</p>
              <p className="font-medium truncate">{invoice.wellName || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Service</p>
              <p className="font-medium truncate">{invoice.service || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Invoice Date</p>
              <p className="font-medium">{invoice.invoiceDate || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Region</p>
              <p className="font-medium">{invoice.region || "—"}</p>
            </div>
          </div>

          {/* Amount */}
          <div className="border-t pt-3">
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Excl. Tax</p>
                <p className="font-medium tabular-nums">{fmtMoney(invoice.amountExclTax)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Incl. Tax</p>
                <p className="font-bold tabular-nums">{fmtMoney(invoice.amountInclTax)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Paid</p>
                <p className="font-medium tabular-nums">{fmtMoney(invoice.amountPaid)}</p>
              </div>
            </div>
          </div>

          {/* TAT & Actions */}
          <div className="flex items-center justify-between gap-2 border-t pt-3">
            <div>
              <p className="text-xs text-muted-foreground">TAT</p>
              <p className={cn("font-medium text-sm", tatColor)}>{tat !== null ? `${tat}d` : "—"}</p>
            </div>
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onView(invoice)}
                title="View"
                className="h-8 w-8 p-0"
              >
                <Eye className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={!canEdit}
                onClick={() => onEdit(invoice)}
                title={canEdit ? "Edit" : "Only Editors and Admins can edit"}
                className="h-8 w-8 p-0"
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={!canDelete}
                onClick={() => onDelete(invoice)}
                title={canDelete ? "Delete" : "Only Admins can delete"}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

