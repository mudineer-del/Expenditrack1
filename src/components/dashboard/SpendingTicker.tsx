import { useEffect, useState } from "react"
import { avgLeadTime, fmtMoney, vendorColor } from "@/lib/dashboard"
import { contractExpenditure, invoicesForContract } from "@/lib/contracts"
import { useTickerStore } from "@/store/useTickerStore"
import type { Contract } from "@/types/contract"
import type { Invoice } from "@/types/invoice"

interface TickerItem {
  key: string
  vendor: string
  color: string
  story: string
}

function buildItems(contracts: Contract[], invoices: Invoice[]): TickerItem[] {
  return contracts
    .filter((c) => c.status === "Active")
    .map((c) => {
      const rows = invoicesForContract(invoices, c.contractNo)
      const spent = contractExpenditure(invoices, c.contractNo)
      const cost = Number(c.value) || 0
      const lead = avgLeadTime(rows)
      const primaryVendor = (c.vendor || "").split("/")[0].trim() || "Unknown"

      const parts = [`${fmtMoney(spent)} spent`]
      if (cost > 0) parts.push(`${Math.round(Math.min(100, (spent / cost) * 100))}% utilized`)
      if (lead !== null) parts.push(`${lead}d avg lead`)

      return { key: c.id, vendor: primaryVendor, color: vendorColor(primaryVendor), story: parts.join(" · ") }
    })
}

function Segment({ item }: { item: TickerItem }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-2 px-4 text-sm whitespace-nowrap">
      <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
      <span className="font-medium">{item.vendor}</span>
      <span className="text-muted-foreground">— {item.story}</span>
    </span>
  )
}

function ScrollTicker({ items }: { items: TickerItem[] }) {
  // Duration scales with content so longer contract lists don't race by — see the
  // matching -50% translate in index.css's .ticker-track, which assumes exactly 2 copies.
  const duration = Math.max(20, items.length * 6)
  return (
    <div className="ticker-viewport overflow-hidden rounded-lg border bg-card py-2.5">
      <div className="ticker-track flex w-max" style={{ "--ticker-duration": `${duration}s` } as React.CSSProperties}>
        {[...items, ...items].map((item, i) => (
          <Segment key={`${item.key}-${i}`} item={item} />
        ))}
      </div>
    </div>
  )
}

function CycleTicker({ items }: { items: TickerItem[] }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    setIndex(0)
    const id = setInterval(() => setIndex((i) => (i + 1) % items.length), 4000)
    return () => clearInterval(id)
  }, [items.length])

  const item = items[index % items.length]
  return (
    <div className="flex items-center overflow-hidden rounded-lg border bg-card px-2 py-2.5">
      <span key={item.key} className="animate-in fade-in slide-in-from-bottom-1 duration-300">
        <Segment item={item} />
      </span>
    </div>
  )
}

/** Loops each active contract's spend/utilization/lead-time story across the Dashboard —
 *  "scroll" for a continuous marquee, "cycle" for one contract at a time — the style is
 *  picked in Settings > Labels. */
export function SpendingTicker({ contracts, invoices }: { contracts: Contract[]; invoices: Invoice[] }) {
  const style = useTickerStore((s) => s.style)
  const items = buildItems(contracts, invoices)

  if (!items.length) return null
  return style === "cycle" ? <CycleTicker items={items} /> : <ScrollTicker items={items} />
}
