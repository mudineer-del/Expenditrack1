import { ChevronDown, FileClock } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ContractDetailSheet } from "@/components/contracts/ContractDetailSheet"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { useAuth } from "@/hooks/useAuth"
import { useContractsQuery } from "@/hooks/useContracts"
import { useInvoicesQuery } from "@/hooks/useInvoices"
import { avgLeadTime, fmtMoney, statusTone, vendorColor } from "@/lib/dashboard"
import { CONTRACT_TONE_CLASSES, contractStatusTone, daysUntil, invoicesForContract, utilizationColor } from "@/lib/contracts"
import { cn } from "@/lib/utils"
import { ContractorLogo } from "@/components/shared/ContractorLogo"
import { getContractorLogo, useContractorLogosQuery } from "@/lib/contractorLogos"
import { useProminentContractsStore } from "@/store/useProminentContractsStore"
import type { Contract } from "@/types/contract"
import type { Invoice } from "@/types/invoice"

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

function ContractPill({ contract, invoices, logo, onOpen }: { contract: Contract; invoices: Invoice[]; logo?: string; onOpen: () => void }) {
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
  const barColor = utilizationColor(pct)

  return (
    <HoverCard openDelay={150} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          onClick={onOpen}
          className="app-contract-row flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-all duration-200 ease-out"
          style={{ borderColor: `color-mix(in oklch, ${color} 45%, transparent)` }}
        >
          <ContractorLogo vendor={primaryVendor || contract.vendor} logo={logo} color={color} size="sm" />
          <span className="app-contract-label truncate text-xs font-medium">
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
          <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium", CONTRACT_TONE_CLASSES[tone])}>
            {contract.status || "—"}
          </span>
          {days !== null && (
            <span className={cn("text-xs font-medium", days < 0 ? "text-destructive" : days <= 30 ? "text-status-under" : "text-muted-foreground")}>
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
  const contractorLogosQuery = useContractorLogosQuery()
  const contracts = contractsQuery.data ?? []
  const invoices = invoicesQuery.data ?? []
  const { ids: prominentIds } = useProminentContractsStore()
  const [viewingContract, setViewingContract] = useState<Contract | null>(null)
  const [expanded, setExpanded] = useState(false)
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
    <div className="app-contracts-section mx-3 py-3 group-data-[collapsible=icon]:hidden">
      <div>
        <button
          type="button"
          className="app-contracts-heading mb-2 flex w-full items-center gap-1.5 rounded-md py-1 text-[11px] font-semibold uppercase tracking-[0.08em]"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
        >
          <FileClock className="size-3.5" />
          <span>Active Contracts</span>
          <span className="app-contract-count ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-bold">
            {active.length}
          </span>
          <ChevronDown className={cn("size-3.5 transition-transform", expanded && "rotate-180")} />
        </button>
        {/* Capped so a long pinned list scrolls internally instead of growing past the sidebar and pushing the footer off-screen. */}
        <div className="grid max-h-44 gap-1 overflow-y-auto pr-0.5">
          {(expanded ? upcoming : upcoming.slice(0, 1)).map((contract) => (
            <ContractPill
              key={contract.id}
              contract={contract}
              invoices={invoices}
              logo={getContractorLogo(contractorLogosQuery.data ?? {}, contract.vendor.split("/")[0].trim())}
              onOpen={() => setViewingContract(contract)}
            />
          ))}
          {!upcoming.length && <p className="px-1.5 text-xs text-muted-foreground">No active contracts on file.</p>}
        </div>
        {expanded && (
          <button type="button" onClick={() => navigate("/vendors")} className="app-contracts-view-all mt-2 w-full rounded-md py-1.5 text-[11px] font-semibold">
            View All Contracts →
          </button>
        )}
      </div>

      <ContractDetailSheet
        open={!!viewingContract}
        contract={viewingContract}
        invoices={invoices}
        canEdit={can("edit", "contract")}
        logo={getContractorLogo(contractorLogosQuery.data ?? {}, viewingContract?.vendor.split("/")[0].trim() || "")}
        onOpenChange={(v) => !v && setViewingContract(null)}
        onEdit={() => {
          setViewingContract(null)
          navigate("/vendors")
        }}
      />
    </div>
  )
}

