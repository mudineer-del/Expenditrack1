import { Calendar, DollarSign, FileText } from "lucide-react"
import { useState } from "react"
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
import { ChartDataQuickMenu } from "@/components/dashboard/ChartDataQuickMenu"
import { ChartSlotContextMenu } from "@/components/dashboard/ChartSlotContextMenu"
import { ChartVisibilityToggle } from "@/components/dashboard/ChartVisibilityToggle"
import { ChartZoomStepper } from "@/components/dashboard/ChartZoomStepper"
import { ChartTypeMenu, CHART_OPTIONS } from "@/components/dashboard/ChartTypeMenu"
import { InvoiceListDialog } from "@/components/dashboard/InvoiceListDialog"
import { ServiceChart } from "@/components/dashboard/ServiceChart"
import { TrendChart } from "@/components/dashboard/TrendChart"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { ContractorLogo } from "@/components/shared/ContractorLogo"
import { cn } from "@/lib/utils"
import { avgLeadTime, fmtMoney, serviceBreakdown, vendorColor } from "@/lib/dashboard"
import { CONTRACT_TONE_CLASSES, contractExpenditure, contractStatusTone, daysUntil, invoicesForContract, utilizationColor } from "@/lib/contracts"
import { chartMeasureLabel, formatGroupKey, groupRows, reportGroupLabel, seriesFromGroups } from "@/lib/reports"
import { useDisplayStore } from "@/store/useDisplayStore"
import type { Contract } from "@/types/contract"
import type { Invoice } from "@/types/invoice"

/** Immersive contract detail view — everything about one contract in one place, opened by clicking its row.
 *  Carries the same narrative-report + chart treatment as VendorDetailSheet, scoped to this one contract's
 *  invoices instead of a whole vendor's. */
export function ContractDetailSheet({
  open,
  contract,
  invoices,
  onOpenChange,
  onEdit,
  canEdit,
  logo,
}: {
  open: boolean
  contract: Contract | null
  invoices: Invoice[]
  onOpenChange: (open: boolean) => void
  onEdit: () => void
  canEdit: boolean
  logo?: string
}) {
  const trendChartType = useDisplayStore((s) => s.trendChartType)
  const serviceChartType = useDisplayStore((s) => s.serviceChartType)
  const setChartType = useDisplayStore((s) => s.setChartType)
  const chartSlots = useDisplayStore((s) => s.chartSlots)
  const [drill, setDrill] = useState<{ title: string; invoices: Invoice[] } | null>(null)
  const [maximized, setMaximized] = useState(false)
  const rows = contract
    ? invoicesForContract(invoices, contract.contractNo).sort((a, b) => (b.invoiceDate || "").localeCompare(a.invoiceDate || ""))
    : []

  function handleOpenChange(v: boolean) {
    if (!v) setMaximized(false)
    onOpenChange(v)
  }

  if (!contract) return <Dialog open={open} onOpenChange={onOpenChange} />

  const cost = Number(contract.value) || 0
  const spent = contractExpenditure(invoices, contract.contractNo)
  const pct = cost > 0 ? Math.min(100, (spent / cost) * 100) : 0
  const barColor = utilizationColor(pct)
  const lead = avgLeadTime(rows)
  const primaryVendor = (contract.vendor || "").split("/")[0].trim()
  const color = vendorColor(primaryVendor)
  const tone = contractStatusTone(contract.status)
  const daysLeft = daysUntil(contract.endDate)

  const trendCfg = chartSlots.contractSheetTrend
  const trend = seriesFromGroups(groupRows(rows, trendCfg.dimension ?? "month"), trendCfg.dimension ?? "month", trendCfg.measure).map((p) => ({
    month: formatGroupKey(trendCfg.dimension ?? "month", p.key),
    key: p.key,
    total: p.value,
    invoices: p.invoices,
  }))
  const serviceCfg = chartSlots.contractSheetService
  const byService = seriesFromGroups(groupRows(rows, serviceCfg.dimension ?? "service"), serviceCfg.dimension ?? "service", serviceCfg.measure).map(
    (p) => ({ service: formatGroupKey(serviceCfg.dimension ?? "service", p.key), total: p.value, invoices: p.invoices })
  )
  // The narrative report always describes the real "by service, $" breakdown — independent
  // of what the chart card itself is currently configured to show.
  const topService = serviceBreakdown(rows)[0]
  const onDrill = (title: string, drillInvoices: Invoice[]) => setDrill({ title, invoices: drillInvoices })

  const report =
    rows.length > 0
      ? `${rows.length.toLocaleString()} invoice${rows.length !== 1 ? "s" : ""} logged against this contract, totaling ${fmtMoney(spent)}` +
        (cost > 0 ? ` — ${pct.toFixed(1)}% of its ${fmtMoney(cost)} value.` : ".") +
        (topService ? ` The largest category is ${topService.service} at ${fmtMoney(topService.total)}.` : "") +
        (lead !== null ? ` Invoices clear in ${lead} day${lead !== 1 ? "s" : ""} on average.` : "") +
        (daysLeft !== null ? (daysLeft < 0 ? " This contract has expired." : ` ${daysLeft} day${daysLeft !== 1 ? "s" : ""} remain on it.`) : "")
      : "No invoices logged against this contract yet."

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-h-[88vh] w-full overflow-y-auto sm:max-w-2xl"
        maximizable
        maximized={maximized}
        onMaximizedChange={setMaximized}
      >
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span className="mt-1 h-10 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
            <div className="min-w-0">
              <DialogTitle className="flex flex-wrap items-center gap-2">
                {contract.contractNo}
                <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", CONTRACT_TONE_CLASSES[tone])}>
                  {contract.status || "—"}
                </span>
              </DialogTitle>
              <DialogDescription className="truncate">{contract.title || "No title"}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="flex items-center gap-2">
              <ContractorLogo vendor={primaryVendor || contract.vendor} logo={logo} color={color} size="sm" />
              <div>
                <div className="text-xs text-muted-foreground">Vendor</div>
                <div className="font-medium">{contract.vendor || "—"}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Contract Period</div>
                <div className="font-medium">
                  {contract.startDate || "—"} → {contract.endDate || "—"}
                  {daysLeft !== null && (
                    <span className={cn("ml-1", daysLeft < 0 ? "text-destructive" : daysLeft <= 30 ? "text-status-under" : "text-muted-foreground")}>
                      ({daysLeft < 0 ? "expired" : `${daysLeft}d left`})
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="size-4 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Avg. Clearance Lead</div>
                <div className="font-medium">{lead !== null ? `${lead} days` : "—"}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Invoices Logged</div>
                <div className="font-medium">{rows.length}</div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Utilization</span>
              <span className="font-medium">
                {fmtMoney(spent)} {cost > 0 && <>/ {fmtMoney(cost)}</>}
              </span>
            </div>
            {cost > 0 ? (
              <>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct.toFixed(1)}%`, backgroundColor: barColor }} />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{pct.toFixed(1)}% utilized · {fmtMoney(Math.max(0, cost - spent))} remaining</div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">No contract value set.</p>
            )}
          </div>

          <p className="rounded-lg border-l-2 bg-muted/20 p-3 text-sm text-foreground/90" style={{ borderColor: color }}>
            {report}
          </p>

          {rows.length > 0 && (!trendCfg.hidden || !serviceCfg.hidden) && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {!trendCfg.hidden && (
              <ChartCard
                accent="var(--dataviz-1)"
                title={(trendCfg.dimension && trendCfg.dimension !== "month") || trendCfg.measure !== "incl"
                  ? `${chartMeasureLabel(trendCfg.measure)} by ${reportGroupLabel(trendCfg.dimension ?? "month")}`
                  : "Spending Trend"}
                action={
                  <div className="flex items-center gap-0.5">
                    <ChartZoomStepper id="contractSheetTrend" />
                    <ChartDataQuickMenu id="contractSheetTrend" hasDimension />
                    <ChartVisibilityToggle id="contractSheetTrend" />
                    <ChartTypeMenu options={CHART_OPTIONS.trend} value={trendChartType} onChange={(t) => setChartType("trendChartType", t)} />
                  </div>
                }
              >
                <ChartSlotContextMenu
                  id="contractSheetTrend"
                  hasDimension
                  hasZoom
                  chartTypeOptions={CHART_OPTIONS.trend}
                  chartTypeValue={trendChartType}
                  onChartTypeChange={(t) => setChartType("trendChartType", t)}
                >
                  <TrendChart data={trend} onDrill={onDrill} zoomEnabled={trendCfg.zoomEnabled ?? true} />
                </ChartSlotContextMenu>
              </ChartCard>
              )}
              {!serviceCfg.hidden && (
              <ChartCard
                accent="var(--dataviz-3)"
                title={(serviceCfg.dimension && serviceCfg.dimension !== "service") || serviceCfg.measure !== "incl"
                  ? `${chartMeasureLabel(serviceCfg.measure)} by ${reportGroupLabel(serviceCfg.dimension ?? "service")}`
                  : "Expenditure by Service"}
                action={
                  <div className="flex items-center gap-0.5">
                    <ChartZoomStepper id="contractSheetService" />
                    <ChartDataQuickMenu id="contractSheetService" hasDimension />
                    <ChartVisibilityToggle id="contractSheetService" />
                    <ChartTypeMenu options={CHART_OPTIONS.service} value={serviceChartType} onChange={(t) => setChartType("serviceChartType", t)} />
                  </div>
                }
              >
                <ChartSlotContextMenu
                  id="contractSheetService"
                  hasDimension
                  chartTypeOptions={CHART_OPTIONS.service}
                  chartTypeValue={serviceChartType}
                  onChartTypeChange={(t) => setChartType("serviceChartType", t)}
                >
                  <ServiceChart data={byService} chartType={serviceChartType} onDrill={onDrill} />
                </ChartSlotContextMenu>
              </ChartCard>
              )}
            </div>
          )}

          <div>
            <h4 className="mb-2 text-sm font-semibold">Invoices on this contract</h4>
            <div className="max-h-72 overflow-y-auto rounded-lg border">
              {rows.length ? (
                <div className="divide-y divide-border/50">
                  {rows.map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-3 p-2.5 text-sm">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{r.invoiceNo || `#${r.srNo}`}</div>
                        <div className="text-xs text-muted-foreground">{r.invoiceDate || "—"}</div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="tabular-nums text-xs">{fmtMoney(r.amountInclTax)}</span>
                        <StatusBadge status={r.status} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="p-4 text-center text-sm text-muted-foreground">No invoices logged against this contract yet.</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={onEdit}
            disabled={!canEdit}
            title={canEdit ? "Edit contract" : "Only Admins can edit contracts"}
          >
            Edit Contract
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

