import { cn } from "@/lib/utils"
import { statusTone } from "@/lib/dashboard"

const TONE_CLASSES: Record<string, string> = {
  cleared: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  under: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  returned: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  other: "bg-muted text-muted-foreground",
}

export function StatusBadge({ status }: { status: string | null | undefined }) {
  const tone = statusTone(status)
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", TONE_CLASSES[tone])}>
      {status || "—"}
    </span>
  )
}
