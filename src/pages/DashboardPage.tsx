import {
  Award,
  Banknote,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Coins,
  Droplets,
  FileCheck2,
  Hourglass,
  Layers,
  Receipt,
  Timer,
  TrendingUp,
  Wallet,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CHART_OPTIONS, ChartTypeMenu } from "@/components/dashboard/ChartTypeMenu"
import { ChartCard } from "@/components/dashboard/ChartCard"
import { ChartSlotContextMenu } from "@/components/dashboard/ChartSlotContextMenu"
import { ChartVisibilityToggle } from "@/components/dashboard/ChartVisibilityToggle"
import { ContractorInvoicesChart } from "@/components/dashboard/ContractorInvoicesChart"
import { InvoiceListDialog } from "@/components/dashboard/InvoiceListDialog"
import { KpiTile } from "@/components/dashboard/KpiTile"
import { ServiceChart } from "@/components/dashboard/ServiceChart"
import { Sparkline } from "@/components/dashboard/Sparkline"
import { SpendingTicker } from "@/components/dashboard/SpendingTicker"
import { TrendChart } from "@/components/dashboard/TrendChart"
import { VendorChart } from "@/components/dashboard/VendorChart"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { ContractorLogo } from "@/components/shared/ContractorLogo"
import { useDisplayStore } from "@/store/useDisplayStore"
import {
  avgLeadTime,
  clearedInvoices,
  computeDashboardStats,
  fmtMoney,
  invoicesForVendorName,
  invoicesInQuarter,
  invoicesInYear,
  invoicesWithClearTime,
  monthlyTrend,
  pendingInvoices,
  vendorBreakdown,
  vendorColor,
  vendorContractCost,
  vendorServiceBreakdown,
  vendorTypeBreakdown,
} from "@/lib/dashboard"
import { chartMeasureLabel, formatGroupKey, groupRows, reportGroupLabel, seriesFromGroups } from "@/lib/reports"
import type { Invoice } from "@/types/invoice"
import { useContractsQuery } from "@/hooks/useContracts"
import { useInvoicesQuery } from "@/hooks/useInvoices"
import { getContractorLogo, useContractorLogosQuery } from "@/lib/contractorLogos"
import { useReferenceLists } from "@/lib/referenceLists"
import { useAppStore } from "@/store/useAppStore"
import { cn } from "@/lib/utils"
import { checkContractNotifications, loadNotifyConfig, loadNotifyPrefs, maybeSendWeeklyDigest } from "@/lib/notifications"

const PICKER_NEUTRAL = "var(--muted-foreground)"
const PICKER_PALETTE = ["var(--dataviz-1)", "var(--dataviz-2)", "var(--dataviz-3)", "var(--dataviz-4)", "var(--dataviz-5)", "var(--dataviz-6)"]

/** Mobile-only department/vendor picker card. A flat gray box with a color
 *  only on the active one read as lifeless — every card now carries its own
 *  color always (not just when selected), and the icon sits in a raised,
 *  diagonally-lit gradient chip with its own tinted shadow for actual depth
 *  instead of a flat icon on a flat card. */
function PickerCard({
  active,
  color,
  icon,
  bareIcon,
  label,
  onClick,
}: {
  active: boolean
  color: string
  icon: React.ReactNode
  /** Skip the gradient-chip wrapper for icons that already come pre-styled
   *  as their own raised badge (ContractorLogo's real logo/initials circle) —
   *  wrapping it in a second chip would just nest two badges. */
  bareIcon?: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "[perspective:600px] group flex aspect-square origin-center transform-gpu flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border p-2 text-center shadow-sm transition-all duration-300 ease-out active:scale-[0.96] active:duration-100",
        active ? "border-2 shadow-md" : "border-border/70 hover:-translate-y-1 hover:shadow-lg active:shadow-md"
      )}
      style={{
        borderColor: active ? color : undefined,
        backgroundImage: `linear-gradient(155deg, color-mix(in oklch, ${color} ${active ? 18 : 10}%, var(--card)) 0%, var(--card) 65%)`,
      }}
    >
      {bareIcon ? (
        <div className="drop-shadow-[0_3px_6px_rgba(0,0,0,0.18)] transition-transform duration-300 group-hover:scale-110 group-hover:[transform:rotateY(8deg)]">
          {icon}
        </div>
      ) : (
        <div
          className="flex size-12 items-center justify-center rounded-xl text-white ring-1 ring-black/5 transition-transform duration-300 group-hover:scale-110 group-hover:[transform:rotateY(8deg)]"
          style={{
            backgroundImage: `linear-gradient(155deg, color-mix(in oklch, ${color} 85%, white 25%), ${color})`,
            boxShadow: `0 4px 10px -3px color-mix(in oklch, ${color} 55%, transparent)`,
          }}
        >
          {icon}
        </div>
      )}
      <span
        className="line-clamp-2 w-full max-w-full text-wrap break-words text-[11px] leading-tight font-semibold"
        style={{ color: active ? color : undefined }}
      >
        {label}
      </span>
    </button>
  )
}

function PctSub({ pct, label }: { pct: number | null; label: string }) {
  if (pct == null) return <span className="text-muted-foreground">No prior period data</span>
  return (
    <span className={pct >= 0 ? "text-status-cleared" : "text-status-returned"}>
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
  const statusChartType = useDisplayStore((s) => s.statusChartType)
  const setChartType = useDisplayStore((s) => s.setChartType)
  const chartSlots = useDisplayStore((s) => s.chartSlots)

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
  // Deliberately always month/$-total, independent of the dashTrend slot's own Settings
  // config below — these sparklines are a small fixed indicator, not a reconfigurable chart.
  const trend = useMemo(() => monthlyTrend(rows), [rows])
  // Last 6 months' worth of trend points, for the KPI tiles' sparklines — same source data
  // as the Monthly Expenditure Trend chart, just sliced down and summarized differently.
  const recentTrend = trend.slice(-6)
  const valueSparkline = recentTrend.map((t) => t.total)
  const countSparkline = recentTrend.map((t) => t.invoices.length)
  const avgSparkline = recentTrend.map((t) => (t.invoices.length ? t.total / t.invoices.length : 0))

  // Chart cards 1, 2, 4, 5 — each reads its dimension/measure from Settings ▸ Charts
  // (useDisplayStore's chartSlots), defaulting to today's exact behavior. groupRows/
  // seriesFromGroups (lib/reports.ts) already compute every dimension x every measure in
  // one pass, so reconfiguring a slot never needs new aggregation logic, just a different
  // read of the same grouped data.
  const dashTrendSeries = useMemo(() => {
    const { dimension = "month", measure } = chartSlots.dashTrend
    return seriesFromGroups(groupRows(rows, dimension), dimension, measure)
  }, [rows, chartSlots.dashTrend])
  const byService = useMemo(() => {
    const { dimension = "service", measure } = chartSlots.dashService
    return seriesFromGroups(groupRows(rows, dimension), dimension, measure)
  }, [rows, chartSlots.dashService])
  const byVendor = useMemo(() => vendorBreakdown(rows), [rows])
  const byVendorService = useMemo(() => vendorServiceBreakdown(rows), [rows])
  const byVendorType = useMemo(() => vendorTypeBreakdown(rows), [rows])
  // Card 3 keeps its special stacked-by-service/type look only while its dimension is the
  // default "vendor" (or unset); any other explicit choice falls back to a flat breakdown,
  // since the stacking doesn't generalize to an arbitrary dimension.
  const dashVendorDim = chartSlots.dashVendor.dimension ?? "vendor"
  // The special stacked-by-service/type look only applies to the true default (vendor
  // dimension, $ incl.-tax measure) — any other explicit choice, including just a
  // different measure with "vendor" still picked, falls back to a flat breakdown.
  const dashVendorIsDefault = dashVendorDim === "vendor" && chartSlots.dashVendor.measure === "incl"
  const dashVendorSeries = useMemo(() => {
    if (dashVendorIsDefault) return null
    return seriesFromGroups(groupRows(rows, dashVendorDim), dashVendorDim, chartSlots.dashVendor.measure)
  }, [rows, dashVendorDim, dashVendorIsDefault, chartSlots.dashVendor.measure])
  // Card 4's dimension defaults to the existing auto-swap (Contractor breakdown normally,
  // Type-of-work breakdown once a single contractor is picked) — an explicit Settings
  // choice overrides that permanently.
  const dashBreakdownDim = chartSlots.dashBreakdown.dimension ?? (dashVendor === "ALL" ? "vendor" : "type")
  const byBreakdown = useMemo(
    () => seriesFromGroups(groupRows(rows, dashBreakdownDim), dashBreakdownDim, chartSlots.dashBreakdown.measure),
    [rows, dashBreakdownDim, chartSlots.dashBreakdown.measure]
  )
  const byStatus = useMemo(() => {
    const { dimension = "status", measure } = chartSlots.dashStatus
    return seriesFromGroups(groupRows(rows, dimension), dimension, measure)
  }, [rows, chartSlots.dashStatus])
  const contractCost = dashVendor !== "ALL" ? vendorContractCost(deptContracts, dashVendor) : 0

  const [drill, setDrill] = useState<{ title: string; invoices: Invoice[] } | null>(null)
  const onDrill = (title: string, drillInvoices: Invoice[]) => setDrill({ title, invoices: drillInvoices })

  if (invoicesQuery.isLoading || contractsQuery.isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-4">
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
        <div className="min-w-0">
          {/* Square card grid below md — replaces the pill row entirely on
              mobile rather than just restyling it, since a wrapped pill row
              reads as desktop UI carried over, not a native mobile picker. */}
          <div className="grid grid-cols-3 gap-3 md:hidden">
            <PickerCard
              active={activeDept === "ALL"}
              color={PICKER_NEUTRAL}
              icon={<Layers className="size-6" />}
              label="All Departments"
              onClick={() => setActiveDept("ALL")}
            />
            {refLists.departments.map((d, i) => (
              <PickerCard
                key={d}
                active={activeDept === d}
                color={PICKER_PALETTE[i % PICKER_PALETTE.length]}
                icon={<Building2 className="size-6" />}
                label={d}
                onClick={() => setActiveDept(d)}
              />
            ))}
          </div>
          <div className="hidden md:flex md:flex-wrap md:items-center md:gap-2 md:rounded-2xl md:border md:bg-card/80 md:p-2 md:shadow-[0_5px_0_hsl(var(--border)/0.7),0_12px_20px_-16px_hsl(var(--foreground)/0.35)]">
            <Button
              size="sm"
              variant={activeDept === "ALL" ? "default" : "outline"}
              className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
              onClick={() => setActiveDept("ALL")}
            >
              All Departments
            </Button>
            {refLists.departments.map((d, i) => {
              const deptColor = PICKER_PALETTE[i % PICKER_PALETTE.length]
              return (
                <Button
                  key={d}
                  size="sm"
                  variant={activeDept === d ? "default" : "outline"}
                  className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
                  style={
                    activeDept === d
                      ? { backgroundColor: deptColor, borderColor: deptColor }
                      : { borderColor: `color-mix(in oklch, ${deptColor} 35%, var(--border))`, color: deptColor }
                  }
                  onClick={() => setActiveDept(d)}
                >
                  {d}
                </Button>
              )
            })}
          </div>
        </div>
      )}

      <div className="min-w-0">
        <div className="grid grid-cols-3 gap-3 md:hidden">
          <PickerCard
            active={dashVendor === "ALL"}
            color={PICKER_NEUTRAL}
            icon={<Wallet className="size-6" />}
            label="All"
            onClick={() => setDashVendor("ALL")}
          />
          {dataVendors.map((v) => (
            <PickerCard
              key={v}
              active={dashVendor === v}
              color={vendorColor(v)}
              icon={<ContractorLogo vendor={v} logo={getContractorLogo(contractorLogosQuery.data ?? {}, v)} color={vendorColor(v)} size="lg" />}
              bareIcon
              label={v}
              onClick={() => setDashVendor(v)}
            />
          ))}
        </div>
        <div className="hidden md:flex md:flex-wrap md:items-center md:gap-2 md:rounded-2xl md:border md:bg-card/80 md:p-2 md:shadow-[0_5px_0_hsl(var(--border)/0.7),0_12px_20px_-16px_hsl(var(--foreground)/0.35)]">
          <Button
            size="sm"
            variant={dashVendor === "ALL" ? "default" : "outline"}
            className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
            onClick={() => setDashVendor("ALL")}
          >
            All
          </Button>
          {dataVendors.map((v) => (
            <Button
              key={v}
              size="sm"
              variant={dashVendor === v ? "default" : "outline"}
              className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
              style={
                dashVendor === v
                  ? { backgroundColor: vendorColor(v), borderColor: vendorColor(v) }
                  : { borderColor: `color-mix(in oklch, ${vendorColor(v)} 35%, var(--border))`, color: vendorColor(v) }
              }
              onClick={() => setDashVendor(v)}
            >
              {v}
            </Button>
          ))}
        </div>
      </div>

      <div className="min-w-0 grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-4">
        <KpiTile
          hero
          icon={<Droplets />}
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
          icon={<Banknote />}
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
          iconClassName="status-icon-cleared"
          accent="var(--status-cleared)"
          label="Cleared"
          value={stats.k.cleared.toLocaleString()}
          valueClassName="text-status-cleared"
          sub={`${((stats.k.cleared / stats.k.count) * 100 || 0).toFixed(0)}% of invoices`}
          onClick={() => onDrill("Cleared Invoices", clearedInvoices(rows))}
        />
        <KpiTile
          icon={<Hourglass />}
          iconClassName="status-icon-under"
          accent="var(--status-under)"
          label="Pending / in process"
          value={stats.k.pending.toLocaleString()}
          valueClassName="text-status-under"
          sub="Awaiting clearance"
          onClick={() => onDrill("Pending Invoices", pendingInvoices(rows))}
        />
        {dashVendor !== "ALL" && contractCost > 0 && (
          <>
            <KpiTile
              icon={<CircleDollarSign />}
              accent="var(--chart-3)"
              label="Contract cost"
              value={fmtMoney(contractCost)}
              sub={`All ${dashVendor} contracts`}
              onClick={() => onDrill(`Invoices — ${dashVendor}`, rows)}
            />
            <KpiTile
              icon={<Coins />}
              accent="var(--chart-4)"
              label="Remaining"
              value={fmtMoney(contractCost - stats.k.totalIncl)}
              valueClassName={contractCost - stats.k.totalIncl < 0 ? "text-status-returned" : "text-status-cleared"}
              sub={`${Math.min(100, (stats.k.totalIncl / contractCost) * 100).toFixed(1)}% utilized`}
              onClick={() => onDrill(`Invoices — ${dashVendor}`, rows)}
            />
          </>
        )}
      </div>

      <div className="min-w-0 grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <KpiTile
          icon={<TrendingUp />}
          accent="var(--chart-1)"
          label="This quarter"
          value={fmtMoney(stats.thisQTotal)}
          sub={<PctSub pct={stats.qoqPct} label="vs last quarter" />}
          onClick={() =>
            onDrill(`Invoices — ${stats.latestQtrYr ?? ""} ${stats.latestQtrStr ?? ""}`.trim(), invoicesInQuarter(rows, stats.latestQtrYr, stats.latestQtrStr))
          }
        />
        <KpiTile
          icon={<CalendarDays />}
          accent="var(--chart-2)"
          label={`Fiscal year ${stats.latestYr || "—"}`}
          value={fmtMoney(stats.ytdTotal)}
          sub={<PctSub pct={stats.yoyPct} label="vs prior year" />}
          onClick={() => onDrill(`Invoices — FY ${stats.latestYr ?? ""}`, invoicesInYear(rows, stats.latestYr))}
        />
        <KpiTile
          icon={<Receipt />}
          iconClassName="status-icon-cleared"
          accent="var(--status-cleared)"
          label="Avg invoice value"
          value={fmtMoney(stats.avgInvoiceValue)}
          sub={`Across ${stats.k.count.toLocaleString()} invoices`}
          trend={avgSparkline.length > 1 ? <Sparkline data={avgSparkline} /> : undefined}
          onClick={() => onDrill(dashVendor === "ALL" ? "All Invoices" : `Invoices — ${dashVendor}`, rows)}
        />
        <KpiTile
          icon={<Timer />}
          iconClassName="status-icon-under"
          accent="var(--status-under)"
          label="Avg days to clear"
          value={stats.avgDaysToClear == null ? "—" : `${stats.avgDaysToClear.toFixed(1)}d`}
          sub={`${stats.clearDaysCount} invoices with dates`}
          onClick={() => onDrill("Invoices with recorded clearance time", invoicesWithClearTime(rows))}
        />
        <KpiTile
          icon={<Award />}
          iconClassName="status-icon-returned"
          accent="var(--status-returned)"
          label="Top contractor share"
          value={stats.topVendorPct == null ? "—" : `${stats.topVendorPct.toFixed(0)}%`}
          sub={stats.topVendor ? stats.topVendor[0] : "No data"}
          onClick={() => stats.topVendor && onDrill(`Invoices — ${stats.topVendor[0]}`, invoicesForVendorName(rows, stats.topVendor[0]))}
        />
        <KpiTile
          icon={<FileCheck2 />}
          accent="var(--chart-5)"
          label="Active contracts"
          value={stats.activeContracts.length}
          sub={
            stats.expiringSoon > 0 ? (
              <span className="text-status-under">{stats.expiringSoon} expiring within 30 days</span>
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
            <h3 className="flex items-center gap-2 text-base font-bold md:text-base md:font-semibold">
              <span className="hidden h-4 w-1 rounded-full bg-primary md:inline-block" />
              Contractor Expenditure Overview
            </h3>
            <Button size="sm" variant="ghost" asChild>
              <Link to="/vendors">Manage contracts</Link>
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {dataVendors.map((v) => {
              const vRows = deptInvoices.filter((r) => r.vendor === v)
              const total = vRows.reduce((s, r) => s + (Number(r.amountInclTax) || 0), 0)
              const lead = avgLeadTime(vRows)
              // Each contractor's own identity color (already used for its logo/ticker dot
              // elsewhere) drives the whole card now — a shared var(--primary) here made
              // every contractor's money figure read as visually identical.
              const logoColor = vendorColor(v)
              const accent = logoColor
              return (
                <button
                  key={v}
                  className="group relative min-h-[190px] overflow-hidden rounded-2xl border p-4 text-left shadow-[0_5px_0_var(--contractor-shadow),0_12px_20px_-16px_var(--contractor-glow)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_8px_0_var(--contractor-shadow),0_22px_30px_-16px_var(--contractor-glow)] active:translate-y-1 active:scale-[0.985] active:shadow-[0_2px_0_var(--contractor-shadow),0_7px_12px_-10px_var(--contractor-glow)] active:duration-100 md:min-h-[200px] md:rounded-2xl md:p-4 md:hover:-translate-y-1 md:hover:shadow-[0_7px_0_var(--contractor-shadow),0_22px_30px_-16px_var(--contractor-glow)] md:active:translate-y-1 xl:min-h-[196px]"
                  style={
                    {
                      borderColor: `color-mix(in oklch, ${accent} 28%, var(--border))`,
                      backgroundImage: `linear-gradient(145deg, color-mix(in oklch, ${accent} 7%, var(--card)) 0%, var(--card) 64%, color-mix(in oklch, ${accent} 3%, var(--card)) 100%)`,
                      "--contractor-shadow": `color-mix(in oklch, ${accent} 25%, var(--border))`,
                      "--contractor-glow": `color-mix(in oklch, ${accent} 42%, transparent)`,
                    } as React.CSSProperties
                  }
                  onClick={() => setDashVendor(v)}
                >
                  <span
                    className="absolute top-0 left-0 h-1 w-full opacity-80 transition-opacity duration-300 group-hover:opacity-100"
                    style={{ backgroundColor: accent }}
                  />
                  <div className="flex items-center gap-3">
                    <div
                      className="rounded-full p-1.5 shadow-[0_5px_10px_-5px_var(--contractor-glow)] ring-1 ring-black/5 transition-transform duration-300 group-hover:scale-105 group-hover:[transform:rotateY(8deg)]"
                      style={{ backgroundColor: `color-mix(in oklch, ${accent} 10%, var(--card))` }}
                    >
                      <ContractorLogo vendor={v} logo={getContractorLogo(contractorLogosQuery.data ?? {}, v)} color={logoColor} size="lg" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-[15px] font-bold tracking-tight">{v}</div>
                      <div className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Contractor</div>
                    </div>
                  </div>
                  <div className="mt-4 border-t pt-3" style={{ borderColor: `color-mix(in oklch, ${accent} 16%, var(--border))` }}>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Expenditure incl. tax</div>
                    <div className="mt-0.5 truncate text-xl font-extrabold tracking-tight tabular-nums" style={{ color: accent }}>
                      {fmtMoney(total)}
                    </div>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-xl border bg-background/55 px-2.5 py-2 shadow-inner">
                      <dt className="text-[10px] font-medium text-muted-foreground">Invoices logged</dt>
                      <dd className="mt-0.5 text-sm font-bold tabular-nums">{vRows.length}</dd>
                    </div>
                    <div className="rounded-xl border bg-background/55 px-2.5 py-2 shadow-inner">
                      <dt className="text-[10px] font-medium text-muted-foreground">Avg. clearance</dt>
                      <dd className="mt-0.5 text-sm font-bold tabular-nums">{lead !== null ? `${lead} days` : "—"}</dd>
                    </div>
                  </dl>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="min-w-0">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="flex items-center gap-2 text-base font-bold md:text-base md:font-semibold">
            <span className="hidden h-4 w-1 rounded-full bg-primary md:inline-block" />
            Expenditure Analysis
          </h3>
          <p className="text-xs text-muted-foreground">Click a bar, slice, or point to see its invoices</p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
          {!chartSlots.dashTrend.hidden && (
          <ChartCard
            accent="var(--dataviz-1)"
            title={(chartSlots.dashTrend.dimension && chartSlots.dashTrend.dimension !== "month") || chartSlots.dashTrend.measure !== "incl"
              ? `${chartMeasureLabel(chartSlots.dashTrend.measure)} by ${reportGroupLabel(chartSlots.dashTrend.dimension ?? "month")}`
              : "Monthly Expenditure Trend"}
            action={
              <div className="flex items-center gap-0.5">
                <ChartVisibilityToggle id="dashTrend" />
                <ChartTypeMenu options={CHART_OPTIONS.trend} value={trendChartType} onChange={(t) => setChartType("trendChartType", t)} />
              </div>
            }
          >
            <ChartSlotContextMenu
              id="dashTrend"
              hasDimension
              hasZoom
              chartTypeOptions={CHART_OPTIONS.trend}
              chartTypeValue={trendChartType}
              onChartTypeChange={(t) => setChartType("trendChartType", t)}
            >
              <TrendChart
                data={dashTrendSeries.map((p) => ({
                  month: formatGroupKey(chartSlots.dashTrend.dimension ?? "month", p.key),
                  key: p.key,
                  total: p.value,
                  invoices: p.invoices,
                }))}
                onDrill={onDrill}
                zoomEnabled={chartSlots.dashTrend.zoomEnabled ?? true}
              />
            </ChartSlotContextMenu>
          </ChartCard>
          )}
          {!chartSlots.dashService.hidden && (
          <ChartCard
            accent="var(--dataviz-3)"
            title={chartSlots.dashService.dimension && (chartSlots.dashService.dimension !== "service" || chartSlots.dashService.measure !== "incl")
              ? `${chartMeasureLabel(chartSlots.dashService.measure)} by ${reportGroupLabel(chartSlots.dashService.dimension)}`
              : "Expenditure by Service"}
            action={
              <div className="flex items-center gap-0.5">
                <ChartVisibilityToggle id="dashService" />
                <ChartTypeMenu options={CHART_OPTIONS.service} value={serviceChartType} onChange={(t) => setChartType("serviceChartType", t)} />
              </div>
            }
          >
            <ChartSlotContextMenu
              id="dashService"
              hasDimension
              chartTypeOptions={CHART_OPTIONS.service}
              chartTypeValue={serviceChartType}
              onChartTypeChange={(t) => setChartType("serviceChartType", t)}
            >
              <ServiceChart
                data={byService.map((p) => ({
                  service: formatGroupKey(chartSlots.dashService.dimension ?? "service", p.key),
                  total: p.value,
                  invoices: p.invoices,
                }))}
                chartType={serviceChartType}
                onDrill={onDrill}
              />
            </ChartSlotContextMenu>
          </ChartCard>
          )}
          {!chartSlots.dashVendor.hidden && (
          <ChartCard
            accent="var(--dataviz-4)"
            title={dashVendorSeries
              ? `${chartMeasureLabel(chartSlots.dashVendor.measure)} by ${reportGroupLabel(dashVendorDim)}`
              : (dashVendor === "ALL" ? "Invoice Value by Contractor" : `Invoice Value — ${dashVendor}`)}
            action={
              <div className="flex items-center gap-0.5">
                <ChartVisibilityToggle id="dashVendor" />
                <ChartTypeMenu options={CHART_OPTIONS.contractor} value={vendorChartType} onChange={(t) => setChartType("vendorChartType", t)} />
              </div>
            }
          >
            <ChartSlotContextMenu
              id="dashVendor"
              hasDimension
              chartTypeOptions={CHART_OPTIONS.contractor}
              chartTypeValue={vendorChartType}
              onChartTypeChange={(t) => setChartType("vendorChartType", t)}
            >
              {dashVendorSeries ? (
                <ContractorInvoicesChart
                  data={dashVendorSeries.map((p) => ({ vendor: formatGroupKey(dashVendorDim, p.key), count: p.value, invoices: p.invoices }))}
                  onDrill={onDrill}
                />
              ) : (
                <VendorChart data={byVendor} serviceBreakdown={byVendorService} typeBreakdown={byVendorType} onDrill={onDrill} />
              )}
            </ChartSlotContextMenu>
          </ChartCard>
          )}
          {!chartSlots.dashBreakdown.hidden && (
          <ChartCard
            accent="var(--dataviz-2)"
            title={chartSlots.dashBreakdown.dimension || chartSlots.dashBreakdown.measure !== "count"
              ? `${chartMeasureLabel(chartSlots.dashBreakdown.measure)} by ${reportGroupLabel(dashBreakdownDim)}`
              : (dashVendor === "ALL" ? "Invoices by Contractor" : `Invoices by Type — ${dashVendor}`)}
            action={
              <div className="flex items-center gap-0.5">
                <ChartVisibilityToggle id="dashBreakdown" />
                <ChartTypeMenu options={CHART_OPTIONS.invoices} value={breakdownChartType} onChange={(t) => setChartType("breakdownChartType", t)} />
              </div>
            }
          >
            <ChartSlotContextMenu
              id="dashBreakdown"
              hasDimension
              chartTypeOptions={CHART_OPTIONS.invoices}
              chartTypeValue={breakdownChartType}
              onChartTypeChange={(t) => setChartType("breakdownChartType", t)}
            >
              <ContractorInvoicesChart
                data={byBreakdown.map((p) => ({ vendor: formatGroupKey(dashBreakdownDim, p.key), count: p.value, invoices: p.invoices }))}
                onDrill={onDrill}
              />
            </ChartSlotContextMenu>
          </ChartCard>
          )}
          {!chartSlots.dashStatus.hidden && (
          <ChartCard
            accent="var(--dataviz-5)"
            title={chartSlots.dashStatus.dimension && (chartSlots.dashStatus.dimension !== "status" || chartSlots.dashStatus.measure !== "incl")
              ? `${chartMeasureLabel(chartSlots.dashStatus.measure)} by ${reportGroupLabel(chartSlots.dashStatus.dimension)}`
              : "Expenditure by Status"}
            action={
              <div className="flex items-center gap-0.5">
                <ChartVisibilityToggle id="dashStatus" />
                <ChartTypeMenu options={CHART_OPTIONS.status} value={statusChartType} onChange={(t) => setChartType("statusChartType", t)} />
              </div>
            }
          >
            <ChartSlotContextMenu
              id="dashStatus"
              hasDimension
              chartTypeOptions={CHART_OPTIONS.status}
              chartTypeValue={statusChartType}
              onChartTypeChange={(t) => setChartType("statusChartType", t)}
            >
              <ServiceChart
                data={byStatus.map((p) => ({
                  service: formatGroupKey(chartSlots.dashStatus.dimension ?? "status", p.key),
                  total: p.value,
                  invoices: p.invoices,
                }))}
                chartType={statusChartType}
                onDrill={onDrill}
              />
            </ChartSlotContextMenu>
          </ChartCard>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm md:rounded-lg md:shadow-none">
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="flex items-center gap-2 text-base font-bold md:text-base md:font-semibold">
            <span className="hidden h-4 w-1 rounded-full bg-primary md:inline-block" />
            Recent Invoices{dashVendor !== "ALL" ? ` — ${dashVendor}` : ""}
          </h3>
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


