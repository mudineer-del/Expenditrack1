import {
  Building2,
  CheckCircle2,
  Clock3,
  DollarSign,
  History,
  List,
  ShieldCheck,
  Wallet,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChartTypeMenu } from "@/components/dashboard/ChartTypeMenu"
import { ContractorInvoicesChart } from "@/components/dashboard/ContractorInvoicesChart"
import { InvoiceListDialog } from "@/components/dashboard/InvoiceListDialog"
import { KpiTile } from "@/components/dashboard/KpiTile"
import { ServiceChart } from "@/components/dashboard/ServiceChart"
import { Sparkline } from "@/components/dashboard/Sparkline"
import { SpendingTicker } from "@/components/dashboard/SpendingTicker"
import { TypeCountChart } from "@/components/dashboard/TypeCountChart"
import { TrendChart } from "@/components/dashboard/TrendChart"
import { VendorChart } from "@/components/dashboard/VendorChart"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { ContractorLogo } from "@/components/shared/ContractorLogo"
import { useDisplayStore } from "@/store/useDisplayStore"
import {
  avgLeadTime,
  clearedInvoices,
  computeDashboardStats,
  contractorInvoiceCounts,
  fmtMoney,
  invoicesForVendorName,
  invoicesInQuarter,
  invoicesInYear,
  invoicesWithClearTime,
  monthlyTrend,
  pendingInvoices,
  serviceBreakdown,
  typeInvoiceCounts,
  vendorBreakdown,
  vendorColor,
  vendorContractCost,
  vendorServiceBreakdown,
  vendorTypeBreakdown,
} from "@/lib/dashboard"
import type { Invoice } from "@/types/invoice"
import { useContractsQuery } from "@/hooks/useContracts"
import { useInvoicesQuery } from "@/hooks/useInvoices"
import { getContractorLogo, useContractorLogosQuery } from "@/lib/contractorLogos"
import { useReferenceLists } from "@/lib/referenceLists"
import { useAppStore } from "@/store/useAppStore"
import { checkContractNotifications, loadNotifyConfig, loadNotifyPrefs, maybeSendWeeklyDigest } from "@/lib/notifications"

function PctSub({ pct, label }: { pct: number | null; label: string }) {
  if (pct == null) return <span className="text-muted-foreground">No prior period data</span>
  return (
    <span className={pct >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
      {pct >= 0 ? "+" : ""}
      {pct.toFixed(0)}% {label}
    </span>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const invoicesQuery = useInvoicesQuery()
  const contractsQuery = useContractsQuery()
  const contractorLogosQuery = useContractorLogosQuery()
  const dashVendor = useAppStore((s) => s.dashVendor)
  const setDashVendor = useAppStore((s) => s.setDashVendor)
  const activeDept = useAppStore((s) => s.activeDept)
  const setActiveDept = useAppStore((s) => s.setActiveDept)
  const { ref: refLists } = useReferenceLists()
  const trendChartType = useDisplayStore((s) => s.trendChartType)
  const serviceChartType = useDisplayStore((s) => s.serviceChartType)
  const vendorChartType = useDisplayStore((s) => s.vendorChartType)
  const breakdownChartType = useDisplayStore((s) => s.breakdownChartType)
  const setChartType = useDisplayStore((s) => s.setChartType)

  const invoices = invoicesQuery.data ?? []
  const contracts = contractsQuery.data ?? []

  const notifiedThisSession = useRef(false)
  useEffect(() => {
    if (notifiedThisSession.current) return
    if (!invoicesQuery.data || !contractsQuery.data) return
    notifiedThisSession.current = true
    const cfg = loadNotifyConfig()
    const prefs = loadNotifyPrefs()
    void checkContractNotifications(cfg, prefs, contractsQuery.data, invoicesQuery.data)
    void maybeSendWeeklyDigest(cfg, prefs, invoicesQuery.data)
  }, [invoicesQuery.data, contractsQuery.data])

  // Department scoping happens first (the "universal dashboard" tab strip), contractor
  // scoping second (the existing pills) — both client-side filters over the same
  // full invoices/contracts arrays, same pattern dashVendor already used on its own.
  const deptInvoices = useMemo(
    () => (activeDept === "ALL" ? invoices : invoices.filter((r) => r.department === activeDept)),
    [invoices, activeDept]
  )
  const deptContracts = useMemo(
    () => (activeDept === "ALL" ? contracts : contracts.filter((c) => c.department === activeDept)),
    [contracts, activeDept]
  )
  const rows = useMemo(
    () => (dashVendor === "ALL" ? deptInvoices : deptInvoices.filter((r) => r.vendor === dashVendor)),
    [deptInvoices, dashVendor]
  )
  const stats = useMemo(() => computeDashboardStats(rows, deptContracts), [rows, deptContracts])
  const dataVendors = useMemo(
    () => Array.from(new Set(deptInvoices.map((r) => r.vendor).filter(Boolean))).sort(),
    [deptInvoices]
  )
  const recent = useMemo(() => rows.slice().sort((a, b) => (Number(b.srNo) || 0) - (Number(a.srNo) || 0)).slice(0, 6), [rows])
  const trend = useMemo(() => monthlyTrend(rows), [rows])
  // Last 6 months' worth of trend points, for the KPI tiles' sparklines — same source data
  // as the Monthly Expenditure Trend chart, just sliced down and summarized differently.
  const recentTrend = trend.slice(-6)
  const valueSparkline = recentTrend.map((t) => t.total)
  const countSparkline = recentTrend.map((t) => t.invoices.length)
  const avgSparkline = recentTrend.map((t) => (t.invoices.length ? t.total / t.invoices.length : 0))
  const byService = useMemo(() => serviceBreakdown(rows), [rows])
  const byVendor = useMemo(() => vendorBreakdown(rows), [rows])
  const byVendorService = useMemo(() => vendorServiceBreakdown(rows), [rows])
  const byVendorType = useMemo(() => vendorTypeBreakdown(rows), [rows])
  const byVendorCount = useMemo(() => contractorInvoiceCounts(rows), [rows])
  const byTypeCount = useMemo(() => typeInvoiceCounts(rows), [rows])
  const contractCost = dashVendor !== "ALL" ? vendorContractCost(deptContracts, dashVendor) : 0

  const [drill, setDrill] = useState<{ title: string; invoices: Invoice[] } | null>(null)
  const onDrill = (title: string, drillInvoices: Invoice[]) => setDrill({ title, invoices: drillInvoices })

  if (invoicesQuery.isLoading || contractsQuery.isLoading) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  if (invoicesQuery.isError || contractsQuery.isError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        Could not load dashboard data. Check your connection to Supabase in Settings → Cloud Sync.
      </div>
    )
  }

  // grid-cols-1 (not just `grid`) matters on the root below: with no explicit
  // column count, the browser's default single implicit column sizes to
  // `auto` (content's max-content width), which can render wider than the
  // container's own box regardless of its own width — grid-cols-1 uses
  // Tailwind's minmax(0,1fr) track instead, which actually respects it. This
  // was silently overflowing every child (KPI tiles, department tabs, vendor
  // pills) by ~60px on narrow phones.
  return (
    <div className="grid grid-cols-1 gap-5 md:gap-4">
      <SpendingTicker contracts={deptContracts} invoices={deptInvoices} />

      {refLists.departments.length > 1 && (
        <div className="min-w-0 flex flex-wrap gap-2 border-b pb-3">
          <Button
            size="sm"
            variant={activeDept === "ALL" ? "default" : "outline"}
            onClick={() => setActiveDept("ALL")}
          >
            All Departments
          </Button>
          {refLists.departments.map((d) => (
            <Button
              key={d}
              size="sm"
              variant={activeDept === d ? "default" : "outline"}
              onClick={() => setActiveDept(d)}
            >
              {d}
            </Button>
          ))}
        </div>
      )}

      <div className="min-w-0 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={dashVendor === "ALL" ? "default" : "outline"}
          onClick={() => setDashVendor("ALL")}
        >
          All
        </Button>
        {dataVendors.map((v) => (
          <Button
            key={v}
            size="sm"
            variant={dashVendor === v ? "default" : "outline"}
            style={dashVendor === v ? { backgroundColor: vendorColor(v), borderColor: vendorColor(v) } : undefined}
            onClick={() => setDashVendor(v)}
          >
            {v}
          </Button>
        ))}
      </div>

      <div className="min-w-0 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
        <KpiTile
          hero
          icon={<List />}
          accent="var(--chart-1)"
          label="Total invoices"
          value={stats.k.count.toLocaleString()}
          sub={dashVendor === "ALL" ? `${new Set(rows.map((r) => r.vendor)).size} contractors` : dashVendor}
          trend={
            countSparkline.length > 1 ? (
              <Sparkline data={countSparkline} width={280} height={44} responsive />
            ) : undefined
          }
          onClick={() => onDrill(dashVendor === "ALL" ? "All Invoices" : `Invoices — ${dashVendor}`, rows)}
        />
        <KpiTile
          hero
          icon={<Wallet />}
          accent="var(--chart-2)"
          label="Total value (incl. tax)"
          value={fmtMoney(stats.k.totalIncl)}
          sub="USD"
          trend={
            valueSparkline.length > 1 ? (
              <Sparkline data={valueSparkline} width={280} height={44} responsive />
            ) : undefined
          }
          onClick={() => onDrill(dashVendor === "ALL" ? "All Invoices" : `Invoices — ${dashVendor}`, rows)}
        />
        <KpiTile
          icon={<CheckCircle2 />}
          iconClassName="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
          accent="#16a34a"
          label="Cleared"
          value={stats.k.cleared.toLocaleString()}
          valueClassName="text-green-700 dark:text-green-400"
          sub={`${((stats.k.cleared / stats.k.count) * 100 || 0).toFixed(0)}% of invoices`}
          onClick={() => onDrill("Cleared Invoices", clearedInvoices(rows))}
        />
        <KpiTile
          icon={<Clock3 />}
          iconClassName="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
          accent="#d97706"
          label="Pending / in process"
          value={stats.k.pending.toLocaleString()}
          valueClassName="text-amber-700 dark:text-amber-400"
          sub="Awaiting clearance"
          onClick={() => onDrill("Pending Invoices", pendingInvoices(rows))}
        />
        {dashVendor !== "ALL" && contractCost > 0 && (
          <>
            <KpiTile
              icon={<DollarSign />}
              accent="var(--chart-3)"
              label="Contract cost"
              value={fmtMoney(contractCost)}
              sub={`All ${dashVendor} contracts`}
              onClick={() => onDrill(`Invoices — ${dashVendor}`, rows)}
            />
            <KpiTile
              icon={<Wallet />}
              accent="var(--chart-4)"
              label="Remaining"
              value={fmtMoney(contractCost - stats.k.totalIncl)}
              valueClassName={contractCost - stats.k.totalIncl < 0 ? "text-red-600" : "text-green-600"}
              sub={`${Math.min(100, (stats.k.totalIncl / contractCost) * 100).toFixed(1)}% utilized`}
              onClick={() => onDrill(`Invoices — ${dashVendor}`, rows)}
            />
          </>
        )}
      </div>

      <div className="min-w-0 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <KpiTile
          icon={<History />}
          accent="var(--chart-1)"
          label="This quarter"
          value={fmtMoney(stats.thisQTotal)}
          sub={<PctSub pct={stats.qoqPct} label="vs last quarter" />}
          onClick={() =>
            onDrill(`Invoices — ${stats.latestQtrYr ?? ""} ${stats.latestQtrStr ?? ""}`.trim(), invoicesInQuarter(rows, stats.latestQtrYr, stats.latestQtrStr))
          }
        />
        <KpiTile
          icon={<History />}
          accent="var(--chart-2)"
          label={`Fiscal year ${stats.latestYr || "—"}`}
          value={fmtMoney(stats.ytdTotal)}
          sub={<PctSub pct={stats.yoyPct} label="vs prior year" />}
          onClick={() => onDrill(`Invoices — FY ${stats.latestYr ?? ""}`, invoicesInYear(rows, stats.latestYr))}
        />
        <KpiTile
          icon={<DollarSign />}
          iconClassName="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
          accent="#16a34a"
          label="Avg invoice value"
          value={fmtMoney(stats.avgInvoiceValue)}
          sub={`Across ${stats.k.count.toLocaleString()} invoices`}
          trend={avgSparkline.length > 1 ? <Sparkline data={avgSparkline} /> : undefined}
          onClick={() => onDrill(dashVendor === "ALL" ? "All Invoices" : `Invoices — ${dashVendor}`, rows)}
        />
        <KpiTile
          icon={<Clock3 />}
          iconClassName="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
          accent="#d97706"
          label="Avg days to clear"
          value={stats.avgDaysToClear == null ? "—" : `${stats.avgDaysToClear.toFixed(1)}d`}
          sub={`${stats.clearDaysCount} invoices with dates`}
          onClick={() => onDrill("Invoices with recorded clearance time", invoicesWithClearTime(rows))}
        />
        <KpiTile
          icon={<Building2 />}
          iconClassName="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
          accent="#dc2626"
          label="Top contractor share"
          value={stats.topVendorPct == null ? "—" : `${stats.topVendorPct.toFixed(0)}%`}
          sub={stats.topVendor ? stats.topVendor[0] : "No data"}
          onClick={() => stats.topVendor && onDrill(`Invoices — ${stats.topVendor[0]}`, invoicesForVendorName(rows, stats.topVendor[0]))}
        />
        <KpiTile
          icon={<ShieldCheck />}
          accent="var(--chart-5)"
          label="Active contracts"
          value={stats.activeContracts.length}
          sub={
            stats.expiringSoon > 0 ? (
              <span className="text-amber-600 dark:text-amber-400">{stats.expiringSoon} expiring within 30 days</span>
            ) : (
              "None expiring soon"
            )
          }
          onClick={() => navigate("/vendors")}
        />
      </div>

      {dashVendor === "ALL" && dataVendors.length > 0 && (
        <div className="rounded-2xl border bg-card p-4 shadow-sm md:rounded-lg md:shadow-none">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-bold md:text-sm md:font-semibold">Contractor Expenditure Overview</h3>
            <Button size="sm" variant="ghost" asChild>
              <Link to="/vendors">Manage contracts</Link>
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {dataVendors.map((v) => {
              const vRows = deptInvoices.filter((r) => r.vendor === v)
              const total = vRows.reduce((s, r) => s + (Number(r.amountInclTax) || 0), 0)
              const lead = avgLeadTime(vRows)
              return (
                <button
                  key={v}
                  className="rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
                  onClick={() => setDashVendor(v)}
                >
                  <div className="mb-2 flex items-center gap-2 font-medium">
                    <ContractorLogo vendor={v} logo={getContractorLogo(contractorLogosQuery.data ?? {}, v)} color={vendorColor(v)} size="sm" />
                    {v}
                  </div>
                  <dl className="grid gap-1 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <dt>Invoices logged</dt>
                      <dd className="text-foreground">{vRows.length}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Expenditure (incl. tax)</dt>
                      <dd className="text-foreground">{fmtMoney(total)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Avg. clearance lead time</dt>
                      <dd className="text-foreground">{lead !== null ? `${lead} days` : "—"}</dd>
                    </div>
                  </dl>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="rounded-2xl border bg-card p-4 shadow-sm md:rounded-lg md:shadow-none">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-bold md:text-sm md:font-semibold">Expenditure Analysis</h3>
          <p className="text-xs text-muted-foreground">Click a bar, slice, or point to see its invoices</p>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Monthly Expenditure Trend</span>
              <ChartTypeMenu value={trendChartType} onChange={(t) => setChartType("trendChartType", t)} />
            </div>
            <TrendChart data={trend} onDrill={onDrill} />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Expenditure by Service</span>
              <ChartTypeMenu value={serviceChartType} onChange={(t) => setChartType("serviceChartType", t)} />
            </div>
            <ServiceChart data={byService} chartType={serviceChartType} onDrill={onDrill} />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {dashVendor === "ALL" ? "Invoice Value by Contractor" : `Invoice Value — ${dashVendor}`}
              </span>
              <ChartTypeMenu value={vendorChartType} onChange={(t) => setChartType("vendorChartType", t)} />
            </div>
            <VendorChart data={byVendor} serviceBreakdown={byVendorService} typeBreakdown={byVendorType} onDrill={onDrill} />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {dashVendor === "ALL" ? "Invoices by Contractor" : `Invoices by Type — ${dashVendor}`}
              </span>
              <ChartTypeMenu value={breakdownChartType} onChange={(t) => setChartType("breakdownChartType", t)} />
            </div>
            {dashVendor === "ALL" ? (
              <ContractorInvoicesChart data={byVendorCount} onDrill={onDrill} />
            ) : (
              <TypeCountChart data={byTypeCount} onDrill={onDrill} />
            )}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm md:rounded-lg md:shadow-none">
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="text-base font-bold md:text-sm md:font-semibold">Recent Invoices{dashVendor !== "ALL" ? ` — ${dashVendor}` : ""}</h3>
          <Button size="sm" variant="ghost" asChild>
            <Link to="/invoices">View all</Link>
          </Button>
        </div>
        {/* Card list below md — a 7-column table forces horizontal scroll on a
            phone; this shows the same rows and the same drill-down navigation
            as a tap-friendly list instead. Table (unchanged) takes over at md+. */}
        {recent.length ? (
          <div className="divide-y md:hidden">
            {recent.map((r) => (
              <button
                key={r.id}
                type="button"
                className="flex w-full items-center gap-3.5 p-4 text-left transition-colors hover:bg-muted/50 active:bg-muted"
                onClick={() => navigate("/invoices", { state: { openInvoiceId: r.id } })}
              >
                <ContractorLogo vendor={r.vendor || "Unknown"} logo={getContractorLogo(contractorLogosQuery.data ?? {}, r.vendor)} color={vendorColor(r.vendor)} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-semibold">{r.vendor || "Unknown vendor"}</div>
                  <div className="truncate text-[13px] text-muted-foreground">
                    {r.invoiceNo || `Sr# ${r.srNo}`}
                    {r.service ? ` · ${r.service}` : ""}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span className="text-[15px] font-bold tabular-nums">{fmtMoney(r.amountInclTax)}</span>
                  <StatusBadge status={r.status} />
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-sm text-muted-foreground md:hidden">No invoices for this contractor yet.</div>
        )}

        <Table containerClassName="hidden md:block">
          <TableHeader>
            <TableRow>
              <TableHead>Sr#</TableHead>
              <TableHead>Contractor</TableHead>
              <TableHead>Invoice No.</TableHead>
              <TableHead>Contract No.</TableHead>
              <TableHead>Service</TableHead>
              <TableHead className="text-right">Amount (Incl. Tax)</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recent.length ? (
              recent.map((r) => (
                <TableRow
                  key={r.id}
                  className="cursor-pointer"
                  onClick={() => navigate("/invoices", { state: { openInvoiceId: r.id } })}
                >
                  <TableCell>{r.srNo}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <ContractorLogo vendor={r.vendor || "Unknown"} logo={getContractorLogo(contractorLogosQuery.data ?? {}, r.vendor)} color={vendorColor(r.vendor)} size="sm" />
                      {r.vendor}
                    </div>
                  </TableCell>
                  <TableCell>{r.invoiceNo}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={r.contractNo}>
                    {r.contractNo || "—"}
                  </TableCell>
                  <TableCell>{r.service}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtMoney(r.amountInclTax)}</TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No invoices for this contractor yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <InvoiceListDialog
        open={!!drill}
        onOpenChange={(v) => !v && setDrill(null)}
        title={drill?.title ?? ""}
        invoices={drill?.invoices ?? []}
      />
    </div>
  )
}
