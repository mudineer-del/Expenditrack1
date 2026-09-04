import { AlertTriangle } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { fmtCurrency, type CostRollup } from "@/lib/wellCost"
import type { Well } from "@/types/well"

const config = {
  budget: { label: "Budget (AFE)", color: "var(--chart-2)" },
  spent: { label: "Actual + Commitments", color: "var(--chart-3)" },
} satisfies ChartConfig

/** Short axis-tick form ($2.7M) — the table/tooltip below still show full fmtCurrency
 *  precision; the axis only needs enough to read the scale at a glance. */
function fmtCompact(v: number): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(v)
  } catch {
    return fmtCurrency(v, "USD")
  }
}

/** Portfolio-wide Budget (AFE) vs Actual+Commitments comparison — opened from the
 *  "Compare Cost" button on the Well Cost Dashboard. Reuses the same well/rollup pairs
 *  the Wells table below it already computed; no separate data fetch. */
export function WellCostCompareDialog({
  open,
  onOpenChange,
  rows,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  rows: { well: Well; r: CostRollup }[]
}) {
  const chartRows = rows
    .filter(({ r }) => r.budget > 0 || r.actual > 0 || r.commitments > 0)
    .map(({ well, r }) => ({
      name: well.name,
      budget: r.budget,
      spent: r.actual + r.commitments,
      variance: r.budget - r.actual - r.commitments,
      utilizationPct: r.utilizationPct,
      overBudget: r.budget > 0 && r.actual + r.commitments > r.budget,
    }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Compare Cost — Budget (AFE) vs Actual</DialogTitle>
          <DialogDescription>
            Every well's planned budget against what's actually been spent or committed, so any well running over its AFE
            stands out immediately.
          </DialogDescription>
        </DialogHeader>

        {chartRows.length ? (
          <div className="flex flex-col gap-4">
            <ChartContainer config={config} className="h-72 w-full">
              <BarChart data={chartRows} margin={{ left: 4, right: 4 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} interval={0} angle={-20} textAnchor="end" height={54} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} width={52} tickFormatter={(v) => fmtCompact(Number(v))} />
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => fmtCurrency(Number(value), "USD")} />} />
                <Bar dataKey="budget" fill="var(--color-budget)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="spent" fill="var(--color-spent)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartContainer>

            <div className="max-h-64 overflow-y-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Well</TableHead>
                    <TableHead className="text-right">Budget (AFE)</TableHead>
                    <TableHead className="text-right">Actual + Commit.</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                    <TableHead className="text-right">Utilization</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chartRows.map((row) => (
                    <TableRow key={row.name}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1.5">
                          {row.overBudget && <AlertTriangle className="size-3.5 shrink-0 text-destructive" />}
                          {row.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{fmtCurrency(row.budget, "USD")}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtCurrency(row.spent, "USD")}</TableCell>
                      <TableCell className={cn("text-right tabular-nums", row.overBudget && "font-medium text-destructive")}>
                        {row.variance < 0 ? "−" : ""}
                        {fmtCurrency(Math.abs(row.variance), "USD")}
                      </TableCell>
                      <TableCell className={cn("text-right tabular-nums", row.overBudget && "font-medium text-destructive")}>
                        {row.budget > 0 ? `${row.utilizationPct.toFixed(0)}%` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-muted-foreground">No budget or spend recorded yet.</div>
        )}
      </DialogContent>
    </Dialog>
  )
}
