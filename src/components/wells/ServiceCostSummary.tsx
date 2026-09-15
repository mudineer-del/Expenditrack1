import { AlertTriangle, ListTree, Sparkles, Wallet } from "lucide-react"
import { useMemo } from "react"
import { KpiTile } from "@/components/dashboard/KpiTile"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { utilizationColor } from "@/lib/contracts"
import { budgetStatus, fmtCurrency, type ServiceCatalogRow } from "@/lib/wellCost"

/** "Well Cost Summary" for every service in the catalog — Drilling Fluids, Cementation,
 *  Directional Drilling, and so on — not just the ones that already have spend logged
 *  (see buildServiceCatalogSummary's own comment for why that's a different list than the
 *  "Spend by Service" donut above uses). Four at-a-glance stats plus the full table, same
 *  shape as the Wells table below it: every row is a service, not a well. */
export function ServiceCostSummary({ rows, currency = "USD" }: { rows: ServiceCatalogRow[]; currency?: string }) {
  const stats = useMemo(() => {
    const inUse = rows.filter((r) => r.budget > 0 || r.actual > 0 || r.commitment > 0)
    const overBudget = rows.filter((r) => ["Over budget", "Spend without budget"].includes(budgetStatus(r.budget, r.actual + r.commitment)))
    const top = rows.reduce<ServiceCatalogRow | null>((best, r) => {
      const spend = r.actual + r.commitment
      return spend > 0 && (!best || spend > best.actual + best.commitment) ? r : best
    }, null)
    return { inUse: inUse.length, overBudget: overBudget.length, top }
  }, [rows])

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile icon={<ListTree />} label="Services in Catalog" value={rows.length} accent="var(--dataviz-2)" />
        <KpiTile icon={<Sparkles />} label="Services in Use" value={stats.inUse} sub={`of ${rows.length} total`} accent="var(--dataviz-4)" />
        <KpiTile
          icon={<Wallet />}
          label="Top Service by Spend"
          value={stats.top ? stats.top.name : "—"}
          valueClassName="text-base md:text-[length:var(--tile-value)]"
          sub={stats.top ? fmtCurrency(stats.top.actual + stats.top.commitment, currency) : undefined}
          accent="var(--chart-3)"
        />
        <KpiTile
          icon={<AlertTriangle />}
          label="Budget Alerts"
          value={stats.overBudget}
          sub={stats.overBudget === 1 ? "service" : "services"}
          accent="var(--status-returned)"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm md:rounded-lg md:shadow-none">
        <div className="border-b p-4">
          <h3 className="text-base font-bold md:text-sm md:font-semibold">Well Cost Summary — All Services</h3>
          <p className="text-xs text-muted-foreground">All services for the selected currency, across non-archived wells. Alerts include spending without a budget.</p>
        </div>
        {rows.length ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Commitments</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead>Utilization</TableHead>
                  <TableHead>Budget Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="text-muted-foreground">{row.departmentName}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtCurrency(row.budget, currency)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtCurrency(row.actual, currency)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtCurrency(row.commitment, currency)}</TableCell>
                    <TableCell className={`text-right tabular-nums ${row.available < 0 ? "text-destructive" : ""}`}>
                      {fmtCurrency(row.available, currency)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${Math.max(0, Math.min(100, row.utilizationPct)).toFixed(1)}%`, backgroundColor: utilizationColor(row.utilizationPct) }}
                          />
                        </div>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {row.budget > 0 ? `${row.utilizationPct.toFixed(0)}%` : "—"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className={row.available < 0 ? "text-destructive" : "text-muted-foreground"}>
                      {budgetStatus(row.budget, row.actual + row.commitment)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="p-10 text-center text-sm text-muted-foreground">No service categories in the catalog yet.</div>
        )}
      </div>
    </div>
  )
}
