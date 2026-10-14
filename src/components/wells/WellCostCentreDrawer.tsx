import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useRef } from "react"
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
import { CURRENCY_OPTIONS, MUD_ENGINEERING_DAY_RATE, MUD_ENGINEERING_SCHEDULES, fmtCurrency, mudEngineeringDays, mudEngineeringScheduleFor } from "@/lib/wellCost"
import { blankWellCostCentre, type WellCostCentre } from "@/types/wellCost"

const schema = z.object({
  costCentre: z.string().min(1, "Required"),
  fundCentre: z.string().optional(),
  description: z.string().optional(),
  plannedBudget: z.coerce.number().min(0).optional(),
  currency: z.string().min(1, "Required"),
  overrideAmount: z
    .string()
    .refine((v) => !v.trim() || (Number.isFinite(Number(v)) && Number(v) >= 0), "Enter a valid amount")
    .optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  vendor: z.string().optional(),
  notes: z.string().optional(),
})

type FormInput = z.input<typeof schema>
type Values = z.output<typeof schema>

export type MudEngineeringEdit = { code: string; startDate: string; endDate: string }

function toValues(item: WellCostCentre, wellDates: Record<string, string>): FormInput {
  const schedule = mudEngineeringScheduleFor(item.costCentre)
  return {
    costCentre: item.costCentre,
    fundCentre: item.fundCentre,
    description: item.description,
    plannedBudget: item.plannedBudget === "" ? undefined : Number(item.plannedBudget),
    currency: item.currency || "USD",
    overrideAmount: item.overrideAmount === "" ? "" : String(item.overrideAmount),
    startDate: schedule ? (wellDates[schedule.start.label] ?? "") : "",
    endDate: schedule ? (wellDates[schedule.end.label] ?? "") : "",
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
  wellDates = {},
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  item: WellCostCentre | null
  wellId: string
  departmentId: string
  serviceCategoryId: string
  readOnly?: boolean
  /** The well's milestone dates keyed by milestone label (Spud, End of drilling, Well on
   *  testing, End of well) — prefills and drives the day-rate fields for mud engineering centres. */
  wellDates?: Record<string, string>
  onOpenChange: (open: boolean) => void
  onSubmit: (values: WellCostCentre, edit: MudEngineeringEdit | null) => void
}) {
  const isEdit = !!item
  const form = useForm<FormInput, unknown, Values>({
    resolver: zodResolver(schema),
    defaultValues: toValues(item ?? blankWellCostCentre(wellId, departmentId, serviceCategoryId), wellDates),
  })
  const watchedCentre = form.watch("costCentre") ?? ""
  const schedule = mudEngineeringScheduleFor(watchedCentre)
  const scheduleCode = schedule ? watchedCentre.trim().toUpperCase() : ""
  const watchedStart = form.watch("startDate")?.trim() ?? ""
  const watchedEnd = form.watch("endDate")?.trim() ?? ""
  const today = new Date().toISOString().slice(0, 10)
  const accrualEnd = watchedEnd && watchedEnd < today ? watchedEnd : today
  const autoDays = watchedStart ? mudEngineeringDays(watchedStart, accrualEnd) : 0

  // Re-initialize only when a *different* item (or well/department/category) is being
  // opened — not on every open/close toggle, so an accidental close (Escape, click outside)
  // while filling the form doesn't wipe it.
  const lastKeyRef = useRef<string | null>(null)
  useEffect(() => {
    if (!open) return
    const key = item ? `edit:${item.id}` : `add:${wellId}:${departmentId}:${serviceCategoryId}`
    if (lastKeyRef.current === key) return
    lastKeyRef.current = key
    form.reset(toValues(item ?? blankWellCostCentre(wellId, departmentId, serviceCategoryId), wellDates))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item, wellId, departmentId, serviceCategoryId])

  // Switching between DRFD02 and DRFC02 swaps which well milestones the date fields show.
  useEffect(() => {
    if (!scheduleCode) return
    const s = MUD_ENGINEERING_SCHEDULES[scheduleCode]
    form.setValue("startDate", wellDates[s.start.label] ?? "")
    form.setValue("endDate", wellDates[s.end.label] ?? "")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleCode])

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
      overrideAmount: values.overrideAmount?.trim() ? Number(values.overrideAmount) : "",
      currency: values.currency,
      vendor: values.vendor || "",
      notes: values.notes || "",
    }
    onSubmit(
      record,
      schedule ? { code: scheduleCode, startDate: values.startDate?.trim() || "", endDate: values.endDate?.trim() || "" } : null
    )
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
              {schedule && (
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{schedule.start.label} date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} value={field.value ?? ""} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{schedule.end.label} date (optional)</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} value={field.value ?? ""} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              )}
              {schedule && (
                <p className="-mt-2 text-xs text-muted-foreground">
                  {watchedStart
                    ? `Auto: ${autoDays} day${autoDays !== 1 ? "s" : ""} from ${watchedStart} to ${watchedEnd && accrualEnd === watchedEnd ? watchedEnd : `${today} (today)`} × ${fmtCurrency(MUD_ENGINEERING_DAY_RATE, "USD")} = ${fmtCurrency(autoDays * MUD_ENGINEERING_DAY_RATE, "USD")}. ${watchedEnd ? `Accrual stops on ${schedule.end.label.toLowerCase()}.` : `Leave ${schedule.end.label.toLowerCase()} blank to keep accruing to today.`}`
                    : `Enter the ${schedule.start.label} date to start the day-rate calculation.`}
                </p>
              )}
              {schedule && (
                <FormField
                  control={form.control}
                  name="overrideAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Override cost (USD, optional)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" placeholder="Leave blank to use day rate" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">An override replaces the day-rate accrual.</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
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
