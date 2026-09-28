import { cn } from "@/lib/utils"
import { statusTone } from "@/lib/dashboard"

const TONE_STYLES = {
  cleared: { color: "var(--status-cleared)", backgroundColor: "color-mix(in oklch, var(--status-cleared) 16%, var(--card))" },
  under: { color: "var(--status-under)", backgroundColor: "color-mix(in oklch, var(--status-under) 16%, var(--card))" },
  returned: { color: "var(--status-returned)", backgroundColor: "color-mix(in oklch, var(--status-returned) 16%, var(--card))" },
  other: { color: "var(--muted-foreground)", backgroundColor: "var(--muted)" },
} as const

const DOT_COLORS = {
  cleared: "bg-[var(--status-cleared)]",
  under: "bg-[var(--status-under)]",
  returned: "bg-[var(--status-returned)]",
  other: "bg-muted-foreground",
} as const

export function StatusBadge({ status, withDot = true }: { status: string | null | undefined; withDot?: boolean }) {
  const tone = statusTone(status)
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium")}
      style={TONE_STYLES[tone]}
    >
      {withDot && <span className={cn("size-1.5 rounded-full", DOT_COLORS[tone])} />}
      {status || "—"}
    </span>
  )
}

