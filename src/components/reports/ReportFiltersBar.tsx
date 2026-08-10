import { Download, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BLANK_REPORT_FILTERS, GROUP_BY_OPTIONS, reportGroupLabel, type ReportFilters, type ReportMode } from "@/lib/reports"
import type { ReferenceLists } from "@/lib/referenceLists"

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (v: string) => void
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value || "__all__"} onValueChange={(v) => onChange(v === "__all__" ? "" : v)}>
        <SelectTrigger className="w-full">
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

export function ReportFiltersBar({
  mode,
  filters,
  onFiltersChange,
  refLists,
  contractNumbers,
  yearOptions,
  onExportCsv,
}: {
  mode: ReportMode
  filters: ReportFilters
  onFiltersChange: (f: ReportFilters) => void
  refLists: ReferenceLists
  contractNumbers: string[]
  yearOptions: string[]
  onExportCsv: () => void
}) {
  function set<K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) {
    onFiltersChange({ ...filters, [key]: value })
  }
  const hasFilter = Object.entries(filters).some(
    ([k, v]) => k !== "groupBy" && (mode === "contract" ? k !== "contract" : true) && v
  )

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {mode === "contract" && (
          <div className="col-span-2 grid gap-1.5 sm:col-span-3 lg:col-span-2">
            <Label className="text-xs text-muted-foreground">Contract</Label>
            <Select value={filters.contract || "__none__"} onValueChange={(v) => set("contract", v === "__none__" ? "" : v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a contract…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Select a contract —</SelectItem>
                {contractNumbers.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {mode === "period" && (
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Group by</Label>
            <Select value={filters.groupBy} onValueChange={(v) => set("groupBy", v as ReportFilters["groupBy"])}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GROUP_BY_OPTIONS.map((g) => (
                  <SelectItem key={g} value={g}>
                    {reportGroupLabel(g)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <FilterSelect label="Contractor" value={filters.vendor} options={refLists.vendors} onChange={(v) => set("vendor", v)} />
        <FilterSelect label="Service" value={filters.service} options={refLists.services} onChange={(v) => set("service", v)} />
        <FilterSelect label="Type" value={filters.type} options={refLists.types} onChange={(v) => set("type", v)} />
        <FilterSelect label="Region" value={filters.region} options={refLists.regions} onChange={(v) => set("region", v)} />
        <FilterSelect label="Status" value={filters.status} options={refLists.statuses} onChange={(v) => set("status", v)} />
        <FilterSelect label="Well" value={filters.well} options={refLists.wells} onChange={(v) => set("well", v)} />
        <FilterSelect label="Year" value={filters.year} options={yearOptions} onChange={(v) => set("year", v)} />
        <FilterSelect label="Quarter" value={filters.qtr} options={refLists.quarters} onChange={(v) => set("qtr", v)} />
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">From</Label>
          <Input type="date" value={filters.from} onChange={(e) => set("from", e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">To</Label>
          <Input type="date" value={filters.to} onChange={(e) => set("to", e.target.value)} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {hasFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFiltersChange({ ...BLANK_REPORT_FILTERS, contract: mode === "contract" ? filters.contract : "", groupBy: filters.groupBy })}
          >
            <X /> Clear filters
          </Button>
        )}
        <div className="flex-1" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download /> Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onExportCsv}>CSV (.csv)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
