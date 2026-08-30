import { AlertTriangle } from "lucide-react"
import { fmtMoney } from "@/lib/dashboard"
import type { NarrativeMove } from "@/lib/managementReport"
import type { WatchItem } from "@/lib/managementReport"
import { cn } from "@/lib/utils"

export function Kpi({ label, value, delta, tone }: { label: string; value: string; delta?: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</div>
      <div className="mt-1.5 text-lg font-bold tabular-nums">{value}</div>
      {delta && <div className={cn("mt-1 text-xs font-semibold", tone === "bad" ? "text-status-returned" : tone === "good" ? "text-status-cleared" : "text-muted-foreground")}>{delta}</div>}
    </div>
  )
}

const TONE_CHIP: Record<NarrativeMove["tone"], string> = {
  good: "text-status-cleared bg-status-cleared/10",
  bad: "text-status-returned bg-status-returned/10",
  neutral: "text-primary bg-primary/10",
}
const TONE_LABEL: Record<NarrativeMove["tone"], string> = { good: "Positive", bad: "Needs a decision", neutral: "Steady state" }

export function MoveCard({ move }: { move: NarrativeMove }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3.5">
      <h4 className="text-sm leading-snug font-semibold">{move.title}</h4>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{move.body}</p>
      <span className={cn("mt-2.5 inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold", TONE_CHIP[move.tone])}>{TONE_LABEL[move.tone]}</span>
    </div>
  )
}

export function WatchListPanel({ items, thresholdDays, onDrillItem }: { items: WatchItem[]; thresholdDays: number; onDrillItem?: (item: WatchItem) => void }) {
  if (!items.length) {
    return (
      <div className="rounded-lg border bg-status-cleared/5 p-4 text-center text-xs text-muted-foreground">
        No invoices are currently aging past {thresholdDays} days.
      </div>
    )
  }
  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="flex items-center gap-2 border-b bg-status-under/10 px-3.5 py-2.5">
        <AlertTriangle className="size-3.5 text-status-under" />
        <span className="text-xs font-semibold">
          {items.length} invoice{items.length === 1 ? "" : "s"} aging past {thresholdDays} days
        </span>
      </div>
      {items.map((w, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onDrillItem?.(w)}
          className="flex w-full items-center justify-between gap-3 border-t px-3.5 py-2.5 text-left first:border-t-0 hover:bg-muted/40"
        >
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold">{w.vendor}</div>
            <div className="truncate text-[11px] text-muted-foreground">
              {w.contractNo} · {w.days} days
            </div>
          </div>
          <div className="shrink-0 text-xs font-bold text-status-returned tabular-nums">{fmtMoney(w.amount)}</div>
        </button>
      ))}
    </div>
  )
}
