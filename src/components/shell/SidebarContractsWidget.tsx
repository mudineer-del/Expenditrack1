import { FileClock } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ContractDetailSheet } from "@/components/contracts/ContractDetailSheet"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { useAuth } from "@/hooks/useAuth"
import { useContractsQuery } from "@/hooks/useContracts"
import { useInvoicesQuery } from "@/hooks/useInvoices"
import { avgLeadTime, fmtMoney, statusTone, vendorColor } from "@/lib/dashboard"
import { contractStatusTone, invoicesForContract } from "@/lib/contracts"
import { cn } from "@/lib/utils"
import { useProminentContractsStore } from "@/store/useProminentContractsStore"
import type { Contract } from "@/types/contract"
import type { Invoice } from "@/types/invoice"

const TONE_CLASSES: Record<string, string> = {
  cleared: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  under: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  returned: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  other: "bg-muted text-muted-foreground",
}

function daysUntil(dateStr: string): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return Math.round((d.getTime() - Date.now()) / 86400000)
}

/** Contract numbers are long dash/slash-delimited paths (e.g. "OGDCL-SCM-Services-CB-4600000369-2024")
 *  that overflow the narrow sidebar pill. Cut at the last "-" or "/" within the budget so the
 *  pill ends cleanly on a whole segment instead of mid-word; the full number is still shown
 *  in the hover card. */
function contractShortLabel(contractNo: string, maxLen = 22): string {
  if (contractNo.length <= maxLen) return contractNo
  const window = contractNo.slice(0, maxLen)
  const cut = Math.max(window.lastIndexOf("-"), window.lastIndexOf("/"))
  return contractNo.slice(0, cut > 4 ? cut : maxLen) + "…"
}

function ContractPill({ contract, invoices, onOpen }: { contract: Contract; invoices: Invoice[]; onOpen: () => void }) {
  const primaryVendor = (contract.vendor || "").split("/")[0].trim()
  const color = vendorColor(primaryVendor)
  const days = daysUntil(contract.endDate)
  const tone = contractStatusTone(contract.status)
  const cost = Number(contract.value) || 0
  const rows = invoicesForContract(invoices, contract.contractNo)
  const spent = rows.reduce((s, r) => s + (Number(r.amountInclTax) || 0), 0)
  const cleared = rows.filter((r) => statusTone(r.status) === "cleared").length
  const pending = rows.length - cleared
  const lead = avgLeadTime(rows)
  const pct = cost > 0 ? Math.min(100, (spent / cost) * 100) : 0
  const barColor = pct >= 90 ? "#c23b3b" : pct >= 70 ? "#c8781c" : "#1c8a4b"

  return (
    <HoverCard openDelay={150} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          onClick={onOpen}
          className="flex w-full items-center gap-2 rounded-full border bg-sidebar px-2.5 py-1.5 text-left transition-all duration-200 ease-out hover:translate-x-0.5 hover:shadow-md"
          style={{ borderColor: `color-mix(in oklch, ${color} 45%, transparent)` }}
        >
          <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          <span className="truncate text-xs font-medium text-sidebar-foreground">
            {contractShortLabel(contract.contractNo)}
          </span>
        </button>
      </HoverCardTrigger>

      {/* Portaled to <body>, so it always escapes the sidebar's scroll/overflow clipping regardless of list length. */}
      <HoverCardContent side="right" align="center" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center gap-2">
          <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          <span className="truncate text-sm font-semibold">{contract.contractNo}</span>
        </div>
        {contract.title && <div className="mb-1.5 line-clamp-2 text-xs text-sidebar-foreground/80">{contract.title}</div>}
        <div className="mb-2 truncate text-xs text-muted-foreground">{contract.vendor || "—"}</div>

        <div className="mb-2 flex items-center justify-between">
          <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium", TONE_CLASSES[tone])}>
            {contract.status || "—"}
          </span>
          {days !== null && (
            <span className={cn("text-xs font-medium", days < 0 ? "text-destructive" : days <= 30 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
              {days < 0 ? "Expired" : days === 0 ? "Today" : `${days}d left`}
            </span>
          )}
        </div>

        <div className="mb-2 grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
          <span className="text-muted-foreground">Invoices</span>
          <span className="text-right font-medium tabular-nums">{rows.length}</span>
          <span className="text-muted-foreground">Expenditure</span>
          <span className="text-right font-medium tabular-nums">{fmtMoney(spent)}</span>
          <span className="text-muted-foreground">Cleared / Pending</span>
          <span className="text-right font-medium tabular-nums">
            {cleared} / {pending}
          </span>
          <span className="text-muted-foreground">Avg. lead time</span>
          <span className="text-right font-medium tabular-nums">{lead !== null ? `${lead}d` : "—"}</span>
          {cost > 0 && (
            <>
              <span className="text-muted-foreground">Contract cost</span>
              <span className="text-right font-medium tabular-nums">{fmtMoney(cost)}</span>
              <span className="text-muted-foreground">Remaining</span>
              <span className={cn("text-right font-medium tabular-nums", cost - spent < 0 && "text-destructive")}>
                {fmtMoney(cost - spent)}
              </span>
            </>
          )}
        </div>

        {cost > 0 && (
          <div className="mb-1 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct.toFixed(1)}%`, backgroundColor: barColor }} />
          </div>
        )}

        <button
          type="button"
          onClick={onOpen}
          className="mt-2 w-full rounded-md bg-primary/10 py-1 text-xs font-medium text-primary hover:bg-primary/20"
        >
          Click for full summary →
        </button>
      </HoverCardContent>
    </HoverCard>
  )
}

/** Fills the otherwise-empty space at the bottom of the sidebar with a live, interactive glance at active contracts. */
export function SidebarContractsWidget() {
  const { can } = useAuth()
  const navigate = useNavigate()
  const contractsQuery = useContractsQuery()
  const invoicesQuery = useInvoicesQuery()
  const contracts = contractsQuery.data ?? []
  const invoices = invoicesQuery.data ?? []
  const { ids: prominentIds } = useProminentContractsStore()
  const [viewingContract, setViewingContract] = useState<Contract | null>(null)
  // "Active" matches the Dashboard's Active Contracts KPI (lib/dashboard.ts) — status-based, not end-date-based, since end dates aren't always on file.
  const active = contracts.filter((c) => c.status === "Active")

  if (!contracts.length) return null

  // Contracts pinned in Settings > Labels always show, regardless of status, in the order pinned.
  const pinned = prominentIds
    .map((id) => contracts.find((c) => c.id === id))
    .filter((c): c is Contract => !!c)

  const withDays = active
    .map((c) => ({ contract: c, days: daysUntil(c.endDate) }))
    .filter((x): x is { contract: Contract; days: number } => x.days !== null)
    .sort((a, b) => a.days - b.days)

  // Prefer contracts with a real end date (soonest-expiring first); fall back to
  // just listing active contracts by name when no end dates are on file at all.
  const autoRanked = (withDays.length ? withDays.map((x) => x.contract) : active).filter(
    (c) => !prominentIds.includes(c.id)
  )
  const upcoming = [...pinned, ...autoRanked.slice(0, Math.max(0, 3 - pinned.length))]

  return (
    <div className="px-2 py-2 group-data-[collapsible=icon]:hidden">
      <div className="rounded-lg border bg-sidebar-accent/40 p-2.5">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-sidebar-foreground">
          <FileClock className="size-3.5" />
          Active Contracts
          <span className="ml-auto rounded-full bg-sidebar-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-sidebar-primary">
            {active.length}
          </span>
        </div>
        {/* Capped so a long pinned list scrolls internally instead of growing past the sidebar and pushing the footer off-screen. */}
        <div className="grid max-h-56 gap-1.5 overflow-y-auto pr-0.5">
          {upcoming.map((contract) => (
            <ContractPill key={contract.id} contract={contract} invoices={invoices} onOpen={() => setViewingContract(contract)} />
          ))}
          {!upcoming.length && <p className="px-1.5 text-xs text-muted-foreground">No active contracts on file.</p>}
        </div>
      </div>

      <ContractDetailSheet
        open={!!viewingContract}
        contract={viewingContract}
        invoices={invoices}
        canEdit={can("edit")}
        onOpenChange={(v) => !v && setViewingContract(null)}
        onEdit={() => {
          setViewingContract(null)
          navigate("/vendors")
        }}
      />
    </div>
  )
}
