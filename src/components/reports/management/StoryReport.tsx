import { TrendChart } from "@/components/dashboard/TrendChart"
import { ServiceChart } from "@/components/dashboard/ServiceChart"
import { fmtMoney } from "@/lib/dashboard"
import type { Narrative, ReportData } from "@/lib/managementReport"
import type { Invoice } from "@/types/invoice"

/** Direction C — editorial/data-journalism style: numbers woven into prose, one pull-quote
 *  for the thing that needs a decision, and charts as illustrations inside the story rather
 *  than a grid. Built to read well on its own, e.g. emailed ahead of a meeting. */
export function StoryReport({
  data,
  narrative,
  onDrill,
}: {
  data: ReportData
  narrative: Narrative
  onDrill: (title: string, invoices: Invoice[]) => void
}) {
  const spendDelta = data.prevStats.incl ? ((data.stats.incl - data.prevStats.incl) / data.prevStats.incl) * 100 : null
  const top = data.contractors[0]
  const topShare = top && data.stats.incl ? (top.incl / data.stats.incl) * 100 : null
  const decisionMove = narrative.moves.find((m) => m.tone === "bad") || narrative.moves[narrative.moves.length - 1]

  return (
    <div className="grid gap-1 rounded-lg border bg-card p-6 md:p-10">
      <div className="border-b pb-6">
        <span className="inline-block rounded bg-primary/10 px-2 py-0.5 text-[11px] font-bold tracking-wide text-primary uppercase">The period in spend</span>
        <h1 className="mt-4 max-w-[17ch] text-[28px] leading-[1.15] font-bold text-balance md:text-[32px]">
          {spendDelta === null ? "A look at the portfolio this period" : spendDelta >= 0 ? "A busier period, and a portfolio that kept pace" : "A quieter period, with room to work the backlog"}
        </h1>
        <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-muted-foreground">
          Drilling fluids expenditure for {data.range.label}, told the way it would read in a briefing — the numbers in
          context, not just in a table.
        </p>
        <div className="mt-5 flex gap-4 border-t pt-3 text-[11px] text-muted-foreground">
          <span>OGDCL Drilling Fluids — Expenditure Desk</span>
          <span>{new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}</span>
        </div>
      </div>

      <div className="grid gap-8 pt-6 lg:grid-cols-[1fr_240px]">
        <div className="max-w-[62ch] text-[15.5px] leading-relaxed [&_p]:my-4">
          <p>{narrative.lede}</p>

          <div className="my-6 overflow-hidden rounded-lg border">
            <div className="flex items-center justify-between border-b bg-muted/20 px-4 py-2.5">
              <h4 className="text-xs font-bold">Spend trend</h4>
              <span className="text-[11px] text-muted-foreground">Trailing 12 {data.period === "week" ? "weeks" : data.period === "fortnight" ? "fortnights" : "months"}</span>
            </div>
            <div className="p-4">
              <TrendChart data={data.trend} onDrill={onDrill} />
            </div>
          </div>

          {narrative.moves[0] && <p>{narrative.moves[0].title}. {narrative.moves[0].body}</p>}

          {top && topShare !== null && (
            <p>
              Contractor concentration {narrative.moves[1]?.tone === "bad" ? "shifted" : "held steady"}: <b>{top.key}</b> took
              the largest single share of the period at <b>{topShare.toFixed(0)}%</b>, with the rest of the top contractors
              rounding out a familiar mix.
            </p>
          )}

          {decisionMove && (
            <div className="my-7 max-w-[52ch] border-l-2 border-primary py-1 pl-5 text-[19px] leading-snug font-semibold text-balance">
              &ldquo;{decisionMove.title} — {decisionMove.body}&rdquo;
              <div className="mt-2 text-[11px] font-normal tracking-wide text-muted-foreground uppercase">Finance &amp; Contracts Analytics</div>
            </div>
          )}

          <p>{narrative.closing}</p>

          <div className="my-6 overflow-hidden rounded-lg border">
            <div className="flex items-center justify-between border-b bg-muted/20 px-4 py-2.5">
              <h4 className="text-xs font-bold">Spend by contractor</h4>
              <span className="text-[11px] text-muted-foreground">{data.range.label}</span>
            </div>
            <div className="p-4">
              <ServiceChart data={data.contractors.slice(0, 6).map((g) => ({ service: g.key, total: g.incl, invoices: g.rows }))} chartType="bar" onDrill={onDrill} />
            </div>
          </div>
        </div>

        <div className="h-fit rounded-lg border bg-primary/5 p-4">
          <h4 className="mb-3 text-[11px] font-bold tracking-wide text-primary uppercase">By the numbers</h4>
          <dl className="grid gap-2.5 text-[12.5px]">
            {[
              ["Period spend", fmtMoney(data.stats.incl)],
              ["Invoices", String(data.stats.count)],
              ["Avg turnaround", data.stats.taAvg !== null ? `${data.stats.taAvg.toFixed(1)} days` : "—"],
              ["Cleared", `${data.stats.clearedPct.toFixed(0)}%`],
              ["Outstanding", fmtMoney(data.stats.outstanding)],
              ["Top contractor", top ? `${top.key}, ${topShare?.toFixed(0)}%` : "—"],
            ].map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-2 border-t border-primary/15 pt-2.5 first:border-t-0 first:pt-0">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="text-right font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  )
}
