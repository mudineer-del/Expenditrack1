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
import { CURRENCY_OPTIONS } from "@/lib/wellCost"
import { blankWellCostCentre, type WellCostCentre } from "@/types/wellCost"

const schema = z.object({
  costCentre: z.string().min(1, "Required"),
  fundCentre: z.string().optional(),
  description: z.string().optional(),
  plannedBudget: z.coerce.number().min(0).optional(),
  currency: z.string().min(1, "Required"),
  vendor: z.string().optional(),
  notes: z.string().optional(),
})

type FormInput = z.input<typeof schema>
type Values = z.output<typeof schema>

function toValues(item: WellCostCentre): FormInput {
  return {
    costCentre: item.costCentre,
    fundCentre: item.fundCentre,
    description: item.description,
    plannedBudget: item.plannedBudget === "" ? undefined : Number(item.plannedBudget),
    currency: item.currency || "USD",
    vendor: item.vendor,
    notes: item.notes,
  }
}

export function WellCostCentreDrawer({
  open,
  item,
  wellId,
  departmentId,
  serviceCategoryId,
  /** Non-Admins get the same form disabled, read-only, no Save — the "View" action. */
  readOnly = false,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  item: WellCostCentre | null
  wellId: string
  departmentId: string
  serviceCategoryId: string
  readOnly?: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: WellCostCentre) => void
}) {
  const isEdit = !!item
  const form = useForm<FormInput, unknown, Values>({
    resolver: zodResolver(schema),
    defaultValues: toValues(item ?? blankWellCostCentre(wellId, departmentId, serviceCategoryId)),
  })

  useEffect(() => {
    if (open) form.reset(toValues(item ?? blankWellCostCentre(wellId, departmentId, serviceCategoryId)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item])

  function handleSubmit(values: Values) {
    const record: WellCostCentre = {
      id: item?.id ?? crypto.randomUUID(),
      wellId,
      departmentId,
      serviceCategoryId,
      costCentre: values.costCentre,
      fundCentre: values.fundCentre || "",
      description: values.description || "",
      plannedBudget: values.plannedBudget ?? "",
      currency: values.currency,
      vendor: values.vendor || "",
      notes: values.notes || "",
    }
    onSubmit(record)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-full overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{readOnly ? "Cost / Fund Centre" : isEdit ? "Edit Cost / Fund Centre" : "New Cost / Fund Centre"}</DialogTitle>
          <DialogDescription className="sr-only">Cost / Fund Centre entry form</DialogDescription>
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
                  name="costCentre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost Centre</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. CC-DRF-001" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fundCentre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fund Centre</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. FC-1001" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Water Based Mud Services" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="plannedBudget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budget / Planned Cost</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} value={(field.value as number | undefined) ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange} disabled={readOnly}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CURRENCY_OPTIONS.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="vendor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
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
