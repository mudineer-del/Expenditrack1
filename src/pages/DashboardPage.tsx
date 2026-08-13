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
import { useEffect, useMemo, useRef } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChartTypeMenu } from "@/components/dashboard/ChartTypeMenu"
import { Gauge } from "@/components/dashboard/Gauge"
import { KpiTile } from "@/components/dashboard/KpiTile"
import { ServiceChart } from "@/components/dashboard/ServiceChart"
import { SpendingTicker } from "@/components/dashboard/SpendingTicker"
import { TrendChart } from "@/components/dashboard/TrendChart"
import { VendorChart } from "@/components/dashboard/VendorChart"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { ContractorLogo } from "@/components/shared/ContractorLogo"
import { useDisplayStore } from "@/store/useDisplayStore"
import {
  avgLeadTime,
  computeDashboardStats,
  fmtMoney,
  monthlyTrend,
  serviceBreakdown,
  vendorBreakdown,
  vendorColor,
  vendorContractCost,
} from "@/lib/dashboard"
import { useContractsQuery } from "@/hooks/useContracts"
import { useInvoicesQuery } from "@/hooks/useInvoices"
import { getContractorLogo, useContractorLogosQuery } from "@/lib/contractorLogos"
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
  const trendChartType = useDisplayStore((s) => s.trendChartType)
  const serviceChartType = useDisplayStore((s) => s.serviceChartType)
  const vendorChartType = useDisplayStore((s) => s.vendorChartType)
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

  const rows = useMemo(
    () => (dashVendor === "ALL" ? invoices : invoices.filter((r) => r.vendor === dashVendor)),
    [invoices, dashVendor]
  )
  const stats = useMemo(() => computeDashboardStats(rows, contracts), [rows, contracts])
  const dataVendors = useMemo(
    () => Array.from(new Set(invoices.map((r) => r.vendor).filter(Boolean))).sort(),
    [invoices]
  )
  const recent = useMemo(() => rows.slice().sort((a, b) => (Number(b.srNo) || 0) - (Number(a.srNo) || 0)).slice(0, 6), [rows])
  const trend = useMemo(() => monthlyTrend(rows), [rows])
  const byService = useMemo(() => serviceBreakdown(rows), [rows])
  const byVendor = useMemo(() => vendorBreakdown(rows), [rows])
  const contractCost = dashVendor !== "ALL" ? vendorContractCost(contracts, dashVendor) : 0

  if (invoicesQuery.isLoading || contractsQuery.isLoading) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
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

  return (
    <div className="grid gap-4">
      <SpendingTicker contracts={contracts} invoices={invoices} />

      <div className="flex flex-wrap gap-2">
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

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiTile
          icon={<List />}
          accent="var(--chart-1)"
          label="Total invoices"
          value={stats.k.count.toLocaleString()}
          sub={dashVendor === "ALL" ? `${new Set(rows.map((r) => r.vendor)).size} contractors` : dashVendor}
        />
        <KpiTile icon={<Wallet />} accent="var(--chart-2)" label="Total value (incl. tax)" value={fmtMoney(stats.k.totalIncl)} sub="USD" />
        <KpiTile
          icon={<CheckCircle2 />}
          iconClassName="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
          accent="#16a34a"
          label="Cleared"
          value={stats.k.cleared.toLocaleString()}
          valueClassName="text-green-700 dark:text-green-400"
          sub={`${((stats.k.cleared / stats.k.count) * 100 || 0).toFixed(0)}% of invoices`}
        />
        <KpiTile
          icon={<Clock3 />}
          iconClassName="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
          accent="#d97706"
          label="Pending / in process"
          value={stats.k.pending.toLocaleString()}
          valueClassName="text-amber-700 dark:text-amber-400"
          sub="Awaiting clearance"
        />
        {dashVendor !== "ALL" && contractCost > 0 && (
          <>
            <KpiTile icon={<DollarSign />} accent="var(--chart-3)" label="Contract cost" value={fmtMoney(contractCost)} sub={`All ${dashVendor} contracts`} />
            <KpiTile
              icon={<Wallet />}
              accent="var(--chart-4)"
              label="Remaining"
              value={fmtMoney(contractCost - stats.k.totalIncl)}
              valueClassName={contractCost - stats.k.totalIncl < 0 ? "text-red-600" : "text-green-600"}
              sub={`${Math.min(100, (stats.k.totalIncl / contractCost) * 100).toFixed(1)}% utilized`}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <KpiTile
          icon={<History />}
          accent="var(--chart-1)"
          label="This quarter"
          value={fmtMoney(stats.thisQTotal)}
          sub={<PctSub pct={stats.qoqPct} label="vs last quarter" />}
        />
        <KpiTile
          icon={<History />}
          accent="var(--chart-2)"
          label={`Fiscal year ${stats.latestYr || "—"}`}
          value={fmtMoney(stats.ytdTotal)}
          sub={<PctSub pct={stats.yoyPct} label="vs prior year" />}
        />
        <KpiTile
          icon={<DollarSign />}
          iconClassName="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
          accent="#16a34a"
          label="Avg invoice value"
          value={fmtMoney(stats.avgInvoiceValue)}
          sub={`Across ${stats.k.count.toLocaleString()} invoices`}
        />
        <KpiTile
          icon={<Clock3 />}
          iconClassName="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
          accent="#d97706"
          label="Avg days to clear"
          value={stats.avgDaysToClear == null ? "—" : `${stats.avgDaysToClear.toFixed(1)}d`}
          sub={`${stats.clearDaysCount} invoices with dates`}
        />
        <KpiTile
          icon={<Building2 />}
          iconClassName="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
          accent="#dc2626"
          label="Top contractor share"
          value={stats.topVendorPct == null ? "—" : `${stats.topVendorPct.toFixed(0)}%`}
          sub={stats.topVendor ? stats.topVendor[0] : "No data"}
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
        />
      </div>

      {dashVendor === "ALL" && dataVendors.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Contractor Expenditure Overview</h3>
            <Button size="sm" variant="ghost" asChild>
              <Link to="/vendors">Manage contracts</Link>
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {dataVendors.map((v) => {
              const vRows = invoices.filter((r) => r.vendor === v)
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

      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold">Expenditure Analysis</h3>
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Monthly Expenditure Trend</span>
              <ChartTypeMenu value={trendChartType} onChange={(t) => setChartType("trendChartType", t)} />
            </div>
            <TrendChart data={trend} />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Expenditure by Service</span>
              <ChartTypeMenu value={serviceChartType} onChange={(t) => setChartType("serviceChartType", t)} />
            </div>
            <ServiceChart data={byService} />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {dashVendor === "ALL" ? "Invoice Value by Contractor" : `Invoice Value — ${dashVendor}`}
              </span>
              <ChartTypeMenu value={vendorChartType} onChange={(t) => setChartType("vendorChartType", t)} />
            </div>
            <VendorChart data={byVendor} />
          </div>
          <div>
            <div className="mb-2 text-xs font-medium text-muted-foreground">Invoice Status</div>
            <Gauge
              pct={stats.k.count > 0 ? (stats.k.cleared / stats.k.count) * 100 : 0}
              hubText={stats.k.count.toLocaleString()}
              hubLabel="INVOICES"
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="text-sm font-semibold">Recent Invoices{dashVendor !== "ALL" ? ` — ${dashVendor}` : ""}</h3>
          <Button size="sm" variant="ghost" asChild>
            <Link to="/invoices">View all</Link>
          </Button>
        </div>
        <Table>
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
    </div>
  )
}
