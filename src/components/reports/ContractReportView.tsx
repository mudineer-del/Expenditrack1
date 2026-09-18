import { Building2, Coins, FileCheck2, Hourglass, Receipt } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ContractorLogo } from "@/components/shared/ContractorLogo"
import { KpiTile } from "@/components/dashboard/KpiTile"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { fmtMoney, vendorColor } from "@/lib/dashboard"
import { getContractorLogo, useContractorLogosQuery } from "@/lib/contractorLogos"
import { aggregate, chartMeasureLabel, reportRows, turnaroundDays, type ReportFilters } from "@/lib/reports"
import { cn } from "@/lib/utils"
import { ChartCard } from "@/components/dashboard/ChartCard"
import { ChartDataQuickMenu } from "@/components/dashboard/ChartDataQuickMenu"
import { ChartFormatMenu } from "@/components/dashboard/ChartFormatMenu"
import { ChartSlotContextMenu } from "@/components/dashboard/ChartSlotContextMenu"
import { ChartVisibilityToggle } from "@/components/dashboard/ChartVisibilityToggle"
import { ChartZoomStepper } from "@/components/dashboard/ChartZoomStepper"
import { ReportMonthlyChart } from "@/components/reports/ReportMonthlyChart"
import { TaBucketChart } from "@/components/reports/TaBucketChart"
import { useDisplayStore } from "@/store/useDisplayStore"
import type { Contract } from "@/types/contract"
import type { Invoice } from "@/types/invoice"

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
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{days}d</span>
}

/** Ported from renderContractReport (index.html:4456-4514). */
export function ContractReportView({
  invoices,
  contracts,
  filters,
  onDrill,
}: {
  invoices: Invoice[]
  contracts: Contract[]
  filters: ReportFilters
  onDrill: (rows: Invoice[], title: string) => void
}) {
  const navigate = useNavigate()
  const bucketMeasure = useDisplayStore((s) => s.chartSlots.contractBuckets.measure)
  const bucketHidden = useDisplayStore((s) => s.chartSlots.contractBuckets.hidden)
  const monthlyMeasure = useDisplayStore((s) => s.chartSlots.contractMonthly.measure)
  const monthlyHidden = useDisplayStore((s) => s.chartSlots.contractMonthly.hidden)
  const tableBanded = useDisplayStore((s) => s.tableBanded)
  const tableHeaderShaded = useDisplayStore((s) => s.tableHeaderShaded)
  const tableGridLines = useDisplayStore((s) => s.tableGridLines)
  const contractorLogosQuery = useContractorLogosQuery()

  if (!filters.contract) {
    return (
      <div className="rounded-lg border bg-card p-10 text-center text-muted-foreground">
        <Building2 className="mx-auto mb-2 size-8" />
        <h4 className="font-medium text-foreground">Select a contract to begin</h4>
        <p className="text-sm">Choose a contract above to see its full financial breakdown, payment status, and invoice turnaround times.</p>
      </div>
    )
  }

  const rows = reportRows(invoices, filters)
  const a = aggregate(rows)
  const c = contracts.find((x) => x.contractNo.trim().toLowerCase() === filters.contract.trim().toLowerCase())
  const cost = Number(c?.value) || 0
  const util = cost > 0 ? Math.min(100, (a.incl / cost) * 100) : null
  const utilColor = util === null ? "var(--muted-foreground)" : util >= 90 ? "var(--status-returned)" : util >= 70 ? "var(--status-under)" : "var(--status-cleared)"
  const vendors = Array.from(new Set(rows.map((r) => r.vendor).filter(Boolean)))

  return (
    <div className="grid gap-4">
      <div className="rounded-lg border bg-card p-4">
        <div className="text-xs font-medium text-muted-foreground">Contract</div>
        <div className="text-lg font-semibold" title={filters.contract}>
          {filters.contract}
        </div>
        <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          <span>{vendors.join(", ") || "—"}</span>
          {c?.status && <StatusBadge status={c.status} />}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
          <KpiTile
            icon={<Receipt />}
            accent="var(--dataviz-1)"
            label="Invoices"
            value={a.count}
            sub={`${a.cleared} cleared`}
            onClick={() => onDrill(rows, `Invoices — ${filters.contract}`)}
          />
          <KpiTile
            icon={<Coins />}
            accent="var(--dataviz-2)"
            label="Value (incl. tax)"
            value={fmtMoney(a.incl)}
            sub={`excl: ${fmtMoney(a.exclTax)}`}
            onClick={() => onDrill(rows, `Invoices — ${filters.contract}`)}
          />
          <KpiTile
            icon={<FileCheck2 />}
            accent="var(--status-cleared)"
            label="Paid"
            value={fmtMoney(a.paid)}
            valueClassName="text-status-cleared"
            sub={`${a.count ? ((a.paid / a.incl) * 100 || 0).toFixed(0) : 0}% of value`}
            onClick={() => onDrill(rows.filter((r) => (Number(r.amountPaid) || 0) > 0), `Paid Invoices — ${filters.contract}`)}
          />
          <KpiTile
            icon={<Hourglass />}
            accent={a.outstanding > 0 ? "var(--status-under)" : "var(--status-cleared)"}
            label="Outstanding"
            value={fmtMoney(a.outstanding)}
            valueClassName={a.outstanding > 0 ? "text-status-under" : "text-status-cleared"}
            sub="unpaid balance"
            onClick={() => onDrill(rows.filter((r) => (Number(r.amountInclTax) || 0) - (Number(r.amountPaid) || 0) > 0), `Outstanding Invoices — ${filters.contract}`)}
          />
          {cost > 0 && (
            <KpiTile
              icon={<Building2 />}
              accent={utilColor}
              label="Contract value"
              value={fmtMoney(cost)}
              sub={`${util!.toFixed(1)}% utilized`}
              onClick={() => onDrill(rows, `Invoices — ${filters.contract}`)}
            />
          )}
        </div>
        {cost > 0 && (
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full" style={{ width: `${util!.toFixed(1)}%`, backgroundColor: utilColor }} />
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          id="contractBuckets"
          accent="var(--dataviz-1)"
          title={bucketMeasure === "count" ? "Turnaround (Clearance Time)" : `${chartMeasureLabel(bucketMeasure)} by Turnaround Bucket`}
          action={
            <>
              <ChartZoomStepper id="contractBuckets" />
              <ChartDataQuickMenu id="contractBuckets" hasDimension={false} />
              <ChartVisibilityToggle id="contractBuckets" />
              <ChartFormatMenu id="contractBuckets" />
              <span className="text-xs text-muted-foreground">Click a bar for details</span>
            </>
          }
        >
          <div className="mb-3 grid grid-cols-5 gap-2 text-center text-xs">
            <div>
              <div className="text-base font-semibold">{a.taAvg !== null ? `${Math.round(a.taAvg)}d` : "—"}</div>
              <div className="text-muted-foreground">Average</div>
            </div>
            <div>
              <div className="text-base font-semibold">{a.taMin !== null ? `${a.taMin}d` : "—"}</div>
              <div className="text-muted-foreground">Fastest</div>
            </div>
            <div>
              <div className="text-base font-semibold">{a.taMax !== null ? `${a.taMax}d` : "—"}</div>
              <div className="text-muted-foreground">Slowest</div>
            </div>
            <div>
              <div className={`text-base font-semibold ${a.delayed ? "text-status-returned" : "text-status-cleared"}`}>{a.delayed}</div>
              <div className="text-muted-foreground">Delayed &gt;30d</div>
            </div>
            <div>
              <div className="text-base font-semibold text-status-under">{a.openItems}</div>
              <div className="text-muted-foreground">Open</div>
            </div>
          </div>
          {!bucketHidden && (
          <ChartSlotContextMenu id="contractBuckets" hasDimension={false}>
            <TaBucketChart rows={rows} measure={bucketMeasure} onBucketClick={onDrill} />
          </ChartSlotContextMenu>
          )}
        </ChartCard>
        {!monthlyHidden && (
        <ChartCard
          id="contractMonthly"
          accent="var(--dataviz-2)"
          title={monthlyMeasure === "incl" ? "Monthly Expenditure" : `${chartMeasureLabel(monthlyMeasure)} by Month`}
          action={
            <>
              <ChartZoomStepper id="contractMonthly" />
              <ChartDataQuickMenu id="contractMonthly" hasDimension={false} />
              <ChartVisibilityToggle id="contractMonthly" />
              <ChartFormatMenu id="contractMonthly" />
              <span className="text-xs text-muted-foreground">Click a bar for details</span>
            </>
          }
        >
          <ChartSlotContextMenu id="contractMonthly" hasDimension={false}>
            <ReportMonthlyChart rows={rows} measure={monthlyMeasure} onMonthClick={onDrill} />
          </ChartSlotContextMenu>
        </ChartCard>
        )}
      </div>

      <div className="rounded-lg border bg-card">
        <div className="border-b p-4">
          <h3 className="text-sm font-semibold">Invoices in this report ({rows.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={cn(tableHeaderShaded && "bg-muted", tableGridLines && "border-r")}>Sr</TableHead>
                <TableHead className={cn(tableHeaderShaded && "bg-muted", tableGridLines && "border-r")}>Invoice No</TableHead>
                <TableHead className={cn(tableHeaderShaded && "bg-muted", tableGridLines && "border-r")}>Contractor</TableHead>
                <TableHead className={cn(tableHeaderShaded && "bg-muted", tableGridLines && "border-r")}>Well</TableHead>
                <TableHead className={cn(tableHeaderShaded && "bg-muted", tableGridLines && "border-r")}>Inv. Date</TableHead>
                <TableHead className={cn(tableHeaderShaded && "bg-muted", tableGridLines && "border-r")}>Cleared</TableHead>
                <TableHead className={cn("text-center", tableHeaderShaded && "bg-muted", tableGridLines && "border-r")}>TA</TableHead>
                <TableHead className={cn("text-right", tableHeaderShaded && "bg-muted", tableGridLines && "border-r")}>Incl. Tax</TableHead>
                <TableHead className={cn("text-right", tableHeaderShaded && "bg-muted", tableGridLines && "border-r")}>Paid</TableHead>
                <TableHead className={cn(tableHeaderShaded && "bg-muted")}>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length ? (
                rows.slice(0, 300).map((r) => (
                  <TableRow
                    key={r.id}
                    className={cn("cursor-pointer", tableBanded && "even:bg-muted/30")}
                    onClick={() => navigate("/invoices", { state: { openInvoiceId: r.id } })}
                  >
                    <TableCell className={cn(tableGridLines && "border-r")}>{r.srNo}</TableCell>
                    <TableCell className={cn(tableGridLines && "border-r")}>{r.invoiceNo}</TableCell>
                    <TableCell className={cn(tableGridLines && "border-r")}>
                      <div className="flex items-center gap-2">
                        <ContractorLogo
                          vendor={r.vendor || "Unknown"}
                          logo={getContractorLogo(contractorLogosQuery.data ?? {}, r.vendor)}
                          color={vendorColor(r.vendor)}
                          size="sm"
                        />
                        <span className="truncate">{r.vendor}</span>
                      </div>
                    </TableCell>
                    <TableCell className={cn(tableGridLines && "border-r")}>{r.wellName || "—"}</TableCell>
                    <TableCell className={cn(tableGridLines && "border-r")}>{r.invoiceDate || "—"}</TableCell>
                    <TableCell className={cn(tableGridLines && "border-r")}>{r.clearanceDate || "—"}</TableCell>
                    <TableCell className={cn("text-center", tableGridLines && "border-r")}>
                      <TaBadge days={turnaroundDays(r)} />
                    </TableCell>
                    <TableCell className={cn("text-right tabular-nums", tableGridLines && "border-r")}>{fmtMoney(r.amountInclTax)}</TableCell>
                    <TableCell className={cn("text-right tabular-nums text-status-cleared", tableGridLines && "border-r")}>{fmtMoney(r.amountPaid)}</TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                    No invoices.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {rows.length > 300 && (
            <p className="p-2 text-xs text-muted-foreground">Showing first 300 of {rows.length}. Export for the full set.</p>
          )}
        </div>
      </div>
    </div>
  )
}



