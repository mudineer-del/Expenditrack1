import { Building2 } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { fmtMoney } from "@/lib/dashboard"
import { aggregate, reportRows, turnaroundDays, type ReportFilters } from "@/lib/reports"
import { ReportMonthlyChart } from "@/components/reports/ReportMonthlyChart"
import { TaBucketChart } from "@/components/reports/TaBucketChart"
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
          <button type="button" className="cursor-pointer rounded-md p-1 text-left transition-colors hover:bg-muted/60" onClick={() => onDrill(rows, `Invoices — ${filters.contract}`)}>
            <div className="text-xs text-muted-foreground">Invoices</div>
            <div className="text-lg font-semibold">{a.count}</div>
            <div className="text-xs text-muted-foreground">{a.cleared} cleared</div>
          </button>
          <button type="button" className="cursor-pointer rounded-md p-1 text-left transition-colors hover:bg-muted/60" onClick={() => onDrill(rows, `Invoices — ${filters.contract}`)}>
            <div className="text-xs text-muted-foreground">Value (incl. tax)</div>
            <div className="text-lg font-semibold">{fmtMoney(a.incl)}</div>
            <div className="text-xs text-muted-foreground">excl: {fmtMoney(a.exclTax)}</div>
          </button>
          <button
            type="button"
            className="cursor-pointer rounded-md p-1 text-left transition-colors hover:bg-muted/60"
            onClick={() => onDrill(rows.filter((r) => (Number(r.amountPaid) || 0) > 0), `Paid Invoices — ${filters.contract}`)}
          >
            <div className="text-xs text-muted-foreground">Paid</div>
            <div className="text-lg font-semibold text-status-cleared">{fmtMoney(a.paid)}</div>
            <div className="text-xs text-muted-foreground">{a.count ? ((a.paid / a.incl) * 100 || 0).toFixed(0) : 0}% of value</div>
          </button>
          <button
            type="button"
            className="cursor-pointer rounded-md p-1 text-left transition-colors hover:bg-muted/60"
            onClick={() => onDrill(rows.filter((r) => (Number(r.amountInclTax) || 0) - (Number(r.amountPaid) || 0) > 0), `Outstanding Invoices — ${filters.contract}`)}
          >
            <div className="text-xs text-muted-foreground">Outstanding</div>
            <div className={`text-lg font-semibold ${a.outstanding > 0 ? "text-status-under" : "text-status-cleared"}`}>
              {fmtMoney(a.outstanding)}
            </div>
            <div className="text-xs text-muted-foreground">unpaid balance</div>
          </button>
          {cost > 0 && (
            <button type="button" className="cursor-pointer rounded-md p-1 text-left transition-colors hover:bg-muted/60" onClick={() => onDrill(rows, `Invoices — ${filters.contract}`)}>
              <div className="text-xs text-muted-foreground">Contract value</div>
              <div className="text-lg font-semibold">{fmtMoney(cost)}</div>
              <div className="text-xs" style={{ color: utilColor }}>
                {util!.toFixed(1)}% utilized
              </div>
            </button>
          )}
        </div>
        {cost > 0 && (
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full" style={{ width: `${util!.toFixed(1)}%`, backgroundColor: utilColor }} />
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Turnaround (Clearance Time)</h3>
            <span className="text-xs text-muted-foreground">Click a bar for details</span>
          </div>
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
          <TaBucketChart rows={rows} onBucketClick={onDrill} />
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Monthly Expenditure</h3>
            <span className="text-xs text-muted-foreground">Click a bar for details</span>
          </div>
          <ReportMonthlyChart rows={rows} onMonthClick={onDrill} />
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="border-b p-4">
          <h3 className="text-sm font-semibold">Invoices in this report ({rows.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sr</TableHead>
                <TableHead>Invoice No</TableHead>
                <TableHead>Contractor</TableHead>
                <TableHead>Well</TableHead>
                <TableHead>Inv. Date</TableHead>
                <TableHead>Cleared</TableHead>
                <TableHead className="text-center">TA</TableHead>
                <TableHead className="text-right">Incl. Tax</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length ? (
                rows.slice(0, 300).map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer"
                    onClick={() => navigate("/invoices", { state: { openInvoiceId: r.id } })}
                  >
                    <TableCell>{r.srNo}</TableCell>
                    <TableCell>{r.invoiceNo}</TableCell>
                    <TableCell>{r.vendor}</TableCell>
                    <TableCell>{r.wellName || "—"}</TableCell>
                    <TableCell>{r.invoiceDate || "—"}</TableCell>
                    <TableCell>{r.clearanceDate || "—"}</TableCell>
                    <TableCell className="text-center">
                      <TaBadge days={turnaroundDays(r)} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{fmtMoney(r.amountInclTax)}</TableCell>
                    <TableCell className="text-right tabular-nums text-status-cleared">{fmtMoney(r.amountPaid)}</TableCell>
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



