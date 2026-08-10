import { fmtMoney } from "@/lib/dashboard"

/** Ported from the vendor-card markup inside renderVendors (index.html:4153-4172). */
export function VendorCard({
  vendor,
  color,
  total,
  sharePct,
  count,
  leadDays,
  active,
  onClick,
}: {
  vendor: string
  color: string
  total: number
  sharePct: number
  count: number
  leadDays: number | null
  active: boolean
  onClick: () => void
}) {
  const initials = vendor.slice(0, 2).toUpperCase()
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
      style={active ? { borderColor: color, boxShadow: `0 0 0 2px ${color}` } : undefined}
    >
      <div className="mb-2 flex items-center gap-2">
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: color }}
        >
          {initials}
        </span>
        <div className="truncate font-medium">{vendor}</div>
      </div>
      <div className="text-lg font-semibold">{fmtMoney(total)}</div>
      <div className="my-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(100, sharePct).toFixed(1)}%`, backgroundColor: color }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{count} invoices</span>
        <span>{sharePct.toFixed(1)}% of spend</span>
        <span>{leadDays !== null ? `${leadDays}d lead` : "—"}</span>
      </div>
    </button>
  )
}
