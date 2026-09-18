/** Descriptive-summary block shown above a drill-down's row list — a short narrated
 *  account of the segment (count/total, biggest contractor/service, paid vs. outstanding,
 *  status mix, turnaround, ...), not just the raw rows underneath it. Takes plain prose
 *  sentences so both the invoice- and well-cost-flavored drill-downs can share it. */
export function SegmentSummaryPanel({ sentences }: { sentences: string[] }) {
  if (!sentences.length) return null
  return (
    <div className="grid gap-1 rounded-lg border bg-muted/40 p-3 text-sm leading-relaxed">
      {sentences.map((s, i) => (
        <p key={i} className={i === 0 ? "font-medium text-foreground" : "text-muted-foreground"}>
          {s}
        </p>
      ))}
    </div>
  )
}
