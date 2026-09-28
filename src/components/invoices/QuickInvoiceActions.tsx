import { CheckCircle2, Clock, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Invoice } from "@/types/invoice"

export function QuickInvoiceActions({
  invoice,
  onStatusChange,
}: {
  invoice: Invoice
  onStatusChange?: (newStatus: string) => void
}) {
  const currentStatus = (invoice.status || "").toLowerCase()

  // Show different quick actions based on status
  const quickActions = []

  if (!currentStatus.includes("cleared")) {
    quickActions.push({
      label: "Mark Cleared",
      icon: CheckCircle2,
      status: "Cleared",
      color: "text-green-600",
    })
  }

  if (!currentStatus.includes("under")) {
    quickActions.push({
      label: "Under Clearance",
      icon: Clock,
      status: "Under Clearance",
      color: "text-amber-600",
    })
  }

  if (!currentStatus.includes("returned")) {
    quickActions.push({
      label: "Mark Returned",
      icon: RotateCcw,
      status: "Returned",
      color: "text-red-600",
    })
  }

  if (quickActions.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2 text-xs opacity-0 transition-opacity group-hover:opacity-100"
          title="Quick status change"
        >
          Quick Actions
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {quickActions.map((action) => (
          <DropdownMenuItem
            key={action.status}
            onClick={() => onStatusChange?.(action.status)}
            className="cursor-pointer"
          >
            <action.icon className={`size-4 mr-2 ${action.color}`} />
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
