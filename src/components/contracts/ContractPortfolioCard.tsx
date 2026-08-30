import { ArrowUpRight, CalendarDays, FileText, Pencil, Trash2, WalletCards } from "lucide-react"
import { ContractorLogo } from "@/components/shared/ContractorLogo"
import { avgLeadTime, fmtMoney, vendorColor } from "@/lib/dashboard"
import { CONTRACT_TONE_CLASSES, contractExpenditure, contractStatusTone, daysUntil, invoicesForContract, utilizationColor } from "@/lib/contracts"
import { cn } from "@/lib/utils"
import type { Contract } from "@/types/contract"
import type { Invoice } from "@/types/invoice"

export function ContractPortfolioCard({ contract, invoices, logo, index, canEdit, canDelete, onView, onEdit, onDelete }: { contract: Contract; invoices: Invoice[]; logo?: string; index: number; canEdit: boolean; canDelete: boolean; onView: () => void; onEdit: () => void; onDelete: () => void }) {
  const rows = invoicesForContract(invoices, contract.contractNo)
  const spent = contractExpenditure(invoices, contract.contractNo)
  const value = Number(contract.value) || 0
  const pct = value > 0 ? Math.min(100, spent / value * 100) : 0
  const lead = avgLeadTime(rows)
  const remaining = daysUntil(contract.endDate)
  const primaryVendor = (contract.vendor || "").split("/")[0].trim()
  const color = vendorColor(primaryVendor)
  const tone = contractStatusTone(contract.status)
  const dateText = contract.startDate || contract.endDate ? `${contract.startDate || "—"} — ${contract.endDate || "Open"}` : "Period not recorded"

  return <article className="contract-portfolio-card group relative isolate overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_8px_22px_-18px_rgba(15,23,42,.55),0_2px_4px_rgba(15,23,42,.05)] transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_16px_34px_-22px_rgba(37,99,235,.42),0_5px_12px_-9px_rgba(15,23,42,.25)]" style={{ animationDelay: `${Math.min(index, 10) * 35}ms` }}>
    <div className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: color }} />
    <button type="button" className="grid w-full cursor-pointer grid-cols-[minmax(300px,1.7fr)_minmax(155px,.75fr)_minmax(155px,.75fr)_minmax(220px,1fr)_140px] items-center gap-5 p-4 pl-5 text-left" onClick={onView}>
      <div className="flex min-w-0 items-center gap-3.5">
        <div className="shrink-0 transition-transform duration-300 group-hover:scale-105"><ContractorLogo vendor={primaryVendor || contract.vendor} logo={logo} color={color} size="md" /></div>
        <div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate text-sm font-extrabold text-foreground">{contract.vendor || "Unassigned contractor"}</p><span className={cn("shrink-0 rounded-full border border-current/15 px-2 py-0.5 text-[10px] font-bold", CONTRACT_TONE_CLASSES[tone])}>{contract.status || "—"}</span></div><p className="mt-1 truncate text-[13px] font-bold tracking-[.01em] text-primary">{contract.contractNo}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{contract.title || "Contract provision"}</p></div>
      </div>
      <Metric icon={WalletCards} label="Contract value" value={value ? fmtMoney(value) : "Not set"} />
      <Metric icon={FileText} label="Expenditure" value={fmtMoney(spent)} color={color} />
      <div className="min-w-0"><div className="flex items-center justify-between text-[11px]"><span className="font-bold tracking-wider text-muted-foreground uppercase">Utilization</span><b className="tabular-nums text-foreground">{value ? `${pct.toFixed(0)}%` : "—"}</b></div><div className="mt-2 h-2 overflow-hidden rounded-full border border-border/50 bg-muted shadow-inner"><div className="h-full rounded-full transition-[width] duration-700" style={{ width: value ? `${pct}%` : "0%", background: `linear-gradient(90deg, ${color}, ${utilizationColor(pct)})` }} /></div><div className="mt-2 flex gap-3 text-[11px] text-muted-foreground"><span><b className="text-foreground">{rows.length}</b> invoices</span><span><b className="text-foreground">{lead === null ? "—" : `${lead}d`}</b> lead</span></div></div>
      <div className="text-right"><div className="flex items-center justify-end gap-1 text-[11px] font-semibold text-muted-foreground"><CalendarDays className="size-3.5" />{remaining === null ? "No end date" : remaining < 0 ? "Expired" : `${remaining}d left`}</div><p className="mt-1 truncate text-[10px] text-muted-foreground" title={dateText}>{dateText}</p><span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary transition-[gap] group-hover:gap-2">Open <ArrowUpRight className="size-3.5" /></span></div>
    </button>
    <div className="absolute top-1/2 right-3 flex -translate-y-1/2 translate-x-2 flex-col gap-1.5 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:translate-x-0 group-focus-within:opacity-100"><Action icon={Pencil} disabled={!canEdit} title="Edit contract" onClick={onEdit} /><Action icon={Trash2} disabled={!canDelete} title="Delete contract" destructive onClick={onDelete} /></div>
  </article>
}
function Metric({ icon: Icon, label, value, color }: { icon: typeof WalletCards; label: string; value: string; color?: string }) { return <div className="min-w-0 border-l border-border/60 pl-5"><div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-muted-foreground uppercase"><Icon className="size-3.5" />{label}</div><div className="mt-1 truncate text-[15px] font-extrabold tabular-nums" style={{ color }}>{value}</div></div> }
function Action({ icon: Icon, disabled, title, destructive, onClick }: { icon: typeof Pencil; disabled: boolean; title: string; destructive?: boolean; onClick: () => void }) { return <button type="button" className={cn("rounded-lg border bg-background p-2 shadow-md transition hover:scale-105 disabled:opacity-35", destructive ? "text-destructive hover:bg-destructive/5" : "hover:text-primary")} disabled={disabled} title={disabled ? `Only Admins can ${title.toLowerCase()}` : title} onClick={onClick}><Icon className="size-3.5" /></button> }
