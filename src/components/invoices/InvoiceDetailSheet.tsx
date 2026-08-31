import { useState } from "react"
import { CheckCircle2, Circle, PenSquare } from "lucide-react"
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
import { ChartFormatMenu } from "@/components/dashboard/ChartFormatMenu"
import { ChartSlotContextMenu } from "@/components/dashboard/ChartSlotContextMenu"
import { ChartVisibilityToggle } from "@/components/dashboard/ChartVisibilityToggle"
import { ChartZoomStepper } from "@/components/dashboard/ChartZoomStepper"
import { ChartTypeMenu, CHART_OPTIONS } from "@/components/dashboard/ChartTypeMenu"
import { InvoiceListDialog } from "@/components/dashboard/InvoiceListDialog"
import { ServiceChart } from "@/components/dashboard/ServiceChart"
import { TrendChart } from "@/components/dashboard/TrendChart"
import { ContractorLogo } from "@/components/shared/ContractorLogo"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { fmtMoney, vendorColor } from "@/lib/dashboard"
import { chartMeasureLabel, formatGroupKey, groupRows, reportGroupLabel, seriesFromGroups, turnaroundDays } from "@/lib/reports"
import { useDisplayStore } from "@/store/useDisplayStore"
import type { Invoice } from "@/types/invoice"

function fmtDate(d: string | undefined): string {
  if (!d) return "—"
  const parsed = new Date(d)
  if (isNaN(parsed.getTime())) return d
  return parsed.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })
}

/** One invoice's own detail, given the same narrative + chart treatment as
 *  VendorDetailSheet/ContractDetailSheet — a single invoice has no trend of its own, so the
 *  two charts here show *its vendor's* spending trend / service breakdown (same chart-slot
 *  config, same right-click customization) for context: is this invoice typical for that
 *  contractor, or an outlier? Reuses the exact ChartCard/TrendChart/ServiceChart/
 *  InvoiceListDialog machinery the other two sheets use, so it reads as the same product. */
export function InvoiceDetailSheet({
  open,
  invoice,
  invoices,
  contractorLogos,
  onOpenChange,
  onEdit,
}: {
  open: boolean
  invoice: Invoice | null
  /** Department-scoped, NOT vendor-filtered — this component filters to the invoice's own
   *  vendor itself, same pattern VendorDetailSheet uses. */
  invoices: Invoice[]
  contractorLogos: Record<string, string>
  onOpenChange: (open: boolean) => void
  onEdit: () => void
}) {
  const trendChartType = useDisplayStore((s) => s.trendChartType)
  const serviceChartType = useDisplayStore((s) => s.serviceChartType)
  const setChartType = useDisplayStore((s) => s.setChartType)
  const chartSlots = useDisplayStore((s) => s.chartSlots)
  const [drill, setDrill] = useState<{ title: string; invoices: Invoice[] } | null>(null)
  const [maximized, setMaximized] = useState(false)

  const vendor = invoice?.vendor || "Unknown"
  const rows = invoice ? invoices.filter((r) => (r.vendor || "Unknown") === vendor) : []

  function handleOpenChange(v: boolean) {
    if (!v) setMaximized(false)
    onOpenChange(v)
  }

  if (!invoice) return <Dialog open={open} onOpenChange={onOpenChange} />

  const color = vendorColor(vendor)
  const amount = Number(invoice.amountInclTax) || 0
  const paid = Number(invoice.amountPaid) || 0
  const vendorTotal = rows.reduce((s, r) => s + (Number(r.amountInclTax) || 0), 0)
  const sharePct = vendorTotal > 0 ? (amount / vendorTotal) * 100 : null
  const ta = turnaroundDays(invoice)
  const cleared = (invoice.status || "").toLowerCase().includes("cleared")

  const trendCfg = chartSlots.vendorSheetTrend
  const trend = seriesFromGroups(groupRows(rows, trendCfg.dimension ?? "month"), trendCfg.dimension ?? "month", trendCfg.measure).map((p) => ({
    month: formatGroupKey(trendCfg.dimension ?? "month", p.key),
    key: p.key,
    total: p.value,
    invoices: p.invoices,
  }))
  const serviceCfg = chartSlots.vendorSheetService
  const byService = seriesFromGroups(groupRows(rows, serviceCfg.dimension ?? "service"), serviceCfg.dimension ?? "service", serviceCfg.measure).map(
    (p) => ({ service: formatGroupKey(serviceCfg.dimension ?? "service", p.key), total: p.value, invoices: p.invoices })
  )

  const onDrill = (title: string, drillInvoices: Invoice[]) => setDrill({ title, invoices: drillInvoices })

  const report =
    `Invoice ${invoice.invoiceNo || `#${invoice.srNo}`} from ${vendor}` +
    (invoice.service ? ` for ${invoice.service}` : "") +
    `, raised ${fmtDate(invoice.invoiceDate)}. ` +
    `Worth ${fmtMoney(amount)}` +
    (sharePct !== null ? `, ${sharePct.toFixed(1)}% of this vendor's tracked spend` : "") +
    ". " +
    (cleared && ta !== null
      ? `Cleared in ${ta} day${ta !== 1 ? "s" : ""}.`
      : invoice.receivingDate
        ? `Still ${invoice.status || "in process"} since it was received.`
        : `Not yet received against — status is ${invoice.status || "unspecified"}.`)

  const timeline = [
    { label: "Invoice raised", date: invoice.invoiceDate },
    { label: "Received", date: invoice.receivingDate },
    { label: "Cleared", date: invoice.clearanceDate },
  ]

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="max-h-[88vh] w-full overflow-y-auto sm:max-w-3xl"
          maximizable
          maximized={maximized}
          onMaximizedChange={setMaximized}
        >
          <DialogHeader>
            <div className="flex items-start gap-3">
              <ContractorLogo vendor={vendor} logo={contractorLogos[vendor]} color={color} size="lg" />
              <div className="min-w-0">
                <DialogTitle className="truncate">{invoice.invoiceNo || `Invoice #${invoice.srNo}`}</DialogTitle>
                <DialogDescription className="truncate">
                  {vendor} · {invoice.contractNo || "No contract"} · {invoice.service || "Unspecified"}
                </DialogDescription>
              </div>
              <StatusBadge status={invoice.status} />
            </div>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3 text-sm sm:grid-cols-4">
              <div>
                <div className="text-xs text-muted-foreground">Amount incl. tax</div>
                <div className="font-semibold tabular-nums" style={{ color }}>{fmtMoney(amount)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Paid</div>
                <div className="font-semibold tabular-nums">{fmtMoney(paid)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Turnaround</div>
                <div className="font-semibold tabular-nums">{ta !== null ? `${ta}d` : "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Well</div>
                <div className="truncate font-semibold">{invoice.wellName || "—"}</div>
              </div>
            </div>

            <p className="rounded-lg border-l-2 bg-muted/20 p-3 text-sm text-foreground/90" style={{ borderColor: color }}>
              {report}
            </p>

            <div>
              <h4 className="mb-2 text-sm font-semibold">Timeline</h4>
              <div className="flex items-center gap-2 rounded-lg border p-3">
                {timeline.map((step, i) => (
                  <div key={step.label} className="flex flex-1 items-center gap-2">
                    <div className="flex flex-col items-center gap-1 text-center">
                      {step.date ? (
                        <CheckCircle2 className="size-4 text-status-cleared" />
                      ) : (
                        <Circle className="size-4 text-muted-foreground/40" />
                      )}
                      <div className="text-[11px] font-medium">{step.label}</div>
                      <div className="text-[10px] text-muted-foreground">{step.date ? fmtDate(step.date) : "Pending"}</div>
                    </div>
                    {i < timeline.length - 1 && <div className="h-px flex-1 bg-border" />}
                  </div>
                ))}
              </div>
            </div>

            {rows.length > 1 && (!trendCfg.hidden || !serviceCfg.hidden) && (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {!trendCfg.hidden && (
                <ChartCard
                  accent="var(--dataviz-1)"
                  title={(trendCfg.dimension && trendCfg.dimension !== "month") || trendCfg.measure !== "incl"
                    ? `${chartMeasureLabel(trendCfg.measure)} by ${reportGroupLabel(trendCfg.dimension ?? "month")}`
                    : `${vendor} — Spending Trend`}
                  action={
                    <div className="flex items-center gap-0.5">
                      <ChartZoomStepper id="vendorSheetTrend" />
                      <ChartDataQuickMenu id="vendorSheetTrend" hasDimension />
                      <ChartVisibilityToggle id="vendorSheetTrend" />
                      <ChartTypeMenu options={CHART_OPTIONS.trend} value={trendChartType} onChange={(t) => setChartType("trendChartType", t)} />
                      <ChartFormatMenu id="vendorSheetTrend" hasZoom chartType={trendChartType} />
                    </div>
                  }
                >
                  <ChartSlotContextMenu
                    id="vendorSheetTrend"
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
                    : `${vendor} — by Service`}
                  action={
                    <div className="flex items-center gap-0.5">
                      <ChartZoomStepper id="vendorSheetService" />
                      <ChartDataQuickMenu id="vendorSheetService" hasDimension />
                      <ChartVisibilityToggle id="vendorSheetService" />
                      <ChartTypeMenu options={CHART_OPTIONS.service} value={serviceChartType} onChange={(t) => setChartType("serviceChartType", t)} />
                      <ChartFormatMenu id="vendorSheetService" chartType={serviceChartType} />
                    </div>
                  }
                >
                  <ChartSlotContextMenu
                    id="vendorSheetService"
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onEdit}>
              <PenSquare /> Edit invoice
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
