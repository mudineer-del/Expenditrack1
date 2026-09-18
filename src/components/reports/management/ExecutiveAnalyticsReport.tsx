import { ServiceChart } from "@/components/dashboard/ServiceChart"
import { TrendChart } from "@/components/dashboard/TrendChart"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ContractorLogo } from "@/components/shared/ContractorLogo"
import { fmtMoney, vendorColor } from "@/lib/dashboard"
import { getContractorLogo, useContractorLogosQuery } from "@/lib/contractorLogos"
import type { ReportData } from "@/lib/managementReport"
import { cn } from "@/lib/utils"
import { TaBucketChart } from "@/components/reports/TaBucketChart"
import { useDisplayStore } from "@/store/useDisplayStore"
import type { Invoice } from "@/types/invoice"
import { Kpi } from "./ReportPrimitives"

/** Direction B — a dense one-pager: KPI tiles, a chart grid, and a contractor-performance
 *  table. Built for scanning in a meeting rather than reading top to bottom. */
export function ExecutiveAnalyticsReport({
  data,
  onDrill,
}: {
  data: ReportData
  onDrill: (title: string, invoices: Invoice[]) => void
}) {
  const spendDelta = data.prevStats.incl ? ((data.stats.incl - data.prevStats.incl) / data.prevStats.incl) * 100 : null
  const countDelta = data.prevStats.count ? ((data.stats.count - data.prevStats.count) / data.prevStats.count) * 100 : null
  const taDelta = data.stats.taAvg !== null && data.prevStats.taAvg !== null ? data.stats.taAvg - data.prevStats.taAvg : null
  const clearedDelta = data.stats.clearedPct - data.prevStats.clearedPct
  const top = data.contractors[0]
  const topShare = top && data.stats.incl ? (top.incl / data.stats.incl) * 100 : null
  const tableBanded = useDisplayStore((s) => s.tableBanded)
  const tableHeaderShaded = useDisplayStore((s) => s.tableHeaderShaded)
  const tableGridLines = useDisplayStore((s) => s.tableGridLines)
  const contractorLogosQuery = useContractorLogosQuery()

  return (
    <div className="grid gap-5 rounded-lg border bg-card p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
        <div>
          <h1 className="text-lg font-bold">{data.range.label} — Expenditure Analytics</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {data.stats.count} invoices in scope · {data.contractors.length} contractors active
          </p>
        </div>
        <span className="inline-block rounded bg-primary/10 px-2 py-1 text-[11px] font-bold tracking-wide text-primary uppercase">Executive one-pager</span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Period spend" value={fmtMoney(data.stats.incl)} delta={spendDelta === null ? undefined : `${spendDelta >= 0 ? "↑" : "↓"} ${Math.abs(spendDelta).toFixed(1)}%`} tone={spendDelta !== null && spendDelta < 0 ? "good" : undefined} />
        <Kpi label="Invoices" value={String(data.stats.count)} delta={countDelta === null ? undefined : `${countDelta >= 0 ? "↑" : "↓"} ${Math.abs(countDelta).toFixed(1)}%`} />
        <Kpi label="Avg turnaround" value={data.stats.taAvg !== null ? `${data.stats.taAvg.toFixed(1)}d` : "—"} delta={taDelta === null ? undefined : `${taDelta <= 0 ? "↓" : "↑"} ${Math.abs(taDelta).toFixed(1)}d`} tone={taDelta !== null ? (taDelta <= 0 ? "good" : "bad") : undefined} />
        <Kpi label="Outstanding" value={fmtMoney(data.stats.outstanding)} delta={data.stats.incl ? `${((data.stats.outstanding / data.stats.incl) * 100).toFixed(1)}%` : undefined} tone={data.stats.incl && data.stats.outstanding / data.stats.incl > 0.25 ? "bad" : undefined} />
        <Kpi label="Cleared" value={`${data.stats.clearedPct.toFixed(0)}%`} delta={`${clearedDelta >= 0 ? "↑" : "↓"} ${Math.abs(clearedDelta).toFixed(0)}pt`} tone={clearedDelta >= 0 ? "good" : "bad"} />
        <Kpi label="Top contractor" value={topShare !== null ? `${topShare.toFixed(0)}%` : "—"} delta={top?.key} tone={topShare !== null && topShare > 40 ? "bad" : undefined} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-lg border p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-bold">Spend trend</h3>
            <span className="text-[11px] text-muted-foreground">12 {data.period === "week" ? "weeks" : data.period === "fortnight" ? "fortnights" : "months"}</span>
          </div>
          <TrendChart data={data.trend} onDrill={onDrill} />
        </div>
        <div className="rounded-lg border p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-bold">Status split</h3>
            <span className="text-[11px] text-muted-foreground">{data.stats.count} invoices</span>
          </div>
          <ServiceChart data={data.status.map((g) => ({ service: g.key, total: g.incl, invoices: g.rows }))} chartType="pie" onDrill={onDrill} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4">
          <h3 className="mb-2 text-xs font-bold">Spend by contractor</h3>
          <ServiceChart data={data.contractors.slice(0, 6).map((g) => ({ service: g.key, total: g.incl, invoices: g.rows }))} chartType="bar" onDrill={onDrill} />
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="mb-2 text-xs font-bold">Spend by service</h3>
          <ServiceChart data={data.services.slice(0, 6).map((g) => ({ service: g.key, total: g.incl, invoices: g.rows }))} chartType="bar" onDrill={onDrill} />
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="mb-2 text-xs font-bold">Turnaround distribution</h3>
          <TaBucketChart rows={data.rows} measure="count" onBucketClick={(rows, label) => onDrill(label, rows)} />
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <h3 className="mb-3 text-xs font-bold">Contractor performance</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={cn(tableHeaderShaded && "bg-muted", tableGridLines && "border-r")}>Contractor</TableHead>
                <TableHead className={cn("text-right", tableHeaderShaded && "bg-muted", tableGridLines && "border-r")}>Spend</TableHead>
                <TableHead className={cn("text-right", tableHeaderShaded && "bg-muted", tableGridLines && "border-r")}>Invoices</TableHead>
                <TableHead className={cn("text-right", tableHeaderShaded && "bg-muted", tableGridLines && "border-r")}>Avg clearance</TableHead>
                <TableHead className={cn("text-right", tableHeaderShaded && "bg-muted")}>Outstanding</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.contractors.slice(0, 8).map((g) => (
                <TableRow key={g.key} className={cn("cursor-pointer", tableBanded && "even:bg-muted/30")} onClick={() => onDrill(`Invoices — ${g.key}`, g.rows)}>
                  <TableCell className={cn("font-medium", tableGridLines && "border-r")}>
                    <div className="flex items-center gap-2">
                      <ContractorLogo
                        vendor={g.key || "Unknown"}
                        logo={getContractorLogo(contractorLogosQuery.data ?? {}, g.key)}
                        color={vendorColor(g.key)}
                        size="sm"
                      />
                      <span className="truncate">{g.key}</span>
                    </div>
                  </TableCell>
                  <TableCell className={cn("text-right tabular-nums", tableGridLines && "border-r")}>{fmtMoney(g.incl)}</TableCell>
                  <TableCell className={cn("text-right tabular-nums", tableGridLines && "border-r")}>{g.count}</TableCell>
                  <TableCell className={cn("text-right tabular-nums", tableGridLines && "border-r")}>{g.taAvg !== null ? `${Math.round(g.taAvg)}d` : "—"}</TableCell>
                  <TableCell className={`text-right tabular-nums font-semibold ${g.outstanding > 0 ? "text-status-under" : "text-status-cleared"}`}>{fmtMoney(g.outstanding)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
