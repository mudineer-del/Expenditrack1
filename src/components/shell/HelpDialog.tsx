import { useState, useMemo } from "react"
import { Search, X, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useHelpDialogStore } from "@/store/useHelpDialogStore"

const HELP_TOPICS = [
  {
    category: "Getting Started",
    items: [
      {
        title: "Dashboard Overview",
        description: "View key metrics, invoices by status, expense breakdown, and department comparisons. Customize charts by clicking on them for detailed analysis.",
        keywords: ["dashboard", "overview", "metrics", "charts", "statistics"],
      },
      {
        title: "Keyboard Shortcuts",
        description: "Press Cmd+? (Mac) or Ctrl+? (Windows) to view all keyboard shortcuts. Cmd+N for new invoice, Cmd+D for dark mode, Cmd+K for search.",
        keywords: ["shortcuts", "keyboard", "hotkeys", "commands"],
      },
      {
        title: "Search & Command Palette",
        description: "Press Cmd+K or Ctrl+K to open search. Search invoices, vendors, and use 'dept:' prefix to filter by department. Type 'help' for quick tips.",
        keywords: ["search", "palette", "command", "find", "filter", "dept"],
      },
    ],
  },
  {
    category: "Invoices",
    items: [
      {
        title: "Creating Invoices",
        description: "Press Cmd+N or click the + button to create a new invoice. Fill in vendor, amount, date, and department. Use templates to speed up data entry.",
        keywords: ["create", "new invoice", "add", "vendor", "amount", "date"],
      },
      {
        title: "Invoice Templates",
        description: "Save recurring invoice patterns as templates. Click 'Save as Template' on any invoice, then load templates from the dropdown when creating new invoices.",
        keywords: ["template", "save", "reuse", "recurring", "pattern"],
      },
      {
        title: "Duplicate Detection",
        description: "The app automatically detects potential duplicate invoices based on invoice number, vendor+amount+date, or vendor+amount. Review and resolve flagged duplicates.",
        keywords: ["duplicate", "detection", "warning", "match", "resolve"],
      },
      {
        title: "Copy to Clipboard",
        description: "Hover over invoice numbers or vendor names to see copy buttons. Click to copy to clipboard with a confirmation toast.",
        keywords: ["copy", "clipboard", "invoice number", "vendor name"],
      },
      {
        title: "Status Updates",
        description: "Change invoice status (Pending → Approved → Paid) with quick action dropdown. Batch update multiple invoices at once using status checkboxes.",
        keywords: ["status", "pending", "approved", "paid", "update", "batch"],
      },
      {
        title: "Batch Status Updates",
        description: "Select multiple invoices with checkboxes, then use the 'Batch Update' button to change their status all at once.",
        keywords: ["batch", "multiple", "bulk", "update", "select"],
      },
      {
        title: "Invoice Search & Filter",
        description: "Use the search bar to find invoices by number, vendor, or date. Filter by status (All, Pending, Approved, Paid) or department.",
        keywords: ["search", "filter", "find", "invoice number", "vendor", "status"],
      },
      {
        title: "Undo/Redo",
        description: "Changes to invoices are tracked. Use Undo/Redo to revert recent modifications (works within your current session).",
        keywords: ["undo", "redo", "revert", "undo changes", "track"],
      },
    ],
  },
  {
    category: "Vendors & Contracts",
    items: [
      {
        title: "Vendor Management",
        description: "View all vendors and their associated contracts. Search by vendor name or filter by contract status (Active, Inactive, Expired).",
        keywords: ["vendor", "supplier", "contract", "manage", "list"],
      },
      {
        title: "Contract Details",
        description: "Each vendor card shows contract terms, expiration dates, and payment history. Click to view detailed vendor information and all related invoices.",
        keywords: ["contract", "terms", "expiration", "payment", "history"],
      },
      {
        title: "Add Vendor",
        description: "Create a new vendor with name, contact info, and contract details. Set contract start/end dates and payment terms.",
        keywords: ["add vendor", "new vendor", "create", "vendor details"],
      },
    ],
  },
  {
    category: "Reports",
    items: [
      {
        title: "Financial Reports",
        description: "Generate comprehensive financial reports with expense breakdown by department, vendor, or date range. All charts are clickable for drill-down analysis.",
        keywords: ["report", "financial", "expense", "breakdown", "analysis"],
      },
      {
        title: "Invoice Analysis",
        description: "View invoice statistics: total amount, average value, pending count, overdue invoices. Track spending trends over time.",
        keywords: ["invoice", "analysis", "statistics", "trends", "spending"],
      },
      {
        title: "Department Reports",
        description: "Compare spending across departments. View departmental budgets, expenses, and variance analysis. Use filters to focus on specific time periods.",
        keywords: ["department", "comparison", "budget", "variance", "spending"],
      },
      {
        title: "Custom Date Range",
        description: "Select date ranges for reports. View monthly, quarterly, or custom period analysis. Export data for further analysis.",
        keywords: ["date range", "period", "monthly", "quarterly", "export"],
      },
    ],
  },
  {
    category: "Settings & Admin",
    items: [
      {
        title: "User Management",
        description: "Admin: Manage user accounts, assign roles (Admin, Manager, Viewer), and set department access permissions.",
        keywords: ["user", "admin", "role", "permission", "access", "account"],
      },
      {
        title: "Department Settings",
        description: "Configure departments, assign users, and set budget limits. Control who can access which departments.",
        keywords: ["department", "settings", "budget", "limit", "access"],
      },
      {
        title: "Audit Trail",
        description: "View complete activity log of all invoice changes, user actions, and system events. Filter by date, user, or action type.",
        keywords: ["audit", "trail", "activity", "log", "history", "changes"],
      },
      {
        title: "Theme & Appearance",
        description: "Toggle dark/light mode with Cmd+D or click the theme button. Preferences are saved automatically.",
        keywords: ["theme", "dark mode", "light mode", "appearance", "settings"],
      },
      {
        title: "Export & Import",
        description: "Export invoices and reports as CSV or PDF. Import invoice data from spreadsheets (auto-detects and deduplicates).",
        keywords: ["export", "import", "csv", "pdf", "download", "upload"],
      },
    ],
  },
  {
    category: "Tips & Tricks",
    items: [
      {
        title: "Quick Invoice Entry",
        description: "Use Cmd+N to quickly create invoices. Load templates to auto-fill recurring vendor data. Duplicate detection helps prevent entry errors.",
        keywords: ["quick", "entry", "fast", "template", "efficiency"],
      },
      {
        title: "Department Filtering",
        description: "Use 'dept:' prefix in search (e.g., 'dept:Drilling') to quickly filter invoices and data by department.",
        keywords: ["department", "filter", "dept", "prefix", "quick filter"],
      },
      {
        title: "Batch Operations",
        description: "Select multiple invoices to perform bulk actions: status updates, reassign departments, or bulk delete.",
        keywords: ["batch", "bulk", "multiple", "select", "operation"],
      },
      {
        title: "Data Export",
        description: "Export any page to CSV or PDF for reporting and archival. Right-click on tables for export options.",
        keywords: ["export", "csv", "pdf", "report", "download"],
      },
      {
        title: "Mobile Access",
        description: "Access FluidDesk on mobile devices. Sidebar collapses automatically. Install as PWA for offline access.",
        keywords: ["mobile", "responsive", "pwa", "offline", "install"],
      },
    ],
  },
]

export function HelpDialog() {
  const [open, setOpen] = useHelpDialogStore((s) => [s.open, s.setOpen])
  const [searchQuery, setSearchQuery] = useState("")

  const filteredTopics = useMemo(() => {
    if (!searchQuery.trim()) return HELP_TOPICS

    const query = searchQuery.toLowerCase()
    return HELP_TOPICS.map((category) => ({
      ...category,
      items: category.items.filter((item) => {
        const searchText = `${item.title} ${item.description} ${item.keywords.join(" ")}`.toLowerCase()
        return searchText.includes(query)
      }),
    })).filter((category) => category.items.length > 0)
  }, [searchQuery])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>Help & Documentation</DialogTitle>
          <DialogDescription>
            Search for features and get guidance on using FluidDesk
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 px-1">
          <Search className="size-4 text-muted-foreground" />
          <Input
            placeholder="Search topics (e.g., 'invoice', 'duplicate', 'export')..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-0 shadow-none"
            autoFocus
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchQuery("")}
            >
              <X className="size-4" />
            </Button>
          )}
        </div>

        <div className="max-h-[60vh] overflow-y-auto pr-4 space-y-6">
          {filteredTopics.length > 0 ? (
            filteredTopics.map((category) => (
              <div key={category.category}>
                <h3 className="mb-3 text-sm font-semibold text-primary">
                  {category.category}
                </h3>
                <div className="space-y-3">
                  {category.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border bg-card p-3 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <ChevronRight className="size-4 mt-0.5 text-primary flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium leading-tight">
                            {item.title}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No topics found for "{searchQuery}"
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Try searching for: invoice, vendor, report, template, duplicate, or keyboard
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
