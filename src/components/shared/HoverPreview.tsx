import type { ReactElement, ReactNode } from "react"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { CONTRACT_TONE_CLASSES, contractExpenditure, contractStatusTone, daysUntil, invoicesForContract, utilizationColor } from "@/lib/contracts"
import { avgLeadTime, fmtMoney } from "@/lib/dashboard"
import { fmtDateTime } from "@/lib/formatDate"
import { turnaroundDays } from "@/lib/reports"
import { cn } from "@/lib/utils"
import type { Contract } from "@/types/contract"
import type { Invoice } from "@/types/invoice"

/** Hover a record (table row, card, pill) to read its primary data without opening it.
 *  `children` must be a single element that accepts props/ref (a native element, TableRow,
 *  ...) — it becomes the hover trigger itself, so layout isn't changed. Pass no `preview`
 *  to render the children untouched. The preview content only mounts while the card is
 *  open, so per-row preview components cost nothing until someone actually hovers. */
export function HoverPreview({
  preview,
  children,
  side = "bottom",
  align = "start",
  className,
}: {
  preview?: ReactNode
  children: ReactElement
  side?: "top" | "right" | "bottom" | "left"
  align?: "start" | "center" | "end"
  className?: string
}) {
  if (!preview) return children
  return (
    <HoverCard openDelay={400} closeDelay={80}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        side={side}
        align={align}
        collisionPadding={12}
        className={cn("w-80 max-w-[90vw] text-sm", className)}
        onClick={(e) => e.stopPropagation()}
      >
        {preview}
      </HoverCardContent>
    </HoverCard>
  )
}

export function PreviewTitle({ title, subtitle, badge }: { title: ReactNode; subtitle?: ReactNode; badge?: ReactNode }) {
  return (
    <div className="mb-2 flex items-start justify-between gap-2 border-b pb-2">
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold">{title}</div>
        {subtitle && <div className="truncate text-xs text-muted-foreground">{subtitle}</div>}
      </div>
      {badge}
    </div>
  )
}

export function PreviewSection({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="mt-2 first:mt-0">
      {label && <div className="mb-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</div>}
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">{children}</dl>
    </div>
  )
}

/** Skipped entirely when the value is empty, so a preview only ever lists data that exists. */
export function PreviewRow({ label, value }: { label: string; value: ReactNode }) {
  if (value === "" || value === null || value === undefined || value === false) return null
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-right font-medium tabular-nums" title={typeof value === "string" ? value : undefined}>
        {value}
      </dd>
    </>
  )
}

function fmtDate(d: string | undefined | null): string {
  if (!d) return ""
  const parsed = new Date(d)
  if (isNaN(parsed.getTime())) return d
  return parsed.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })
}


/** Primary data of one invoice — the fields as entered or imported from the source file. */
export function InvoicePreview({ invoice: r }: { invoice: Invoice }) {
  const outstanding = (Number(r.amountInclTax) || 0) - (Number(r.amountPaid) || 0)
  const ta = turnaroundDays(r)
  const where = [r.wellName, r.location, r.rig].filter(Boolean).join(" · ")
  return (
    <>
      <PreviewTitle
        title={r.invoiceNo || `Sr# ${r.srNo}`}
        subtitle={r.vendor || "Unknown vendor"}
        badge={<StatusBadge status={r.status} />}
      />
      <PreviewSection>
        <PreviewRow label="Sr. No." value={r.srNo === "" ? "" : String(r.srNo)} />
        <PreviewRow label="Contract" value={r.contractNo} />
        <PreviewRow label="Department" value={r.department} />
        <PreviewRow label="Service" value={[r.service, r.type].filter(Boolean).join(" · ")} />
        <PreviewRow label="Well / site" value={where} />
        <PreviewRow label="Region" value={r.region} />
      </PreviewSection>
      <PreviewSection label="Amounts">
        <PreviewRow label="Excl. tax" value={fmtMoney(r.amountExclTax)} />
        <PreviewRow label="Tax" value={Number(r.tax) ? fmtMoney(r.tax) : ""} />
        <PreviewRow label="Incl. tax" value={fmtMoney(r.amountInclTax)} />
        <PreviewRow label="Paid" value={fmtMoney(r.amountPaid)} />
        <PreviewRow label="Outstanding" value={<span className={outstanding > 0.005 ? "text-status-under" : "text-status-cleared"}>{fmtMoney(outstanding)}</span>} />
      </PreviewSection>
      <PreviewSection label="Dates">
        <PreviewRow label="Invoice" value={fmtDate(r.invoiceDate)} />
        <PreviewRow label="Received" value={fmtDate(r.receivingDate)} />
        <PreviewRow label="Cleared" value={fmtDate(r.clearanceDate)} />
        <PreviewRow label="Turnaround" value={ta !== null ? `${ta} days` : ""} />
      </PreviewSection>
      {r.description && <p className="mt-2 line-clamp-3 border-t pt-2 text-xs text-muted-foreground">{r.description}</p>}
      <PreviewSection label="Record">
        <PreviewRow label="Uploaded" value={fmtDateTime(r.createdAt)} />
        <PreviewRow label="Uploaded by" value={r.createdByName} />
        {/* On a never-edited row the trigger stamps updated_at at insert time, so it would
            just repeat the upload time — only show it when it's a genuinely later edit. */}
        {r.updatedAt && (!r.createdAt || new Date(r.updatedAt).getTime() - new Date(r.createdAt).getTime() > 60_000) && (
          <PreviewRow
            label={r.createdAt ? "Last edited" : "Last saved"}
            value={`${fmtDateTime(r.updatedAt)}${r.updatedByName && r.updatedByName !== r.createdByName ? ` · ${r.updatedByName}` : ""}`}
          />
        )}
      </PreviewSection>
    </>
  )
}

/** Live roll-up of one contractor — computed from its invoices/contracts, not a stored record. */
export function VendorPreview({ vendor, invoices, contracts }: { vendor: string; invoices: Invoice[]; contracts: Contract[] }) {
  const rows = invoices.filter((r) => r.vendor === vendor)
  const vendorContracts = contracts.filter((c) => (c.vendor || "").split("/").some((v) => v.trim() === vendor))
  const total = rows.reduce((s, r) => s + (Number(r.amountInclTax) || 0), 0)
  const paid = rows.reduce((s, r) => s + (Number(r.amountPaid) || 0), 0)
  const cleared = rows.filter((r) => (r.status || "").toLowerCase().includes("cleared")).length
  const lead = avgLeadTime(rows)
  const byService = new Map<string, number>()
  for (const r of rows) {
    const k = r.service || "Unspecified"
    byService.set(k, (byService.get(k) ?? 0) + (Number(r.amountInclTax) || 0))
  }
  const topServices = Array.from(byService.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3)
  const latest = rows.slice().sort((a, b) => (b.invoiceDate || "").localeCompare(a.invoiceDate || ""))[0]
  const active = vendorContracts.filter((c) => contractStatusTone(c.status) === "cleared").length
  return (
    <>
      <PreviewTitle title={vendor} subtitle={`${rows.length} invoice${rows.length !== 1 ? "s" : ""} · ${vendorContracts.length} contract${vendorContracts.length !== 1 ? "s" : ""}`} />
      <PreviewSection>
        <PreviewRow label="Invoiced" value={fmtMoney(total)} />
        <PreviewRow label="Paid" value={fmtMoney(paid)} />
        <PreviewRow label="Outstanding" value={fmtMoney(total - paid)} />
        <PreviewRow label="Cleared" value={rows.length ? `${cleared} of ${rows.length}` : ""} />
        <PreviewRow label="Avg lead time" value={lead !== null ? `${lead} days` : ""} />
        <PreviewRow label="Active contracts" value={vendorContracts.length ? String(active) : ""} />
        <PreviewRow label="Last uploaded" value={fmtDateTime(rows.map((r) => r.createdAt || "").filter(Boolean).sort().at(-1))} />
      </PreviewSection>
      {topServices.length > 0 && (
        <PreviewSection label="Top services">
          {topServices.map(([name, value]) => (
            <PreviewRow key={name} label={name} value={fmtMoney(value)} />
          ))}
        </PreviewSection>
      )}
      {latest && (
        <p className="mt-2 border-t pt-2 text-[11px] text-muted-foreground">
          Latest: {latest.invoiceNo || `Sr# ${latest.srNo}`} · {fmtDate(latest.invoiceDate) || "undated"} · {fmtMoney(latest.amountInclTax)}
        </p>
      )}
    </>
  )
}

/** Primary data of one contract plus how much of it the invoices have used so far. */
export function ContractPreview({ contract, invoices }: { contract: Contract; invoices: Invoice[] }) {
  const rows = invoicesForContract(invoices, contract.contractNo)
  const spent = contractExpenditure(invoices, contract.contractNo)
  const value = Number(contract.value) || 0
  const pct = value > 0 ? Math.min(100, (spent / value) * 100) : 0
  const remaining = daysUntil(contract.endDate)
  const tone = contractStatusTone(contract.status)
  return (
    <>
      <PreviewTitle
        title={contract.contractNo}
        subtitle={contract.vendor || "Unassigned contractor"}
        badge={
          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium", CONTRACT_TONE_CLASSES[tone])}>
            {contract.status || "—"}
          </span>
        }
      />
      {contract.title && <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">{contract.title}</p>}
      <PreviewSection>
        <PreviewRow label="Department" value={contract.department} />
        <PreviewRow label="Start" value={fmtDate(contract.startDate)} />
        <PreviewRow label="End" value={fmtDate(contract.endDate)} />
        <PreviewRow label="Time left" value={remaining === null ? "" : remaining < 0 ? `Expired ${Math.abs(remaining)}d ago` : `${remaining} days`} />
        <PreviewRow label="Contract value" value={value ? fmtMoney(value) : "Not set"} />
        <PreviewRow label="Spent" value={fmtMoney(spent)} />
        <PreviewRow label="Invoices" value={String(rows.length)} />
        <PreviewRow label="Uploaded" value={fmtDateTime(contract.createdAt)} />
      </PreviewSection>
      {value > 0 && (
        <div className="mt-2">
          <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
            <span>Utilization</span>
            <span className="font-medium tabular-nums text-foreground">{pct.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: utilizationColor(pct) }} />
          </div>
        </div>
      )}
    </>
  )
}
