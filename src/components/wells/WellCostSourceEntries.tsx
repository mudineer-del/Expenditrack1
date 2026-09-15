import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { fmtCurrency } from "@/lib/wellCost"
import type { WellCostCentre, WellCostTransaction } from "@/types/wellCost"

export function WellCostSourceEntries({ transactions, centres, currency }: {
  transactions: WellCostTransaction[]; centres: WellCostCentre[]; currency: string
}) {
  const navigate = useNavigate()
  const [month, setMonth] = useState("")
  const [page, setPage] = useState(0)
  const rows = useMemo(() => transactions.filter((t) => !month || t.entryDate.startsWith(month))
    .slice().sort((a, b) => b.entryDate.localeCompare(a.entryDate)), [transactions, month])
  const months = Array.from(new Set(transactions.map((t) => t.entryDate.slice(0, 7)))).sort().reverse()
  const lastPage = Math.max(0, Math.ceil(rows.length / 50) - 1)
  const currentPage = Math.min(page, lastPage)
  return (
    <Dialog>
      <DialogTrigger asChild><Button variant="outline" className="justify-self-start">View source cost entries</Button></DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader><DialogTitle>Source cost entries</DialogTitle>
          <DialogDescription>Actual costs and commitments behind this overview, in {currency}. Open a cost centre to review or edit its daily log.</DialogDescription>
        </DialogHeader>
        <label className="flex items-center gap-2 text-sm">Month
          <select aria-label="Source entry month" className="min-h-10 rounded-md border bg-background px-3" value={month} onChange={(e) => { setMonth(e.target.value); setPage(0) }}>
            <option value="">All dates</option>{months.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Cost centre</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
          <TableBody>{rows.slice(currentPage * 50, (currentPage + 1) * 50).map((t) => <TableRow key={t.id}>
            <TableCell>{t.entryDate}</TableCell>
            <TableCell><Button variant="link" className="h-auto whitespace-normal px-0 text-left" onClick={() => navigate(`/well-cost/log/${t.costCentreId}`)}>{centres.find((c) => c.id === t.costCentreId)?.costCentre || "Open daily log"}</Button></TableCell>
            <TableCell>{t.kind === "commitment" ? "Commitment" : "Actual"}</TableCell><TableCell className="text-right tabular-nums">{fmtCurrency(t.amount, currency, 2)}</TableCell>
          </TableRow>)}{!rows.length && <TableRow><TableCell colSpan={4} className="h-20 text-center text-muted-foreground">No entries for this period.</TableCell></TableRow>}</TableBody>
        </Table>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span>{rows.length} entries · Page {currentPage + 1} of {lastPage + 1}</span>
          <div className="flex gap-2"><Button variant="outline" disabled={!currentPage} onClick={() => setPage(currentPage - 1)}>Previous</Button><Button variant="outline" disabled={currentPage === lastPage} onClick={() => setPage(currentPage + 1)}>Next</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
