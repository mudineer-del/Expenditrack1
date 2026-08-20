import { fmtMoney } from "@/lib/dashboard"
import { ContractorLogo } from "@/components/shared/ContractorLogo"

/** Ported from the vendor-card markup inside renderVendors (index.html:4153-4172). */
export function VendorCard({
  vendor,
  color,
  logo,
  total,
  sharePct,
  count,
  leadDays,
  active,
  onClick,
}: {
  vendor: string
  color: string
  logo?: string
  total: number
  sharePct: number
  count: number
  leadDays: number | null
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border p-4 text-left shadow-sm transition-colors hover:bg-muted/50 active:scale-[0.99] md:rounded-lg md:p-3 md:shadow-none md:active:scale-100"
      style={active ? { borderColor: color, boxShadow: `0 0 0 2px ${color}` } : undefined}
    >
      <div className="mb-2 flex items-center gap-2.5 md:gap-2">
        <ContractorLogo vendor={vendor} logo={logo} color={color} size="md" />
        <div className="truncate text-[15px] font-semibold md:text-sm md:font-medium">{vendor}</div>
      </div>
      <div className="text-xl font-bold tabular-nums md:text-lg md:font-semibold">{fmtMoney(total)}</div>
      <div className="my-2.5 h-1.5 w-full overflow-hidden rounded-full bg-muted md:my-2">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(100, sharePct).toFixed(1)}%`, backgroundColor: color }}
        />
      </div>
      <div className="flex justify-between text-[13px] text-muted-foreground md:text-xs">
        <span>{count} invoices</span>
        <span>{sharePct.toFixed(1)}% of spend</span>
        <span>{leadDays !== null ? `${leadDays}d lead` : "—"}</span>
      </div>
    </button>
  )
}
