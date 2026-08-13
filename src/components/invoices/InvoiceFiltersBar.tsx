import {
  ArrowDownAZ,
  Building2,
  Calendar,
  CalendarDays,
  CircleCheck,
  FileText,
  Filter,
  MapPin,
  Search,
  UserCircle,
  Wrench,
  X,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BLANK_FILTERS, type InvoiceFilters, type SortState } from "@/lib/invoiceFilters"
import type { ReferenceLists } from "@/lib/referenceLists"
import type { Invoice } from "@/types/invoice"

const SORT_OPTIONS: Array<[keyof Invoice, string]> = [
  ["srNo", "Sr#"], ["vendor", "Vendor"], ["invoiceNo", "Invoice No."], ["wellName", "Well Name"],
  ["service", "Service"], ["region", "Region"], ["invoiceDate", "Invoice Date"],
  ["amountExclTax", "Excl. Tax"], ["amountInclTax", "Incl. Tax"], ["amountPaid", "Paid"], ["status", "Status"],
]

const FILTER_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"]

function FilterSelect({
  label,
  icon: Icon,
  color,
  value,
  options,
  onChange,
}: {
  label: string
  icon: typeof Building2
  color: string
  value: string
  options: string[]
  onChange: (v: string) => void
}) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center gap-1.5 text-xs font-medium">
        <span className="flex size-5 items-center justify-center rounded-full" style={{ backgroundColor: `color-mix(in oklch, ${color} 18%, transparent)` }}>
          <Icon className="size-3" style={{ color }} />
        </span>
        {label}
      </div>
      <Select value={value || "__all__"} onValueChange={(v) => onChange(v === "__all__" ? "" : v)}>
        <SelectTrigger className="w-full" style={value ? { borderColor: color } : undefined}>
          <SelectValue placeholder="All" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All</SelectItem>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function InvoiceFiltersBar({
  filters,
  onFiltersChange,
  sort,
  onSortChange,
  refLists,
  contractNumbers,
  yearOptions,
  enteredByOptions,
}: {
  filters: InvoiceFilters
  onFiltersChange: (f: InvoiceFilters) => void
  sort: SortState
  onSortChange: (s: SortState) => void
  refLists: ReferenceLists
  contractNumbers: string[]
  yearOptions: string[]
  enteredByOptions: string[]
}) {
  const activeCount = (
    ["vendor", "service", "contract", "status", "region", "year", "qtr", "enteredBy"] as const
  ).filter((k) => filters[k]).length
  const hasFilter = activeCount > 0 || !!filters.q

  function set<K extends keyof InvoiceFilters>(key: K, value: InvoiceFilters[K]) {
    onFiltersChange({ ...filters, [key]: value })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[240px] flex-1">
        <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="Search invoice no., vendor, description, location…"
          value={filters.q}
          onChange={(e) => set("q", e.target.value)}
        />
      </div>

      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={activeCount > 0 ? "border-primary/50 text-primary" : undefined}
          >
            <Filter /> Filters
            {activeCount > 0 && <Badge variant="secondary">{activeCount}</Badge>}
          </Button>
        </DialogTrigger>
        <DialogContent className="border-t-4 sm:max-w-lg" style={{ borderTopColor: "var(--chart-1)" }}>
          <DialogHeader>
            <DialogTitle>Filter invoices</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <FilterSelect label="Vendor" icon={Building2} color={FILTER_COLORS[0]} value={filters.vendor} options={refLists.vendors} onChange={(v) => set("vendor", v)} />
            <FilterSelect label="Service" icon={Wrench} color={FILTER_COLORS[1]} value={filters.service} options={refLists.services} onChange={(v) => set("service", v)} />
            <FilterSelect label="Contract" icon={FileText} color={FILTER_COLORS[2]} value={filters.contract} options={contractNumbers} onChange={(v) => set("contract", v)} />
            <FilterSelect label="Status" icon={CircleCheck} color={FILTER_COLORS[3]} value={filters.status} options={refLists.statuses} onChange={(v) => set("status", v)} />
            <FilterSelect label="Region" icon={MapPin} color={FILTER_COLORS[4]} value={filters.region} options={refLists.regions} onChange={(v) => set("region", v)} />
            <FilterSelect label="Year" icon={Calendar} color={FILTER_COLORS[0]} value={filters.year} options={yearOptions} onChange={(v) => set("year", v)} />
            <FilterSelect label="Quarter" icon={CalendarDays} color={FILTER_COLORS[1]} value={filters.qtr} options={refLists.quarters} onChange={(v) => set("qtr", v)} />
            <FilterSelect label="Uploaded By" icon={UserCircle} color={FILTER_COLORS[2]} value={filters.enteredBy} options={enteredByOptions} onChange={(v) => set("enteredBy", v)} />
          </div>
        </DialogContent>
      </Dialog>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <ArrowDownAZ /> Sort
          </Button>
        </PopoverTrigger>
        <PopoverContent className="grid w-56 gap-1" align="start">
          <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">Sort by</p>
          {SORT_OPTIONS.map(([key, label]) => (
            <Button
              key={key}
              variant={sort.key === key ? "secondary" : "ghost"}
              size="sm"
              className="justify-start"
              onClick={() => onSortChange({ ...sort, key })}
            >
              {label}
            </Button>
          ))}
          <div className="my-1 border-t" />
          <div className="flex gap-1 px-1">
            <Button
              variant={sort.dir === "asc" ? "secondary" : "ghost"}
              size="sm"
              className="flex-1"
              onClick={() => onSortChange({ ...sort, dir: "asc" })}
            >
              Ascending
            </Button>
            <Button
              variant={sort.dir === "desc" ? "secondary" : "ghost"}
              size="sm"
              className="flex-1"
              onClick={() => onSortChange({ ...sort, dir: "desc" })}
            >
              Descending
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {hasFilter && (
        <Button variant="ghost" size="sm" onClick={() => onFiltersChange(BLANK_FILTERS)}>
          <X /> Clear
        </Button>
      )}
    </div>
  )
}
