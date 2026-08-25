import { cn } from "@/lib/utils"
import { statusTone } from "@/lib/dashboard"

const TONE_STYLES = {
  cleared: { color: "var(--status-cleared)", backgroundColor: "color-mix(in oklch, var(--status-cleared) 16%, var(--card))" },
  under: { color: "var(--status-under)", backgroundColor: "color-mix(in oklch, var(--status-under) 16%, var(--card))" },
  returned: { color: "var(--status-returned)", backgroundColor: "color-mix(in oklch, var(--status-returned) 16%, var(--card))" },
  other: { color: "var(--muted-foreground)", backgroundColor: "var(--muted)" },
} as const

export function StatusBadge({ status }: { status: string | null | undefined }) {
  const tone = statusTone(status)
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium")}
      style={TONE_STYLES[tone]}
    >
      {status || "—"}
    </span>
  )
}

