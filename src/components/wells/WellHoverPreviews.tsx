import { PreviewRow, PreviewSection, PreviewTitle } from "@/components/shared/HoverPreview"
import { fmtDateTime } from "@/lib/formatDate"
import {
  ZERO_TOTALS,
  availableAmount,
  budgetStatus,
  buildCostCentreTotals,
  fmtCurrency,
  rollup,
  wellStatusTone,
  WELL_STATUS_TONE_CLASSES,
  type CostCentreTotals,
  type CostRollup,
} from "@/lib/wellCost"
import { utilizationColor } from "@/lib/contracts"
import { cn } from "@/lib/utils"
import type { Well } from "@/types/well"
import type { WellCostCentre, WellCostTransaction } from "@/types/wellCost"

function fmtDate(d: string | undefined | null): string {
  if (!d) return ""
  const parsed = new Date(d)
  if (isNaN(parsed.getTime())) return d
  return parsed.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })
}

function UtilizationBar({ pct }: { pct: number }) {
  return (
    <div className="mt-2">
      <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
        <span>Utilization</span>
        <span className="font-medium tabular-nums text-foreground">{pct.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: utilizationColor(pct) }} />
      </div>
    </div>
  )
}

/** Primary data of one well plus its cost roll-up and the most recent ledger activity. */
export function WellPreview({
  well,
  cost,
  costCentres,
  transactions,
  currency,
}: {
  well: Well
  cost: CostRollup
  costCentres: WellCostCentre[]
  transactions: WellCostTransaction[]
  currency: string
}) {
  const centreIds = new Set(costCentres.filter((c) => c.wellId === well.id).map((c) => c.id))
  const entries = transactions.filter((t) => centreIds.has(t.costCentreId))
  const latest = entries.slice().sort((a, b) => b.entryDate.localeCompare(a.entryDate))[0]
  const tone = wellStatusTone(well.status)
  return (
    <>
      <PreviewTitle
        title={well.name}
        subtitle={well.code || undefined}
        badge={
          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium", WELL_STATUS_TONE_CLASSES[tone])}>
            {well.status || "—"}
          </span>
        }
      />
      <PreviewSection>
        <PreviewRow label="Field" value={well.field} />
        <PreviewRow label="Operator" value={well.operator} />
        <PreviewRow label="Start date" value={fmtDate(well.startDate)} />
        <PreviewRow label="Cost centres" value={String(centreIds.size)} />
        <PreviewRow label="Ledger entries" value={String(entries.length)} />
        <PreviewRow label="Added" value={fmtDateTime(well.createdAt)} />
      </PreviewSection>
      <PreviewSection label="Cost">
        <PreviewRow label="Budget" value={fmtCurrency(cost.budget, currency)} />
        <PreviewRow label="Actual" value={fmtCurrency(cost.actual, currency)} />
        <PreviewRow label="Commitments" value={fmtCurrency(cost.commitments, currency)} />
        <PreviewRow label="Available" value={<span className={cost.available < 0 ? "text-destructive" : undefined}>{fmtCurrency(cost.available, currency)}</span>} />
        <PreviewRow label="Status" value={budgetStatus(cost.budget, cost.actual + cost.commitments)} />
      </PreviewSection>
      {cost.budget > 0 && <UtilizationBar pct={cost.utilizationPct} />}
      {well.description && <p className="mt-2 line-clamp-3 border-t pt-2 text-xs text-muted-foreground">{well.description}</p>}
      {latest && (
        <p className="mt-2 text-[10px] text-muted-foreground">
          Last entry {fmtDate(latest.entryDate)} · {latest.kind} · {fmtCurrency(latest.amount, currency)}
        </p>
      )}
    </>
  )
}

/** WellPreview for pages that only have the raw lists: works out this well's own currency and
 *  cost roll-up itself (only when the card actually opens), so a wells list needn't
 *  pre-compute a roll-up for every row. */
export function WellPreviewFromLists({
  well,
  costCentres,
  transactions,
}: {
  well: Well
  costCentres: WellCostCentre[]
  transactions: WellCostTransaction[]
}) {
  const own = costCentres.filter((c) => c.wellId === well.id)
  const currency = own[0]?.currency || "USD"
  const inCurrency = own.filter((c) => (c.currency || "USD") === currency)
  const cost = rollup(inCurrency, buildCostCentreTotals(transactions))
  return <WellPreview well={well} cost={cost} costCentres={inCurrency} transactions={transactions} currency={currency} />
}

/** One cost / fund centre: its budget vs. ledger totals and the latest uploaded entries. */
export function CostCentrePreview({
  item,
  totals,
  transactions,
}: {
  item: WellCostCentre
  totals: CostCentreTotals | undefined
  transactions: WellCostTransaction[]
}) {
  const t = totals ?? ZERO_TOTALS
  const budget = Number(item.plannedBudget) || 0
  const available = availableAmount(budget, t)
  const pct = budget > 0 ? ((t.actual + t.commitment) / budget) * 100 : 0
  const entries = transactions
    .filter((e) => e.costCentreId === item.id)
    .sort((a, b) => b.entryDate.localeCompare(a.entryDate))
  return (
    <>
      <PreviewTitle title={item.costCentre || "Cost centre"} subtitle={item.fundCentre ? `Fund centre ${item.fundCentre}` : undefined} />
      {item.description && <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">{item.description}</p>}
      <PreviewSection>
        <PreviewRow label="Vendor" value={item.vendor} />
        <PreviewRow label="Budget" value={fmtCurrency(budget, item.currency)} />
        <PreviewRow label="Actual" value={fmtCurrency(t.actual, item.currency)} />
        <PreviewRow label="Commitments" value={fmtCurrency(t.commitment, item.currency)} />
        <PreviewRow label="Available" value={<span className={available < 0 ? "text-destructive" : undefined}>{fmtCurrency(available, item.currency)}</span>} />
        <PreviewRow label="Entries logged" value={String(entries.length)} />
        <PreviewRow label="Created" value={fmtDateTime(item.createdAt)} />
      </PreviewSection>
      {budget > 0 && <UtilizationBar pct={pct} />}
      {entries.length > 0 && (
        <div className="mt-2 border-t pt-2">
          <div className="mb-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">Latest entries</div>
          <ul className="grid gap-1.5">
            {entries.slice(0, 3).map((e) => (
              <li key={e.id} className="text-xs">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">
                    {fmtDate(e.entryDate)} · {e.kind === "commitment" ? "Commitment" : "Actual"}
                    {e.createdAt ? ` · uploaded ${fmtDate(e.createdAt)}` : ""}
                  </span>
                  <span className="font-medium tabular-nums">{fmtCurrency(e.amount, item.currency)}</span>
                </div>
                {e.remarks && <div className="line-clamp-2 text-[11px] text-muted-foreground">{e.remarks}</div>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {item.notes && <p className="mt-2 line-clamp-2 text-[11px] text-muted-foreground">Notes: {item.notes}</p>}
    </>
  )
}

/** One dated ledger entry, with the full remarks/notes the table row has to truncate. */
export function TransactionPreview({ entry, currency }: { entry: WellCostTransaction; currency: string }) {
  return (
    <>
      <PreviewTitle
        title={fmtDate(entry.entryDate) || "Undated entry"}
        subtitle={entry.createdByName ? `Logged by ${entry.createdByName}` : undefined}
        badge={
          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium", entry.kind === "actual" ? "status-tone-cleared" : "status-tone-under")}>
            {entry.kind === "actual" ? "Actual" : "Commitment"}
          </span>
        }
      />
      <PreviewSection>
        <PreviewRow label="Amount" value={fmtCurrency(entry.amount, currency, 2)} />
        <PreviewRow label="Cost for" value={fmtDate(entry.entryDate)} />
        <PreviewRow label="Uploaded" value={fmtDateTime(entry.createdAt)} />
        <PreviewRow label="Uploaded by" value={entry.createdByName} />
      </PreviewSection>
      {entry.remarks && (
        <div className="mt-2 border-t pt-2">
          <div className="mb-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">Remarks</div>
          <p className="max-h-40 overflow-y-auto text-xs whitespace-pre-line text-muted-foreground">{entry.remarks}</p>
        </div>
      )}
      {entry.notes && (
        <div className="mt-2 border-t pt-2">
          <div className="mb-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">Notes</div>
          <p className="max-h-24 overflow-y-auto text-xs whitespace-pre-line text-muted-foreground">{entry.notes}</p>
        </div>
      )}
      {!entry.remarks && !entry.notes && <p className="mt-2 text-xs text-muted-foreground">No remarks or notes recorded.</p>}
    </>
  )
}
