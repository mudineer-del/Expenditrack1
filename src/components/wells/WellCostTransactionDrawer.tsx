import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { blankWellCostTransaction, type WellCostTransaction, type WellCostTransactionKind } from "@/types/wellCost"

const schema = z.object({
  entryDate: z.string().min(1, "Required"),
  kind: z.enum(["actual", "commitment"]),
  amount: z.coerce.number().min(0),
  notes: z.string().optional(),
})

type FormInput = z.input<typeof schema>
type Values = z.output<typeof schema>

function toValues(t: WellCostTransaction): FormInput {
  return {
    entryDate: t.entryDate,
    kind: t.kind,
    amount: t.amount === "" ? undefined : Number(t.amount),
    notes: t.notes,
  }
}

export function WellCostTransactionDrawer({
  open,
  entry,
  costCentreId,
  defaultKind,
  createdByName,
  readOnly = false,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  entry: WellCostTransaction | null
  costCentreId: string
  /** Which ledger tab ("Actual" vs "Commitment") the + button was clicked from. */
  defaultKind: WellCostTransactionKind
  createdByName: string
  /** Non-Admins/Editors get the same form disabled, read-only, no Save — the "View" action. */
  readOnly?: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: WellCostTransaction) => void
}) {
  const isEdit = !!entry
  const blank = () => blankWellCostTransaction(costCentreId, defaultKind, createdByName)
  const form = useForm<FormInput, unknown, Values>({
    resolver: zodResolver(schema),
    defaultValues: toValues(entry ?? blank()),
  })

  useEffect(() => {
    if (open) form.reset(toValues(entry ?? blank()))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entry])

  function handleSubmit(values: Values) {
    const record: WellCostTransaction = {
      id: entry?.id ?? crypto.randomUUID(),
      costCentreId,
      entryDate: values.entryDate,
      kind: values.kind,
      amount: values.amount,
      notes: values.notes || "",
      createdByName: entry?.createdByName || createdByName,
    }
    onSubmit(record)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-full overflow-y-auto sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{readOnly ? "Cost Entry" : isEdit ? "Edit Entry" : "Log Cost Entry"}</DialogTitle>
          <DialogDescription className="sr-only">Daily cost/commitment entry form</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.target instanceof HTMLInputElement) e.preventDefault()
            }}
            className="flex flex-col gap-4"
          >
            <fieldset disabled={readOnly} className="contents">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="entryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="kind"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={readOnly}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="actual">Actual</SelectItem>
                        <SelectItem value="commitment">Commitment</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} value={(field.value as number | undefined) ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} />
                  </FormControl>
                </FormItem>
              )}
            />
            </fieldset>
            {readOnly && entry?.createdByName && (
              <p className="text-xs text-muted-foreground">Logged by {entry.createdByName}</p>
            )}
            <DialogFooter>
              {!readOnly && <Button type="submit">Save</Button>}
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  {readOnly ? "Close" : "Cancel"}
                </Button>
              </DialogClose>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
