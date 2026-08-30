import { ChevronLeft, ChevronRight, Printer } from "lucide-react"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { buildNarrative, buildReportData, shiftAnchor, REPORT_PERIODS, type ReportPeriod } from "@/lib/managementReport"
import type { Invoice } from "@/types/invoice"
import { BoardNarrativeReport } from "./BoardNarrativeReport"
import { ExecutiveAnalyticsReport } from "./ExecutiveAnalyticsReport"
import { StoryReport } from "./StoryReport"

type ReportStyle = "narrative" | "analytics" | "story"

const STYLE_TABS: { key: ReportStyle; label: string }[] = [
  { key: "narrative", label: "Board Narrative" },
  { key: "analytics", label: "Executive Analytics" },
  { key: "story", label: "One-Page Story" },
]

/** Management spend report for board/committee presentation — weekly, fortnightly or
 *  monthly, in any of three layouts, all built from the same real invoice data already
 *  scoped (by department) upstream in ReportsPage. "Print" uses the browser's native
 *  print/save-as-PDF via the #print-report id (see the @media print rules in index.css),
 *  which isolate just the active report card from the rest of the app chrome. */
export function ManagementReportView({ invoices, onDrill }: { invoices: Invoice[]; onDrill: (rows: Invoice[], title: string) => void }) {
  const [period, setPeriod] = useState<ReportPeriod>("month")
  const [anchor, setAnchor] = useState(() => new Date())
  const [style, setStyle] = useState<ReportStyle>("narrative")

  const data = useMemo(() => buildReportData(period, anchor, invoices), [period, anchor, invoices])
  const narrative = useMemo(() => buildNarrative(data), [data])

  function drill(title: string, rows: Invoice[]) {
    onDrill(rows, title)
  }

  const isCurrent = useMemo(() => {
    const today = new Date()
    return today >= new Date(data.range.from) && today <= new Date(`${data.range.to}T23:59:59`)
  }, [data.range])

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3 print:hidden">
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as ReportPeriod)}>
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REPORT_PERIODS.map((p) => (
                <SelectItem key={p.key} value={p.key}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center rounded-md border">
            <Button variant="ghost" size="icon" className="size-8" title="Previous period" onClick={() => setAnchor((a) => shiftAnchor(period, a, -1))}>
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-[128px] px-1 text-center text-xs font-semibold">{data.range.shortLabel}</span>
            <Button variant="ghost" size="icon" className="size-8" title="Next period" onClick={() => setAnchor((a) => shiftAnchor(period, a, 1))}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
          {!isCurrent && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setAnchor(new Date())}>
              Jump to current
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-lg border bg-muted/50 p-1">
            {STYLE_TABS.map((t) => (
              <Button key={t.key} size="sm" variant={style === t.key ? "default" : "ghost"} className="h-7 px-2.5 text-xs" onClick={() => setStyle(t.key)}>
                {t.label}
              </Button>
            ))}
          </div>
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => window.print()}>
            <Printer className="size-3.5" />
            Print / Save PDF
          </Button>
        </div>
      </div>

      <div id="print-report">
        {style === "narrative" && <BoardNarrativeReport data={data} narrative={narrative} onDrill={drill} />}
        {style === "analytics" && <ExecutiveAnalyticsReport data={data} onDrill={drill} />}
        {style === "story" && <StoryReport data={data} narrative={narrative} onDrill={drill} />}
      </div>
    </div>
  )
}
