import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ChartCard } from "@/components/dashboard/ChartCard"
import { ChartTypeMenu, CHART_OPTIONS } from "@/components/dashboard/ChartTypeMenu"
import { InvoiceListDialog } from "@/components/dashboard/InvoiceListDialog"
import { ServiceChart } from "@/components/dashboard/ServiceChart"
import { TrendChart } from "@/components/dashboard/TrendChart"
import { ContractorLogo } from "@/components/shared/ContractorLogo"
import { avgLeadTime, fmtMoney, monthlyTrend, serviceBreakdown } from "@/lib/dashboard"
import { CONTRACT_TONE_CLASSES, contractExpenditure, contractStatusTone, daysUntil, invoicesForContract, utilizationColor } from "@/lib/contracts"
import { cn } from "@/lib/utils"
import { useDisplayStore } from "@/store/useDisplayStore"
import type { Contract } from "@/types/contract"
import type { Invoice } from "@/types/invoice"

/** Vendor-level analytics — everything about one contractor's spend, trend and contracts
 *  in one place, opened by clicking its card on Vendors & Contracts. Reuses the same
 *  ChartCard/TrendChart/ServiceChart/InvoiceListDialog machinery as the Dashboard so this
 *  reads as the same product (same chart-type menus, same tooltips/axis formatting), just
 *  pre-filtered to one contractor instead of the whole department. */
export function VendorDetailSheet({
  open,
  vendor,
  color,
  logo,
  invoices,
  contracts,
  onOpenChange,
  onViewContract,
}: {
  open: boolean
  vendor: string | null
  color: string
  logo?: string
  /** Already department-scoped, NOT vendor-filtered — this component does its own filtering
   *  so the "% of department spend" figure has the right denominator. */
  invoices: Invoice[]
  contracts: Contract[]
  onOpenChange: (open: boolean) => void
  onViewContract: (contract: Contract) => void
}) {
  const navigate = useNavigate()
  const trendChartType = useDisplayStore((s) => s.trendChartType)
  const serviceChartType = useDisplayStore((s) => s.serviceChartType)
  const setChartType = useDisplayStore((s) => s.setChartType)
  const [drill, setDrill] = useState<{ title: string; invoices: Invoice[] } | null>(null)

  if (!vendor) return <Dialog open={open} onOpenChange={onOpenChange} />

  const rows = invoices.filter((r) => (r.vendor || "Unknown") === vendor)
  const vContracts = contracts.filter((c) => c.vendor === vendor).sort((a, b) => a.contractNo.localeCompare(b.contractNo))
  const total = rows.reduce((s, r) => s + (Number(r.amountInclTax) || 0), 0)
  const deptTotal = invoices.reduce((s, r) => s + (Number(r.amountInclTax) || 0), 0) || 1
  const sharePct = (total / deptTotal) * 100
  const lead = avgLeadTime(rows)
  const cleared = rows.filter((r) => (r.status || "").toLowerCase().includes("cleared")).length
  const activeContracts = vContracts.filter((c) => c.status === "Active")
  const contractsCost = vContracts.reduce((s, c) => s + (Number(c.value) || 0), 0)

  const trend = monthlyTrend(rows)
  const byService = serviceBreakdown(rows)
  const topService = byService[0]

  const onDrill = (title: string, drillInvoices: Invoice[]) => setDrill({ title, invoices: drillInvoices })

  const report =
    rows.length > 0
      ? `${vendor} has logged ${rows.length.toLocaleString()} invoice${rows.length !== 1 ? "s" : ""} totaling ${fmtMoney(total)} — ${sharePct.toFixed(1)}% of all tracked spend in this department. ` +
        (topService ? `The largest category is ${topService.service} at ${fmtMoney(topService.total)}. ` : "") +
        (lead !== null ? `Invoices clear in ${lead} day${lead !== 1 ? "s" : ""} on average. ` : "") +
        (activeContracts.length
          ? `${activeContracts.length} active contract${activeContracts.length !== 1 ? "s" : ""} on file worth ${fmtMoney(contractsCost)}.`
          : "No active contracts on file.")
      : `No invoices logged against ${vendor} yet in this department.`

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[88vh] w-full overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <ContractorLogo vendor={vendor} logo={logo} color={color} size="lg" />
              <div className="min-w-0">
                <DialogTitle className="truncate">{vendor}</DialogTitle>
                <DialogDescription>
                  {rows.length.toLocaleString()} invoice{rows.length !== 1 ? "s" : ""} · {fmtMoney(total)} · {sharePct.toFixed(1)}% of department spend
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3 text-sm sm:grid-cols-4">
              <div>
                <div className="text-xs text-muted-foreground">Expenditure incl. tax</div>
                <div className="font-semibold tabular-nums" style={{ color }}>{fmtMoney(total)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Avg. clearance</div>
                <div className="font-semibold tabular-nums">{lead !== null ? `${lead}d` : "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Cleared</div>
                <div className="font-semibold tabular-nums">{cleared} / {rows.length}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Active contracts</div>
                <div className="font-semibold tabular-nums">{activeContracts.length}</div>
              </div>
            </div>

            <p className="rounded-lg border-l-2 bg-muted/20 p-3 text-sm text-foreground/90" style={{ borderColor: color }}>
              {report}
            </p>

            {rows.length > 0 && (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <ChartCard
                  accent="var(--dataviz-1)"
                  title="Spending Trend"
                  action={<ChartTypeMenu options={CHART_OPTIONS.trend} value={trendChartType} onChange={(t) => setChartType("trendChartType", t)} />}
                >
                  <TrendChart data={trend} onDrill={onDrill} />
                </ChartCard>
                <ChartCard
                  accent="var(--dataviz-3)"
                  title="Expenditure by Service"
                  action={<ChartTypeMenu options={CHART_OPTIONS.service} value={serviceChartType} onChange={(t) => setChartType("serviceChartType", t)} />}
                >
                  <ServiceChart data={byService} chartType={serviceChartType} onDrill={onDrill} />
                </ChartCard>
              </div>
            )}

            <div>
              <h4 className="mb-2 text-sm font-semibold">Contract highlights</h4>
              <div className="max-h-64 overflow-y-auto rounded-lg border">
                {vContracts.length ? (
                  <div className="divide-y">
                    {vContracts.map((c) => {
                      const cost = Number(c.value) || 0
                      const spent = contractExpenditure(invoices, c.contractNo)
                      const pct = cost > 0 ? Math.min(100, (spent / cost) * 100) : 0
                      const barColor = utilizationColor(pct)
                      const tone = contractStatusTone(c.status)
                      const daysLeft = daysUntil(c.endDate)
                      const contractLead = avgLeadTime(invoicesForContract(invoices, c.contractNo))
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => onViewContract(c)}
                          className="flex w-full flex-col gap-1.5 p-3 text-left text-sm hover:bg-muted"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate font-medium">{c.contractNo}</span>
                            <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", CONTRACT_TONE_CLASSES[tone])}>
                              {c.status || "—"}
                            </span>
                          </div>
                          {cost > 0 && (
                            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                              <div className="h-full rounded-full" style={{ width: `${pct.toFixed(1)}%`, backgroundColor: barColor }} />
                            </div>
                          )}
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{cost > 0 ? `${fmtMoney(spent)} of ${fmtMoney(cost)} (${pct.toFixed(0)}%)` : `${fmtMoney(spent)} spent`}</span>
                            <span>
                              {contractLead !== null ? `${contractLead}d lead` : "—"}
                              {daysLeft !== null && (daysLeft < 0 ? " · expired" : ` · ${daysLeft}d left`)}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <p className="p-4 text-center text-sm text-muted-foreground">No contracts on file for this vendor yet.</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false)
                navigate("/invoices", { state: { vendorFilter: vendor } })
              }}
            >
              View all invoices
            </Button>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InvoiceListDialog open={!!drill} onOpenChange={(v) => !v && setDrill(null)} title={drill?.title ?? ""} invoices={drill?.invoices ?? []} />
    </>
  )
}
