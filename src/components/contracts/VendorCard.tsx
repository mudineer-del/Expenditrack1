import { fmtMoney } from "@/lib/dashboard"
import { ContractorLogo } from "@/components/shared/ContractorLogo"
import { useIsMobile } from "@/hooks/use-mobile"

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
  // Desktop keeps the original plain look untouched — an earlier round of mobile
  // polish leaked into desktop and had to be reverted, so new visual treatments
  // here are computed conditionally rather than left for CSS breakpoints to
  // partially override, since this card's accent wash is an inline style (can't
  // be gated by a Tailwind md: class the way the hover/tilt utility classes are).
  const isMobile = useIsMobile()

  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-2xl border p-4 text-left shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] active:duration-100 md:rounded-lg md:p-3 md:shadow-none md:hover:translate-y-0 md:active:scale-100"
      style={
        isMobile
          ? {
              borderColor: active ? color : `color-mix(in oklch, ${color} 18%, var(--border))`,
              boxShadow: active ? `0 0 0 2px ${color}` : undefined,
              backgroundImage: `linear-gradient(155deg, color-mix(in oklch, ${color} ${active ? 12 : 6}%, var(--card)) 0%, var(--card) 65%)`,
            }
          : active
            ? { borderColor: color, boxShadow: `0 0 0 2px ${color}` }
            : { borderColor: `color-mix(in oklch, ${color} 16%, var(--border))` }
      }
    >
      <div className="mb-2 flex items-center gap-2.5 md:gap-2">
        <div className="transition-transform duration-300 group-hover:scale-105 group-hover:[transform:rotateY(8deg)] md:transition-none md:group-hover:scale-100 md:group-hover:[transform:none]">
          <ContractorLogo vendor={vendor} logo={logo} color={color} size="md" />
        </div>
        <div className="truncate text-[15px] font-semibold md:text-sm md:font-medium">{vendor}</div>
      </div>
      <div className="text-lg font-bold tabular-nums md:font-semibold">{fmtMoney(total)}</div>
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
