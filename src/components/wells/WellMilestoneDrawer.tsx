import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { blankWellMilestone, type WellMilestone } from "@/types/wellMilestone"

const schema = z.object({
  label: z.string().min(1, "Required"),
  plannedDate: z.string().optional(),
  actualDate: z.string().optional(),
  plannedDepth: z.coerce.number().min(0).optional(),
  actualDepth: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
})

type FormInput = z.input<typeof schema>
type Values = z.output<typeof schema>

function toValues(m: WellMilestone): FormInput {
  return {
    label: m.label,
    plannedDate: m.plannedDate,
    actualDate: m.actualDate,
    plannedDepth: m.plannedDepth === "" ? undefined : Number(m.plannedDepth),
    actualDepth: m.actualDepth === "" ? undefined : Number(m.actualDepth),
    notes: m.notes,
  }
}

export function WellMilestoneDrawer({
  open,
  entry,
  wellId,
  nextSortOrder,
  readOnly = false,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  entry: WellMilestone | null
  wellId: string
  nextSortOrder: number
  readOnly?: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: WellMilestone) => void
}) {
  const isEdit = !!entry
  const blank = () => blankWellMilestone(wellId, nextSortOrder)
  const form = useForm<FormInput, unknown, Values>({
    resolver: zodResolver(schema),
    defaultValues: toValues(entry ?? blank()),
  })

  useEffect(() => {
    if (open) form.reset(toValues(entry ?? blank()))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entry])

  function handleSubmit(values: Values) {
    const record: WellMilestone = {
      id: entry?.id ?? crypto.randomUUID(),
      wellId,
      label: values.label,
      plannedDate: values.plannedDate || "",
      actualDate: values.actualDate || "",
      plannedDepth: values.plannedDepth ?? "",
      actualDepth: values.actualDepth ?? "",
      notes: values.notes || "",
      sortOrder: entry?.sortOrder ?? nextSortOrder,
    }
    onSubmit(record)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-full overflow-y-auto sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{readOnly ? "Well Data Row" : isEdit ? "Edit Well Data" : "Add Well Data"}</DialogTitle>
          <DialogDescription className="sr-only">Planned vs. actual date/depth for one drilling milestone</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
            <fieldset disabled={readOnly} className="contents">
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Milestone</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder='e.g. Spud, 20" Casing, 17-1/2" Section TD' />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="plannedDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Planned Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="actualDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Actual Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="plannedDepth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Planned Depth (m)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" {...field} value={(field.value as number | undefined) ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="actualDepth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Actual Depth (m)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" {...field} value={(field.value as number | undefined) ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
