import { TrendChart } from "@/components/dashboard/TrendChart"
import { ServiceChart } from "@/components/dashboard/ServiceChart"
import { fmtMoney } from "@/lib/dashboard"
import type { Narrative, ReportData, WatchItem } from "@/lib/managementReport"
import type { Invoice } from "@/types/invoice"
import { Kpi, MoveCard, WatchListPanel } from "./ReportPrimitives"

/** Direction A — a board memo: cover thesis, KPI strip, three "moves that shaped the
 *  period" callouts, a trend chart, a contractor breakdown, a watch list, and a closing
 *  recommendation. Built for a committee that wants the story told to them. */
export function BoardNarrativeReport({
  data,
  narrative,
  onDrill,
}: {
  data: ReportData
  narrative: Narrative
  onDrill: (title: string, invoices: Invoice[]) => void
}) {
  const spendDelta = data.prevStats.incl ? ((data.stats.incl - data.prevStats.incl) / data.prevStats.incl) * 100 : null
  const countDelta = data.prevStats.count ? ((data.stats.count - data.prevStats.count) / data.prevStats.count) * 100 : null
  const taDelta = data.stats.taAvg !== null && data.prevStats.taAvg !== null ? data.stats.taAvg - data.prevStats.taAvg : null

  return (
    <div className="grid gap-6 rounded-lg border bg-card p-6 md:p-8">
      <div className="border-b pb-5">
        <span className="inline-block rounded bg-primary/10 px-2 py-0.5 text-[11px] font-bold tracking-wide text-primary uppercase">
          {data.period === "week" ? "Weekly" : data.period === "fortnight" ? "Fortnightly" : "Monthly"} spend report
        </span>
        <h1 className="mt-3 text-2xl leading-tight font-bold text-balance md:text-[28px]">
          {spendDelta === null ? "Portfolio spend for the period" : spendDelta >= 0 ? `Spend rose ${Math.abs(spendDelta).toFixed(1)}% as ${taDelta !== null && taDelta < 0 ? "turnaround improved" : "volume picked up"}` : `Spend eased ${Math.abs(spendDelta).toFixed(1)}% as ${taDelta !== null && taDelta < 0 ? "turnaround improved" : "the queue held steady"}`}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Period <b className="font-semibold text-foreground">{data.range.label}</b> · Prepared for the Contracts &amp; Finance Committee
        </p>
      </div>

      <p className="max-w-[68ch] text-[15px] leading-relaxed">{narrative.lede}</p>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Period spend" value={fmtMoney(data.stats.incl)} delta={spendDelta === null ? undefined : `${spendDelta >= 0 ? "↑" : "↓"} ${Math.abs(spendDelta).toFixed(1)}% vs prior`} tone={spendDelta !== null && spendDelta < 0 ? "good" : undefined} />
        <Kpi label="Invoices" value={String(data.stats.count)} delta={countDelta === null ? undefined : `${countDelta >= 0 ? "↑" : "↓"} ${Math.abs(countDelta).toFixed(1)}% vs prior`} />
        <Kpi label="Avg. turnaround" value={data.stats.taAvg !== null ? `${data.stats.taAvg.toFixed(1)}d` : "—"} delta={taDelta === null ? undefined : `${taDelta <= 0 ? "↓" : "↑"} from ${data.prevStats.taAvg?.toFixed(1)}d`} tone={taDelta !== null ? (taDelta <= 0 ? "good" : "bad") : undefined} />
        <Kpi label="Outstanding" value={fmtMoney(data.stats.outstanding)} delta={data.stats.incl ? `${((data.stats.outstanding / data.stats.incl) * 100).toFixed(1)}% of spend` : undefined} tone={data.stats.incl && data.stats.outstanding / data.stats.incl > 0.25 ? "bad" : undefined} />
      </div>

      <div>
        <h2 className="mb-3 text-base font-semibold">Three moves that shaped the period</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {narrative.moves.map((m, i) => (
            <MoveCard key={i} move={m} />
          ))}
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Spend trend</h2>
          <span className="text-xs text-muted-foreground">Trailing 12 {data.period === "week" ? "weeks" : data.period === "fortnight" ? "fortnights" : "months"}</span>
        </div>
        <TrendChart data={data.trend} onDrill={onDrill} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <h2 className="mb-3 text-base font-semibold">Where the money went</h2>
          <ServiceChart
            data={data.contractors.slice(0, 6).map((g) => ({ service: g.key, total: g.incl, invoices: g.rows }))}
            chartType="bar"
            onDrill={onDrill}
          />
        </div>
        <div>
          <h2 className="mb-3 text-base font-semibold">Watch list</h2>
          <WatchListPanel items={data.watchList} thresholdDays={data.watchThresholdDays} onDrillItem={(w: WatchItem) => onDrill(`${w.vendor} — aging invoice`, [w.invoice])} />
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4 border-t pt-5">
        <p className="max-w-[56ch] text-sm leading-relaxed">{narrative.closing}</p>
        <div className="text-right text-[11px] text-muted-foreground">
          Prepared by Finance &amp; Contracts Analytics
          <br />
          Generated {new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}
        </div>
      </div>
    </div>
  )
}
