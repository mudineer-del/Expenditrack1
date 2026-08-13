import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { fmtMoney } from "@/lib/dashboard"
import { shortContract, turnaroundDays } from "@/lib/reports"
import type { Invoice } from "@/types/invoice"

export interface ReportDetail {
  title: string
  rows: Invoice[]
}

/** Ported from the click-to-detail drawer (openDetail/detailTableHtml, index.html:4767-4784). */
export function ReportDetailDrawer({ detail, onOpenChange }: { detail: ReportDetail | null; onOpenChange: (open: boolean) => void }) {
  const rows = detail?.rows ?? []
  const incl = rows.reduce((s, r) => s + (Number(r.amountInclTax) || 0), 0)
  const paid = rows.reduce((s, r) => s + (Number(r.amountPaid) || 0), 0)

  return (
    <Sheet open={!!detail} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{detail?.title}</SheetTitle>
          <SheetDescription>
            {rows.length} invoice{rows.length !== 1 ? "s" : ""} · {fmtMoney(incl)} incl. tax · {fmtMoney(paid)} paid
          </SheetDescription>
        </SheetHeader>
        <div className="overflow-x-auto px-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sr</TableHead>
                <TableHead>Invoice No.</TableHead>
                <TableHead>Contractor</TableHead>
                <TableHead>Contract</TableHead>
                <TableHead>Inv. Date</TableHead>
                <TableHead className="text-center">TA</TableHead>
                <TableHead className="text-right">Incl. Tax</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length ? (
                rows.slice(0, 300).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.srNo}</TableCell>
                    <TableCell>{r.invoiceNo || "—"}</TableCell>
                    <TableCell>{r.vendor || "—"}</TableCell>
                    <TableCell className="max-w-[140px] truncate" title={r.contractNo}>
                      {shortContract(r.contractNo)}
                    </TableCell>
                    <TableCell>{r.invoiceDate || "—"}</TableCell>
                    <TableCell className="text-center">
                      {turnaroundDays(r) !== null ? `${turnaroundDays(r)}d` : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{fmtMoney(r.amountInclTax)}</TableCell>
                    <TableCell className="text-right tabular-nums text-green-700 dark:text-green-400">{fmtMoney(r.amountPaid)}</TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                    No invoices.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {rows.length > 300 && (
            <p className="py-2 text-xs text-muted-foreground">Showing first 300 of {rows.length}. Export for the full set.</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
