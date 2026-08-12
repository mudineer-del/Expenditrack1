import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function KpiTile({
  icon,
  iconClassName,
  label,
  value,
  valueClassName,
  sub,
  subClassName,
  onClick,
}: {
  icon: ReactNode
  iconClassName?: string
  label: string
  value: ReactNode
  valueClassName?: string
  sub?: ReactNode
  subClassName?: string
  onClick?: () => void
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-lg border bg-card p-[var(--tile-pad)]",
        onClick && "cursor-pointer transition-colors hover:bg-muted/50"
      )}
      onClick={onClick}
    >
      <div
        className={cn(
          "mb-1 flex size-[var(--tile-icon)] items-center justify-center rounded-md [&_svg]:size-[var(--tile-icon-svg)]",
          iconClassName ?? "bg-primary/10 text-primary"
        )}
      >
        {icon}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("text-[length:var(--tile-value)] font-semibold tabular-nums", valueClassName)}>{value}</div>
      {sub && <div className={cn("text-xs text-muted-foreground", subClassName)}>{sub}</div>}
    </div>
  )
}
